package com.notifyhub.users;

import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/invitations")
public class AdminInvitationController {
    private final AdminInvitationService invitations;
    private final com.notifyhub.auth.UserRepository users;
    private final com.notifyhub.rbac.AuditLogRepository audit;

    public AdminInvitationController(AdminInvitationService invitations, com.notifyhub.auth.UserRepository users, com.notifyhub.rbac.AuditLogRepository audit) {
        this.invitations = invitations;
        this.users = users;
        this.audit = audit;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<AdminInvitationService.InvitationView>>> list(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(invitations.list(authentication.getName())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminInvitationService.InvitationResult>> create(Authentication authentication, @Valid @RequestBody Request request) {
        AdminInvitationService.InvitationRequest command = new AdminInvitationService.InvitationRequest(
                request.email(),
                request.role(),
                request.roleId(),
                request.departmentId(),
                request.branchId(),
                request.reportsToId(),
                request.profile()
        );
        var result = invitations.create(authentication.getName(), command);
        if (authentication != null) {
            users.findByUsername(authentication.getName()).or(() -> users.findByEmailIgnoreCase(authentication.getName()))
                    .ifPresent(actor -> audit.save(new com.notifyhub.rbac.AuditLog(actor, "USER_INVITE", "INVITATION", result.invitationId(), "{}")));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result));
    }

    public record Request(
            @NotBlank @Email String email,
            String role,
            Long roleId,
            Long departmentId,
            Long branchId,
            Long reportsToId,
            AdminInvitationService.ProfileRequest profile
    ) { }
}
