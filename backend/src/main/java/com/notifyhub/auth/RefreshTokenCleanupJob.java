package com.notifyhub.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Scheduled job to periodically purge expired and stale revoked refresh tokens.
 * Respects concurrent session rotation by enforcing a retention window on revoked tokens.
 */
@Component
public class RefreshTokenCleanupJob {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupJob.class);

    private final RefreshTokenRepository repository;
    private final long revokedRetentionHours;

    public RefreshTokenCleanupJob(RefreshTokenRepository repository,
                                 @Value("${notifyhub.auth.revoked-token-retention-hours:24}") long revokedRetentionHours) {
        this.repository = repository;
        this.revokedRetentionHours = revokedRetentionHours;
    }

    @Transactional
    @Scheduled(cron = "${notifyhub.auth.token-cleanup-cron:0 30 2 * * *}")
    public long cleanupExpiredAndRevokedTokens() {
        Instant now = Instant.now();
        Instant revokedCutoff = now.minus(revokedRetentionHours, ChronoUnit.HOURS);

        int expiredDeleted = repository.deleteExpiredTokens(now);
        int revokedDeleted = repository.deleteRevokedTokensOlderThan(revokedCutoff);
        long total = expiredDeleted + revokedDeleted;

        if (total > 0) {
            log.info("Cleaned up {} stale refresh tokens ({} expired, {} revoked older than {}h).",
                    total, expiredDeleted, revokedDeleted, revokedRetentionHours);
        }
        return total;
    }
}
