package com.notifyhub.security;

import com.notifyhub.auth.Role;
import java.util.UUID;

public record NotifyHubPrincipal(Long id, UUID publicId, String username, String email, Role role) {
}
