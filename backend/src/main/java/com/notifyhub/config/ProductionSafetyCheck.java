package com.notifyhub.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Only active with SPRING_PROFILES_ACTIVE=prod. Refuses to start the application with development-grade
 * security settings, so a production deployment can never silently run with a public JWT secret,
 * insecure cookies, a localhost frontend origin or an empty database password.
 */
@Component
@Profile("prod")
public class ProductionSafetyCheck {
    private static final String KNOWN_DEFAULT_SECRET_FRAGMENT = "NotifyHubProjectSecretKey";
    private static final List<String> KNOWN_DEFAULTS = List.of(
            "NotifyHubProjectSecretKey",
            "REPLACE_WITH_A_RANDOM_SECRET",
            "password",
            "changeme",
            "secret",
            "admin"
    );

    private final String jwtSecret;
    private final boolean cookieSecure;
    private final String frontendOrigin;
    private final String dbUrl;
    private final String dbPassword;

    public ProductionSafetyCheck(@Value("${notifyhub.jwt-secret:}") String jwtSecret,
                                 @Value("${notifyhub.auth.cookie-secure:false}") boolean cookieSecure,
                                 @Value("${notifyhub.frontend-origin:}") String frontendOrigin,
                                 @Value("${spring.datasource.url:}") String dbUrl,
                                 @Value("${spring.datasource.password:}") String dbPassword) {
        this.jwtSecret = jwtSecret;
        this.cookieSecure = cookieSecure;
        this.frontendOrigin = frontendOrigin;
        this.dbUrl = dbUrl;
        this.dbPassword = dbPassword;
    }

    public ProductionSafetyCheck(String jwtSecret, boolean cookieSecure, String frontendOrigin, String dbPassword) {
        this(jwtSecret, cookieSecure, frontendOrigin, "jdbc:mysql://db.production.local:3306/notifyhub?sslMode=REQUIRED", dbPassword);
    }

    @PostConstruct
    void verify() {
        List<String> problems = new ArrayList<>();
        if (jwtSecret == null || jwtSecret.isBlank()) {
            problems.add("JWT_SECRET is not set.");
        } else if (isKnownDefault(jwtSecret)) {
            problems.add("JWT_SECRET is still a known development default or template placeholder.");
        } else if (jwtSecret.length() < 32) {
            problems.add("JWT_SECRET must be at least 32 characters long.");
        } else if (isWeakSecret(jwtSecret)) {
            problems.add("JWT_SECRET is too weak or predictable. Use a high-entropy secret of at least 32 characters.");
        }
        if (!cookieSecure) {
            problems.add("AUTH_COOKIE_SECURE must be true so login cookies are only sent over HTTPS.");
        }
        if (frontendOrigin == null || frontendOrigin.isBlank()) {
            problems.add("FRONTEND_ORIGIN is not set.");
        } else {
            for (String origin : frontendOrigin.split(",")) {
                String o = origin.trim();
                if (o.isEmpty()) continue;
                if (!o.startsWith("https://") || o.contains("localhost") || o.contains("127.0.0.1")) {
                    problems.add("FRONTEND_ORIGIN must be a public https:// address, but contains '" + o + "'.");
                }
            }
        }
        if (dbPassword == null || dbPassword.isBlank()) {
            problems.add("DB_PASSWORD is empty.");
        }
        if (dbUrl != null && !dbUrl.isBlank() && dbUrl.toLowerCase().contains("usessl=false")) {
            problems.add("DB_URL must not disable SSL in production (remove 'useSSL=false').");
        }
        if (!problems.isEmpty()) {
            throw new IllegalStateException("Refusing to start with insecure production settings:\n - " + String.join("\n - ", problems));
        }
    }

    public static boolean isKnownDefault(String secret) {
        if (secret == null) return false;
        String lower = secret.toLowerCase(java.util.Locale.ROOT);
        if (lower.contains("notifyhubprojectsecretkey")
                || lower.contains("replace_with_a_random_secret")
                || lower.contains("changeme")) {
            return true;
        }
        if (lower.equals("secret") || lower.equals("password") || lower.equals("admin") || lower.equals("default")) {
            return true;
        }
        if (lower.startsWith("password") && (lower.length() < 32 || lower.matches("^(password)+.*"))) {
            return true;
        }
        return false;
    }

    public static boolean isWeakSecret(String secret) {
        if (secret == null || secret.length() < 32) return true;
        long distinctChars = secret.chars().distinct().count();
        if (distinctChars < 10) {
            return true;
        }
        boolean hasDigits = secret.chars().anyMatch(Character::isDigit);
        boolean hasLower = secret.chars().anyMatch(Character::isLowerCase);
        boolean hasUpper = secret.chars().anyMatch(Character::isUpperCase);
        boolean hasSpecial = secret.chars().anyMatch(c -> !Character.isLetterOrDigit(c));
        int classes = (hasDigits ? 1 : 0) + (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasSpecial ? 1 : 0);
        if (classes < 2) {
            return true;
        }
        for (int len = 1; len <= 8; len++) {
            String sub = secret.substring(0, len);
            int repeats = 0;
            for (int i = 0; i + len <= secret.length(); i += len) {
                if (secret.substring(i, i + len).equals(sub)) {
                    repeats++;
                }
            }
            if (repeats * len >= secret.length() - len) {
                return true;
            }
        }
        return false;
    }
}
