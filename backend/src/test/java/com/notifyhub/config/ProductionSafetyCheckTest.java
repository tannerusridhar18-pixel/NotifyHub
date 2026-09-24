package com.notifyhub.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionSafetyCheckTest {

    private static final String STRONG_SECRET = "a-long-random-production-secret-0123456789-abcdef";

    @Test
    void acceptsSafeProductionSettings() {
        assertDoesNotThrow(() -> new ProductionSafetyCheck(
                STRONG_SECRET, true, "https://notifyhub.example.edu", "db-secret").verify());
    }

    @Test
    void rejectsTheKnownDevelopmentJwtSecret() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "\"NotifyHubProjectSecretKeyApplicationCollege\"", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(ex.getMessage().contains("JWT_SECRET"));
    }

    @Test
    void rejectsInsecureCookiesLocalhostOriginAndEmptyDatabasePassword() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                STRONG_SECRET, false, "http://localhost:3000", "").verify());
        assertTrue(ex.getMessage().contains("AUTH_COOKIE_SECURE"));
        assertTrue(ex.getMessage().contains("FRONTEND_ORIGIN"));
        assertTrue(ex.getMessage().contains("DB_PASSWORD"));
    }
}
