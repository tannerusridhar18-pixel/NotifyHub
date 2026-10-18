package com.notifyhub.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenCleanupJobTest {

    @Mock
    private RefreshTokenRepository repository;

    private RefreshTokenCleanupJob cleanupJob;

    @BeforeEach
    void setUp() {
        cleanupJob = new RefreshTokenCleanupJob(repository, 24);
    }

    @Test
    void deletesExpiredAndStaleRevokedTokens() {
        when(repository.deleteExpiredTokens(any(Instant.class))).thenReturn(15);
        when(repository.deleteRevokedTokensOlderThan(any(Instant.class))).thenReturn(25);

        long cleaned = cleanupJob.cleanupExpiredAndRevokedTokens();

        assertEquals(40, cleaned);
        verify(repository).deleteExpiredTokens(any(Instant.class));
        verify(repository).deleteRevokedTokensOlderThan(any(Instant.class));
    }

    @Test
    void returnsZeroWhenNoTokensNeedCleanup() {
        when(repository.deleteExpiredTokens(any(Instant.class))).thenReturn(0);
        when(repository.deleteRevokedTokensOlderThan(any(Instant.class))).thenReturn(0);

        long cleaned = cleanupJob.cleanupExpiredAndRevokedTokens();

        assertEquals(0, cleaned);
    }

    @Test
    void verifiesTimestampCalculationForCutoffs() {
        org.mockito.ArgumentCaptor<Instant> expiredCaptor = org.mockito.ArgumentCaptor.forClass(Instant.class);
        org.mockito.ArgumentCaptor<Instant> revokedCaptor = org.mockito.ArgumentCaptor.forClass(Instant.class);

        when(repository.deleteExpiredTokens(expiredCaptor.capture())).thenReturn(5);
        when(repository.deleteRevokedTokensOlderThan(revokedCaptor.capture())).thenReturn(10);

        Instant before = Instant.now();
        cleanupJob.cleanupExpiredAndRevokedTokens();
        Instant after = Instant.now();

        Instant expiredCutoff = expiredCaptor.getValue();
        Instant revokedCutoff = revokedCaptor.getValue();

        // Expired cutoff should be between before and after
        org.junit.jupiter.api.Assertions.assertFalse(expiredCutoff.isBefore(before));
        org.junit.jupiter.api.Assertions.assertFalse(expiredCutoff.isAfter(after));

        // Revoked cutoff should be ~24h before now
        Instant expectedRevokedCutoff = expiredCutoff.minus(24, java.time.temporal.ChronoUnit.HOURS);
        assertEquals(expectedRevokedCutoff, revokedCutoff);
    }

    @Test
    void supportsCustomRetentionPeriod() {
        RefreshTokenCleanupJob customJob = new RefreshTokenCleanupJob(repository, 72);
        org.mockito.ArgumentCaptor<Instant> expiredCaptor = org.mockito.ArgumentCaptor.forClass(Instant.class);
        org.mockito.ArgumentCaptor<Instant> revokedCaptor = org.mockito.ArgumentCaptor.forClass(Instant.class);

        when(repository.deleteExpiredTokens(expiredCaptor.capture())).thenReturn(2);
        when(repository.deleteRevokedTokensOlderThan(revokedCaptor.capture())).thenReturn(3);

        long cleaned = customJob.cleanupExpiredAndRevokedTokens();
        assertEquals(5, cleaned);

        Instant expiredCutoff = expiredCaptor.getValue();
        Instant revokedCutoff = revokedCaptor.getValue();
        assertEquals(expiredCutoff.minus(72, java.time.temporal.ChronoUnit.HOURS), revokedCutoff);
    }
}
