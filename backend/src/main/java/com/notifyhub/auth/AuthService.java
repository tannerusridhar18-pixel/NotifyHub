package com.notifyhub.auth;

import com.notifyhub.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.HexFormat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final long refreshDays;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
            UserRepository users,
            RefreshTokenRepository tokens,
            PasswordEncoder encoder,
            JwtService jwt,
            @Value("${notifyhub.jwt-refresh-days:7}") long refreshDays) {
        if (refreshDays < 1 || refreshDays > 90) {
            throw new IllegalStateException("JWT refresh lifetime must be between 1 and 90 days.");
        }
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.refreshDays = refreshDays;
    }

    @Transactional
    public AuthResult login(String username, String password) {
        User user = users.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials."));

        if (!user.isActive() || !encoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
        }

        return issue(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        RefreshToken token = tokens.findByTokenHash(hash(rawRefreshToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token."));

        if (token.isRevoked() || token.getExpiresAt().isBefore(Instant.now()) || !token.getUser().isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token.");
        }

        token.setRevoked(true);
        tokens.save(token);
        return issue(token.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        tokens.findByTokenHash(hash(rawRefreshToken)).ifPresent(token -> {
            token.setRevoked(true);
            tokens.save(token);
        });
    }

    private AuthResult issue(User user) {
        String rawToken = randomToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hash(rawToken));
        refreshToken.setExpiresAt(Instant.now().plus(refreshDays, ChronoUnit.DAYS));
        refreshToken.setRevoked(false);
        tokens.save(refreshToken);

        return new AuthResult(
                jwt.accessToken(user),
                rawToken,
                user.getUsername(),
                user.getRole().name());
    }

    private String randomToken() {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable.", ex);
        }
    }

    public record AuthResult(String accessToken, String refreshToken, String username, String role) {}
}
