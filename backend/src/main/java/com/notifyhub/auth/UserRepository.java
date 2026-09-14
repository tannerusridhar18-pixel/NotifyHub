package com.notifyhub.auth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface UserRepository extends JpaRepository<User,Long>{ Optional<User> findByUsername(String username); Optional<User> findByEmailIgnoreCase(String email); Optional<User> findByPublicId(UUID publicId); boolean existsByUsername(String username); boolean existsByEmailIgnoreCase(String email); List<User> findByAccountStatus(AccountStatus accountStatus); List<User> findByAccountStatusAndRole(AccountStatus accountStatus, Role role); }
