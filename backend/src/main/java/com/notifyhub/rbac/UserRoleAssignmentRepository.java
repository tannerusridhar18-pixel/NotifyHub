package com.notifyhub.rbac;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignment, Long> {
    List<UserRoleAssignment> findByUserIdAndRevokedAtIsNull(Long userId);
    List<UserRoleAssignment> findByRoleIdAndRevokedAtIsNull(Long roleId);
}
