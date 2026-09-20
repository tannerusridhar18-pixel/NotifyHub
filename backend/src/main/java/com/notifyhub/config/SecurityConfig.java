package com.notifyhub.config;

import com.notifyhub.security.JwtFilter;
import com.notifyhub.security.RateLimitFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.function.Supplier;
import org.springframework.util.StringUtils;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin) {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOrigins = List.of(frontendOrigin.split(",")).stream()
                .map(String::trim).filter(origin -> !origin.isEmpty()).toList();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(List.of("Retry-After"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtFilter jwtFilter, RateLimitFilter rateLimitFilter,
                                             CorsConfigurationSource corsConfigurationSource,
                                             AuthenticationEntryPoint authenticationEntryPoint,
                                             AccessDeniedHandler accessDeniedHandler) throws Exception {
        CookieCsrfTokenRepository csrfTokens = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokens.setHeaderName("X-XSRF-TOKEN");
        CsrfTokenRequestHandler csrfHandler = new SpaCsrfTokenRequestHandler();

        http.csrf(csrf -> csrf.csrfTokenRepository(csrfTokens).csrfTokenRequestHandler(csrfHandler)
                        .ignoringRequestMatchers("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh", "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/queries"))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .headers(headers -> headers.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"))
                        .frameOptions(frame -> frame.deny()).httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(authenticationEntryPoint).accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/announcements/management", "/api/v1/events/management").hasAnyRole("ADMIN", "SUPER_ADMIN", "PRINCIPAL", "DEAN", "HOD", "FACULTY")
                        .requestMatchers(HttpMethod.GET, "/api/v1/announcements", "/api/v1/announcements/urgent", "/api/v1/events", "/api/v1/events/upcoming").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/announcements/**", "/api/v1/events/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/queries/student").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/queries").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/queries/my").authenticated()
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        .requestMatchers("/api/v1/users/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/academic-structure/**", "/api/v1/hostels/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/academic-structure/**", "/api/v1/hostels/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/academic-structure/**", "/api/v1/hostels/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/academic-structure/**", "/api/v1/hostels/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/queries").authenticated()
                        .requestMatchers("/api/v1/announcements/**", "/api/v1/events/**", "/api/v1/queries/**").authenticated()
                        .anyRequest().authenticated())
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, CsrfFilter.class);
        return http.build();
    }

    @Bean AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, exception) -> { response.setStatus(401); response.setContentType("application/json"); response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Authentication required.\"}"); };
    }
    @Bean AccessDeniedHandler accessDeniedHandler(AuthenticationEntryPoint authenticationEntryPoint) {
        return (request, response, exception) -> {
            Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
                authenticationEntryPoint.commence(request, response, new InsufficientAuthenticationException("Authentication required.", exception));
                return;
            }
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Access denied.\"}");
        };
    }

    private static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
        private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
        private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

        @Override
        public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> token) {
            xor.handle(request, response, token);
            token.get();
        }

        @Override
        public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken token) {
            return StringUtils.hasText(request.getHeader(token.getHeaderName()))
                    ? plain.resolveCsrfTokenValue(request, token)
                    : xor.resolveCsrfTokenValue(request, token);
        }
    }
}
