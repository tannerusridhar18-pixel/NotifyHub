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
    void rejectsPlaceholderAndTemplateSecrets() {
        IllegalStateException ex1 = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_BYTES", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(ex1.getMessage().contains("JWT_SECRET"));

        IllegalStateException ex2 = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "passwordpasswordpasswordpassword123!", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(ex2.getMessage().contains("JWT_SECRET"));
    }

    @Test
    void rejectsMissingAndWeakSecrets() {
        IllegalStateException exMissing = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(exMissing.getMessage().contains("JWT_SECRET is not set"));

        IllegalStateException exShort = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "short-secret-12345", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(exShort.getMessage().contains("at least 32 characters"));

        IllegalStateException exTrivial = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(exTrivial.getMessage().contains("too weak or predictable"));

        IllegalStateException exDigitsOnly = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                "12345678901234567890123456789012", true, "https://notifyhub.example.edu", "db-secret").verify());
        assertTrue(exDigitsOnly.getMessage().contains("too weak or predictable"));
    }

    @Test
    void rejectsInsecureCookiesLocalhostOriginAndEmptyDatabasePassword() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                STRONG_SECRET, false, "http://localhost:3000", "").verify());
        assertTrue(ex.getMessage().contains("AUTH_COOKIE_SECURE"));
        assertTrue(ex.getMessage().contains("FRONTEND_ORIGIN"));
        assertTrue(ex.getMessage().contains("DB_PASSWORD"));
    }

    @Test
    void rejectsDisabledDatabaseSsl() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new ProductionSafetyCheck(
                STRONG_SECRET, true, "https://notifyhub.example.edu",
                "jdbc:mysql://db.production.local:3306/notifyhub?useSSL=false", "db-secret").verify());
        assertTrue(ex.getMessage().contains("DB_URL"));
        assertTrue(ex.getMessage().contains("useSSL=false"));
    }
}

