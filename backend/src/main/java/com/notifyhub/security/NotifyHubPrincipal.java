package com.notifyhub.security;

import com.notifyhub.auth.Role;
import java.util.UUID;

public record NotifyHubPrincipal(
        Long id,
        UUID publicId,
        String username,
        String email,
        Role role,
        Long roleId,
        int roleLevel,
        String roleName,
        Long departmentId
) {
    public NotifyHubPrincipal(Long id, UUID publicId, String username, String email, Role role) {
        this(id, publicId, username, email, role, null, role == Role.SUPER_ADMIN || role == Role.ADMIN ? 0 : role == Role.FACULTY ? 4 : 5, role != null ? role.name() : "STUDENT", null);
    }
}
