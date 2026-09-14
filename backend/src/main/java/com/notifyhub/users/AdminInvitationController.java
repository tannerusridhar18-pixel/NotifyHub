package com.notifyhub.users;

import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/invitations")
public class AdminInvitationController {
    private final AdminInvitationService invitations;
    public AdminInvitationController(AdminInvitationService invitations) { this.invitations = invitations; }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<AdminInvitationService.InvitationView>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(invitations.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminInvitationService.InvitationResult>> create(Authentication authentication, @Valid @RequestBody Request request) {
        AdminInvitationService.InvitationRequest command = new AdminInvitationService.InvitationRequest(request.email(), request.role(), request.profile());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(invitations.create(authentication.getName(), command)));
    }

    public record Request(@NotBlank @Email String email, @NotNull com.notifyhub.auth.Role role, @NotNull AdminInvitationService.ProfileRequest profile) { }
}
