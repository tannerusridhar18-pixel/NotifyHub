package com.notifyhub.rbac;

import com.notifyhub.auth.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Objects;
import java.util.Optional;

/** Live authorization lookup: permission edits take effect without reissuing assignments. */
@Service
public class RbacAuthorizationService {
    private final UserRoleAssignmentRepository assignments;
    public RbacAuthorizationService(UserRoleAssignmentRepository assignments) { this.assignments = assignments; }
    public boolean isSuperAdmin(User user) {
        return assignments.findByUserIdAndRevokedAtIsNull(user.getId()).stream().anyMatch(a -> a.getRole().isSuperadmin());
    }
    public void require(User user, PermissionKey key, ScopeType requestedScope, Long requestedScopeId) {
        if (isSuperAdmin(user)) return; // deliberately bypasses key checks; validation remains in controllers/services
        boolean allowed = assignments.findByUserIdAndRevokedAtIsNull(user.getId()).stream().anyMatch(a ->
            a.getRole().getPermissions().contains(key) && scopeMatches(a, requestedScope, requestedScopeId));
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing permission or matching scope: " + key);
    }
    public Optional<UserRoleAssignment> activeAssignment(User user, PermissionKey key) {
        return assignments.findByUserIdAndRevokedAtIsNull(user.getId()).stream()
                .filter(a -> a.getRole().getPermissions().contains(key)).findFirst();
    }
    private boolean scopeMatches(UserRoleAssignment a, ScopeType required, Long id) {
        if (a.getScopeType() == ScopeType.GLOBAL) return true;
        return a.getScopeType() == required && Objects.equals(a.getScopeId(), id);
    }
}
