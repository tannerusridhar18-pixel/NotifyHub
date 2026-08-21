package com.notifyhub.security;

import com.notifyhub.auth.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private static final String DEVELOPMENT_SECRET =
            "NotifyHub_Local_Development_JWT_Secret_2026_X7K9M2P8Q4R6T1Z8N3W5A7B9C2D4F6H8";

    private final SecretKey signingKey;
    private final long accessMinutes;

    public JwtService(
            @Value("${notifyhub.jwt-secret:" + DEVELOPMENT_SECRET + "}") String secret,
            @Value("${notifyhub.jwt-access-minutes:15}") long accessMinutes) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret is missing. Configure JWT_SECRET.");
        }

        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes.");
        }
        if (accessMinutes < 5 || accessMinutes > 120) {
            throw new IllegalStateException("JWT access lifetime must be between 5 and 120 minutes.");
        }

        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
        this.accessMinutes = accessMinutes;
    }

    public String accessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("uid", user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessMinutes * 60)))
                .signWith(signingKey)
                .compact();
    }

    public Claims parse(String token) throws JwtException {
        if (token == null || token.isBlank()) {
            throw new JwtException("Missing JWT");
        }
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
