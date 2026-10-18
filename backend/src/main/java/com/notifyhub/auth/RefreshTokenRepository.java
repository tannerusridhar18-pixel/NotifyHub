package com.notifyhub.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String hash);
    List<RefreshToken> findByFamilyId(UUID familyId);
    void deleteByUser(User user);
    void deleteByUserId(Long userId);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :cutoff")
    int deleteExpiredTokens(@Param("cutoff") Instant cutoff);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.revoked = true AND r.revokedAt < :cutoff")
    int deleteRevokedTokensOlderThan(@Param("cutoff") Instant cutoff);
}

