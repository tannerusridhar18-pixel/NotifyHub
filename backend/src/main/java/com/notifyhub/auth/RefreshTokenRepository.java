package com.notifyhub.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
public interface RefreshTokenRepository extends JpaRepository<RefreshToken,Long>{ Optional<RefreshToken> findByTokenHash(String hash); List<RefreshToken> findByFamilyId(UUID familyId); void deleteByUser(User user); void deleteByUserId(Long userId); }
