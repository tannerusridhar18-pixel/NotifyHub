package com.notifyhub.users;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.Role;
import com.notifyhub.common.ApiResponse;
import com.notifyhub.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.MultiValueMap;
import java.util.LinkedHashMap;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.rbac.AuditLog;
import com.notifyhub.rbac.AuditLogRepository;

@RestController
@RequestMapping("/api/v1")
public class UserController {
    private final IdentityService identity;
    private final UserRepository users;
    private final AuditLogRepository audit;
    public UserController(IdentityService identity, UserRepository users, AuditLogRepository audit) { this.identity = identity; this.users = users; this.audit = audit; }

    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<IdentityService.CurrentUser>> current(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(identity.current(authentication.getName())));
    }

    @GetMapping("/admin/users")
    public ResponseEntity<ApiResponse<PageResponse<IdentityService.UserListItem>>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Page<IdentityService.UserListItem> paged = identity.listUsers(search, role, departmentId, status, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(paged)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<IdentityService.UserListItem>>> queryUsers(
            @RequestParam MultiValueMap<String, String> query,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Map<String, String> filters = new LinkedHashMap<>();
        query.forEach((key, values) -> {
            if (key.startsWith("filter[") && key.endsWith("]") && !values.isEmpty())
                filters.put(key.substring(7, key.length() - 1), values.getFirst());
        });
        Page<IdentityService.UserListItem> result = identity.listUsers(filters, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    @GetMapping("/admin/users/enrollments")
    public ResponseEntity<ApiResponse<List<IdentityService.EnrollmentItem>>> listEnrollments() {
        return ResponseEntity.ok(ApiResponse.ok(identity.listEnrollments()));
    }

    @PostMapping("/admin/users")
    public ResponseEntity<ApiResponse<IdentityService.UserListItem>> createUser(Authentication actor, @Valid @RequestBody CreateUserRequest req) {
        IdentityService.CreateUserCommand cmd = new IdentityService.CreateUserCommand(
                req.email(),
                req.password(),
                req.role(),
                req.roleId(),
                req.departmentId(),
                req.branchId(),
                req.reportsToId(),
                req.status(),
                req.mustChangePassword()
        );
        var created = identity.createUser(cmd); audit(actor, "USER_CREATE", created.publicId()); return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @PutMapping("/admin/users/{publicId}")
    public ResponseEntity<ApiResponse<IdentityService.UserListItem>> updateUser(
            @PathVariable UUID publicId,
            Authentication actor, @Valid @RequestBody UpdateUserRequest req) {
        IdentityService.UpdateUserCommand cmd = new IdentityService.UpdateUserCommand(
                req.role(),
                req.roleId(),
                req.departmentId(),
                req.branchId(),
                req.reportsToId(),
                req.status(),
                req.password()
        );
        var updated = identity.updateUser(publicId, cmd); audit(actor, "USER_EDIT", publicId); return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/admin/users/{publicId}")
    public ResponseEntity<ApiResponse<Void>> removeUser(Authentication actor, @PathVariable UUID publicId) {
        identity.removeUser(publicId);
        audit(actor, "USER_DELETE", publicId);
        return ResponseEntity.ok(ApiResponse.message("User account removed/deactivated."));
    }

    @PatchMapping("/admin/users/{publicId}/status")
    public ResponseEntity<ApiResponse<Void>> status(Authentication actor, @PathVariable UUID publicId, @Valid @RequestBody StatusRequest request) {
        identity.setStatus(publicId, request.status());
        audit(actor, "USER_EDIT", publicId);
        return ResponseEntity.ok(ApiResponse.message("Account status updated."));
    }

    @PatchMapping("/admin/users/{publicId}/role")
    public ResponseEntity<ApiResponse<Void>> role(Authentication actor, @PathVariable UUID publicId, @Valid @RequestBody RoleRequest request) {
        identity.setRole(publicId, request.role());
        audit(actor, "USER_EDIT", publicId);
        return ResponseEntity.ok(ApiResponse.message("Role updated."));
    }

    public record StatusRequest(@NotNull AccountStatus status) { }
    public record RoleRequest(@NotNull Role role) { }

    public record CreateUserRequest(
            @NotBlank @Email String email,
            String password,
            String role,
            Long roleId,
            Long departmentId,
            Long branchId,
            Long reportsToId,
            AccountStatus status,
            Boolean mustChangePassword
    ) {}

    public record UpdateUserRequest(
            String role,
            Long roleId,
            Long departmentId,
            Long branchId,
            Long reportsToId,
            AccountStatus status,
            String password
    ) {}
    private void audit(Authentication principal, String action, Object id) {
        if (principal == null) return;
        users.findByUsername(principal.getName()).or(() -> users.findByEmailIgnoreCase(principal.getName()))
                .ifPresent(actor -> audit.save(new AuditLog(actor, action, "USER", String.valueOf(id), "{}")));
    }
}
