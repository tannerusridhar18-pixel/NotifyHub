package com.notifyhub.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface UserRepository extends JpaRepository<User,Long>{ Optional<User> findByUsername(String username); Optional<User> findByEmailIgnoreCase(String email); Optional<User> findByPublicId(UUID publicId); boolean existsByUsername(String username); boolean existsByEmailIgnoreCase(String email); }
