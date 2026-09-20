package com.notifyhub.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByNameIgnoreCase(String name);
    Optional<RoleEntity> findByLevel(int level);
    List<RoleEntity> findAllByOrderByLevelAsc();
    boolean existsByNameIgnoreCase(String name);
}
