package com.notifyhub.users;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.Role;
import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class UserController {
    private final IdentityService identity;
    public UserController(IdentityService identity) { this.identity = identity; }

    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<IdentityService.CurrentUser>> current(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(identity.current(authentication.getName())));
    }

    @PatchMapping("/admin/users/{publicId}/status")
    public ResponseEntity<ApiResponse<Void>> status(@PathVariable UUID publicId, @Valid @RequestBody StatusRequest request) {
        identity.setStatus(publicId, request.status()); return ResponseEntity.ok(ApiResponse.message("Account status updated."));
    }

    @PatchMapping("/admin/users/{publicId}/role")
    public ResponseEntity<ApiResponse<Void>> role(@PathVariable UUID publicId, @Valid @RequestBody RoleRequest request) {
        identity.setRole(publicId, request.role()); return ResponseEntity.ok(ApiResponse.message("Role updated."));
    }

    public record StatusRequest(@NotNull AccountStatus status) { }
    public record RoleRequest(@NotNull Role role) { }
}
