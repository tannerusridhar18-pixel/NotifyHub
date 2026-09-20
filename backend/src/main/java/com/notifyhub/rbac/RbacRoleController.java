package com.notifyhub.rbac;

import com.notifyhub.auth.*;
import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController @RequestMapping({"/api/v1", "/api"}) @Transactional
public class RbacRoleController {
 private final RoleRepository roles; private final UserRepository users; private final UserRoleAssignmentRepository assignments; private final AuditLogRepository audit; private final RbacAuthorizationService auth;
 public RbacRoleController(RoleRepository r, UserRepository u, UserRoleAssignmentRepository a, AuditLogRepository l, RbacAuthorizationService z){roles=r;users=u;assignments=a;audit=l;auth=z;}
 @GetMapping({"/roles/invitable", "/admin/roles/invitable"})
 public ResponseEntity<ApiResponse<List<InvitableRoleView>>> invitableRoles() {
   List<InvitableRoleView> list = roles.findAllByOrderByLevelAsc().stream()
     .map(r -> new InvitableRoleView(r.getId(), r.getName(), r.isSystemRole(), r.getLevel()))
     .toList();
   return ResponseEntity.ok(ApiResponse.ok(list));
 }
 @PostMapping("/roles") public ResponseEntity<ApiResponse<RoleView>> create(Authentication principal,@Valid @RequestBody RoleRequest request){
   User actor=actor(principal); requireSuper(actor); String name=normalize(request.name()); if(roles.existsByNameIgnoreCase(name)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Role already exists.");
   RoleEntity role=new RoleEntity(name, 6, null, actor, "[]"); role.setPermissions(request.permissions()); roles.save(role); log(actor,"ROLE_CREATE","ROLE",role.getId()); return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(view(role)));
 }
 @PatchMapping("/roles/{id}") public ResponseEntity<ApiResponse<RoleView>> edit(Authentication principal,@PathVariable Long id,@Valid @RequestBody PermissionsRequest request){
   User actor=actor(principal); requireSuper(actor); RoleEntity role=role(id); if(role.isSystemRole()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"System roles cannot be edited."); role.setPermissions(request.permissions()); log(actor,"ROLE_EDIT","ROLE",id); return ResponseEntity.ok(ApiResponse.ok(view(role)));
 }
 @PostMapping("/roles/{id}/assign") public ResponseEntity<ApiResponse<AssignmentView>> assign(Authentication principal,@PathVariable Long id,@Valid @RequestBody AssignRequest request){
   User actor=actor(principal); requireSuper(actor); if(request.scopeType()==ScopeType.GLOBAL && request.scopeId()!=null || request.scopeType()!=ScopeType.GLOBAL && request.scopeId()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"GLOBAL requires no scopeId; scoped assignment requires scopeId.");
   UserRoleAssignment a=new UserRoleAssignment(); a.setRole(role(id)); a.setUser(users.findById(request.userId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"User not found."))); a.setScopeType(request.scopeType()); a.setScopeId(request.scopeId()); a.setAssignedBy(actor); assignments.save(a); log(actor,"ROLE_ASSIGN","USER_ROLE_ASSIGNMENT",a.getId()); return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(assignment(a)));
 }
 @DeleteMapping("/user-role-assignments/{id}") public ResponseEntity<ApiResponse<Void>> revoke(Authentication principal,@PathVariable Long id){User actor=actor(principal);requireSuper(actor);UserRoleAssignment a=assignments.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Assignment not found."));if(a.getRevokedAt()!=null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Assignment already revoked.");a.revoke();log(actor,"ROLE_REVOKE","USER_ROLE_ASSIGNMENT",id);return ResponseEntity.ok(ApiResponse.message("Assignment revoked."));}
 @GetMapping("/roles/{id}/assignments") public ResponseEntity<ApiResponse<List<AssignmentView>>> assignees(Authentication p,@PathVariable Long id){requireSuper(actor(p));return ResponseEntity.ok(ApiResponse.ok(assignments.findByRoleIdAndRevokedAtIsNull(id).stream().map(this::assignment).toList()));}
 private void requireSuper(User u){if(!auth.isSuperAdmin(u))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"SuperAdmin role required.");}
 private User actor(Authentication a){return users.findByUsername(a.getName()).or(()->users.findByEmailIgnoreCase(a.getName())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Unauthorized."));}
 private RoleEntity role(Long id){return roles.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Role not found."));}
 private void log(User actor,String action,String type,Object id){audit.save(new AuditLog(actor,action,type,String.valueOf(id),"{}"));}
 private String normalize(String s){return s.trim().toUpperCase().replace(' ','_');}
 private RoleView view(RoleEntity r){return new RoleView(r.getId(),r.getName(),r.isSystemRole(),r.isSuperadmin(),r.getPermissions());}
 private AssignmentView assignment(UserRoleAssignment a){return new AssignmentView(a.getId(),a.getUser().getId(),a.getUser().getEmail(),a.getRole().getId(),a.getScopeType(),a.getScopeId());}
 public record RoleRequest(@NotBlank String name,@NotNull Set<PermissionKey> permissions){} public record PermissionsRequest(@NotNull Set<PermissionKey> permissions){} public record AssignRequest(@NotNull Long userId,@NotNull ScopeType scopeType,Long scopeId){} public record RoleView(Long id,String name,boolean systemRole,boolean superadmin,Set<PermissionKey> permissions){} public record AssignmentView(Long id,Long userId,String userEmail,Long roleId,ScopeType scopeType,Long scopeId){}
 public record InvitableRoleView(Long id, String name, @com.fasterxml.jackson.annotation.JsonProperty("is_system_role") boolean isSystemRole, int level){}
}
