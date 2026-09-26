package com.notifyhub.auth;

import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/roles")
public class RoleController {
    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleService.RoleDto>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(roleService.listRoles()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleService.RoleDto>> create(
            Authentication authentication,
            @Valid @RequestBody CreateRequest request) {
        RoleService.CreateRoleRequest cmd = new RoleService.CreateRoleRequest(
                request.name(), request.level(), request.parentRoleId(), request.canPostTo()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(roleService.createRole(authentication.getName(), cmd)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.message("Custom role deleted."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleService.RoleDto>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRequest request) {
        RoleService.UpdateRoleRequest cmd = new RoleService.UpdateRoleRequest(
                request.name(), request.level(), request.parentRoleId(), request.canPostTo()
        );
        return ResponseEntity.ok(ApiResponse.ok(roleService.updateRole(id, cmd)));
    }

    public record CreateRequest(@NotBlank String name, @NotNull Integer level, Long parentRoleId, List<Integer> canPostTo) {}
    public record UpdateRequest(String name, Integer level, Long parentRoleId, List<Integer> canPostTo) {}
}
