package com.notifyhub.security;

import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository users;

    public JwtFilter(JwtService jwtService, UserRepository users) { this.jwtService = jwtService; this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String token = cookie(request, "NH_ACCESS");
        if (token == null) {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) token = header.substring(7).trim();
        }
        if (token != null && !token.isBlank()) {
            try {
                Claims claims = jwtService.parse(token);
                String subject = claims.getSubject();
                User user = users.findByUsername(subject).orElseGet(() -> users.findByEmailIgnoreCase(subject).orElse(null));
                if (user != null && user.isActive() && !user.isLocked(Instant.now())) {
                    NotifyHubPrincipal principal = new NotifyHubPrincipal(
                            user.getId(),
                            user.getPublicId(),
                            user.getUsername(),
                            user.getEmail(),
                            user.getRole(),
                            user.getRoleEntity() != null ? user.getRoleEntity().getId() : null,
                            user.getEffectiveLevel(),
                            user.getEffectiveRoleName(),
                            user.getDepartmentEntity() != null ? user.getDepartmentEntity().getId() : null
                    );
                    List<GrantedAuthority> authorities = new ArrayList<>();
                    String roleName = user.getEffectiveRoleName();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));
                    if (user.getEffectiveLevel() == 0 || "ADMIN".equalsIgnoreCase(roleName) || "SUPER_ADMIN".equalsIgnoreCase(roleName)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                        authorities.add(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"));
                    }
                    authorities.add(new SimpleGrantedAuthority("LEVEL_" + user.getEffectiveLevel()));

                    var authentication = new UsernamePasswordAuthenticationToken(user.getUsername(), null, authorities);
                    authentication.setDetails(principal);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private String cookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) if (name.equals(cookie.getName())) return cookie.getValue();
        return null;
    }
}
