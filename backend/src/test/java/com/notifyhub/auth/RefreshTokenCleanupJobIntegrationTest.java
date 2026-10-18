package com.notifyhub.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class RefreshTokenCleanupJobIntegrationTest {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenCleanupJob cleanupJob;

    @Test
    void preservesValidAndRecentlyRotatedSessionsWhilePurgingStaleTokens() {
        // Create user for test tokens
        User user = new User();
        user.setUsername("cleanup.test@notifyhub.local");
        user.setEmail("cleanup.test@notifyhub.local");
        user.setPasswordHash("$2a$12$dummyHashForCleanupJobTestPurposesOnly");
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        userRepository.saveAndFlush(user);

        Instant now = Instant.now();

        // 1. Valid Active Session: not revoked, expires in 7 days -> MUST BE PRESERVED
        RefreshToken activeToken = new RefreshToken();
        activeToken.setUser(user);
        activeToken.setFamilyId(UUID.randomUUID());
        activeToken.setTokenHash("0000000000000000000000000000000000000000000000000000000000000001");
        activeToken.setExpiresAt(now.plus(7, ChronoUnit.DAYS));
        activeToken.setRevoked(false);
        activeToken.setRevokedAt(null);
        refreshTokenRepository.saveAndFlush(activeToken);

        // 2. Recently Revoked Token (rotated 1 hour ago, within 24h retention window) -> MUST BE PRESERVED
        RefreshToken recentlyRevokedToken = new RefreshToken();
        recentlyRevokedToken.setUser(user);
        recentlyRevokedToken.setFamilyId(UUID.randomUUID());
        recentlyRevokedToken.setTokenHash("0000000000000000000000000000000000000000000000000000000000000002");
        recentlyRevokedToken.setExpiresAt(now.plus(6, ChronoUnit.DAYS));
        recentlyRevokedToken.setRevoked(true);
        recentlyRevokedToken.setRevokedAt(now.minus(1, ChronoUnit.HOURS));
        refreshTokenRepository.saveAndFlush(recentlyRevokedToken);

        // 3. Stale Revoked Token (revoked 48 hours ago, outside 24h retention window) -> MUST BE DELETED
        RefreshToken staleRevokedToken = new RefreshToken();
        staleRevokedToken.setUser(user);
        staleRevokedToken.setFamilyId(UUID.randomUUID());
        staleRevokedToken.setTokenHash("0000000000000000000000000000000000000000000000000000000000000003");
        staleRevokedToken.setExpiresAt(now.plus(5, ChronoUnit.DAYS));
        staleRevokedToken.setRevoked(true);
        staleRevokedToken.setRevokedAt(now.minus(48, ChronoUnit.HOURS));
        refreshTokenRepository.saveAndFlush(staleRevokedToken);

        // 4. Expired Token (expired 2 hours ago, not revoked) -> MUST BE DELETED
        RefreshToken expiredToken = new RefreshToken();
        expiredToken.setUser(user);
        expiredToken.setFamilyId(UUID.randomUUID());
        expiredToken.setTokenHash("0000000000000000000000000000000000000000000000000000000000000004");
        expiredToken.setExpiresAt(now.minus(2, ChronoUnit.HOURS));
        expiredToken.setRevoked(false);
        expiredToken.setRevokedAt(null);
        refreshTokenRepository.saveAndFlush(expiredToken);

        // Execute cleanup
        long deletedCount = cleanupJob.cleanupExpiredAndRevokedTokens();
        assertThat(deletedCount).isGreaterThanOrEqualTo(2);

        // Assert preservation and deletion
        assertThat(refreshTokenRepository.findByTokenHash(activeToken.getTokenHash())).isPresent();
        assertThat(refreshTokenRepository.findByTokenHash(recentlyRevokedToken.getTokenHash())).isPresent();
        assertThat(refreshTokenRepository.findByTokenHash(staleRevokedToken.getTokenHash())).isEmpty();
        assertThat(refreshTokenRepository.findByTokenHash(expiredToken.getTokenHash())).isEmpty();
    }
}
