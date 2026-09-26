package com.notifyhub.targeting;

import com.notifyhub.auth.User;
import com.notifyhub.auth.Role;
import com.notifyhub.faculty.FacultyDepartmentService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Component
public class BroadcastPermissionResolver {
    private final FacultyDepartmentService facultyDepartmentService;

    public BroadcastPermissionResolver(FacultyDepartmentService facultyDepartmentService) {
        this.facultyDepartmentService = facultyDepartmentService;
    }

    public void validate(User sender, String recipientType, List<String> recipientTargets, Long departmentId) {
        validate(sender, recipientType, recipientTargets, departmentId, null, null, null);
    }

    public void validate(User sender, String recipientType, List<String> recipientTargets, Long departmentId, TargetType targetType) {
        validate(sender, recipientType, recipientTargets, departmentId, targetType, null, null);
    }

    public void validate(User sender, String recipientType, List<String> recipientTargets, Long departmentId, TargetType targetType, User targetUser, com.notifyhub.auth.Role targetRole) {
        if (sender == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        int level = sender.getEffectiveLevel();

        if (level == 0) {
            // Super Admin has unrestricted posting authority
            return;
        }

        if (level == 1) {
            validatePrincipal(targetType, targetUser, targetRole, recipientType, recipientTargets);
            return;
        }

        if (level == 2) {
            validateDean(targetType, targetUser, targetRole, recipientType, recipientTargets);
            return;
        }

        if (level == 3) {
            // HOD or Department Admin: Strictly scoped to their own department
            if (targetType == TargetType.GLOBAL && (recipientType == null || recipientType.isBlank() || "all".equalsIgnoreCase(recipientType) || "all_campus".equalsIgnoreCase(recipientType))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Department leadership cannot broadcast campus-wide.");
            }
            Long senderDeptId = sender.getDepartmentEntity() != null ? sender.getDepartmentEntity().getId() : null;
            if (targetType == TargetType.USER && targetUser != null && senderDeptId != null) {
                boolean inDept = (targetUser.getDepartmentEntity() != null && Objects.equals(targetUser.getDepartmentEntity().getId(), senderDeptId))
                        || facultyDepartmentService.isFacultyInDepartment(targetUser.getId(), senderDeptId);
                if (!inDept) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only target faculty or students within your own department.");
                }
            }
            validateHodAndDeptAdmin(sender, targetType, targetUser, targetRole, recipientType, recipientTargets, departmentId);
            return;
        }

        if (level == 4) {
            // Faculty: Strictly scoped to HOME or SUB departments
            if (targetType == TargetType.GLOBAL && (recipientType == null || recipientType.isBlank() || "all".equalsIgnoreCase(recipientType) || "all_campus".equalsIgnoreCase(recipientType))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Faculty cannot broadcast campus-wide.");
            }
            validateFaculty(sender, targetType, targetUser, targetRole, recipientType, recipientTargets, departmentId);
            return;
        }

        // Level 5 (Student) or others cannot post announcements or events
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Students are not permitted to publish campus announcements or events.");
    }

    private void validatePrincipal(TargetType targetType, User targetUser, Role targetRole, String recipientType, List<String> recipientTargets) {
        if (targetType != TargetType.ROLE && targetType != TargetType.USER) deny("Principals may target only HODs or Deans.");
        if (targetRole != null && targetRole != Role.HOD && targetRole != Role.DEAN) deny("Principals may target only HODs or Deans.");
        if (targetType == TargetType.USER && (targetUser == null || (targetUser.getRole() != Role.HOD && targetUser.getRole() != Role.DEAN))) deny("Principals may target only HODs or Deans.");
        validateRoleTargets(recipientType, recipientTargets, Role.HOD, Role.DEAN);
    }

    private void validateDean(TargetType targetType, User targetUser, Role targetRole, String recipientType, List<String> recipientTargets) {
        if (targetType != TargetType.ROLE && targetType != TargetType.USER) deny("Deans may target only HODs or Faculty.");
        if (targetRole != null && targetRole != Role.HOD && targetRole != Role.FACULTY) deny("Deans may target only HODs or Faculty.");
        if (targetType == TargetType.USER && (targetUser == null || (targetUser.getRole() != Role.HOD && targetUser.getRole() != Role.FACULTY))) deny("Deans may target only HODs or Faculty.");
        validateRoleTargets(recipientType, recipientTargets, Role.HOD, Role.FACULTY);
    }

    private void validateHodAndDeptAdmin(User sender, TargetType targetType, User targetUser, Role targetRole, String recipientType, List<String> recipientTargets, Long departmentId) {
        boolean deptAdmin = sender.getRole() == Role.DEPARTMENT_ADMIN || "DEPARTMENT_ADMIN".equalsIgnoreCase(sender.getEffectiveRoleName());
        if (targetType != TargetType.DEPARTMENT && targetType != TargetType.SECTION && targetType != TargetType.USER && targetType != TargetType.ROLE) deny("Department leadership may target only their department.");
        if (targetRole != null && targetRole != Role.STUDENT && targetRole != Role.FACULTY && !(deptAdmin && targetRole == Role.HOD)) deny("Department leadership target is not allowed.");
        if (targetType == TargetType.USER && (targetUser == null || (targetUser.getRole() != Role.STUDENT && targetUser.getRole() != Role.FACULTY && !(deptAdmin && targetUser.getRole() == Role.HOD)))) deny("Department leadership target is not allowed.");
        if (recipientType == null || recipientType.isBlank()) return;
        String type = recipientType.trim().toLowerCase();

        if ("all".equals(type) || "all_campus".equals(type)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Department leadership cannot broadcast campus-wide.");
        }

        Long senderDeptId = sender.getDepartmentEntity() != null ? sender.getDepartmentEntity().getId() : null;
        if (departmentId != null && senderDeptId != null && !Objects.equals(departmentId, senderDeptId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only target students or faculty within your own department.");
        }
    }

    private void validateFaculty(User sender, TargetType targetType, User targetUser, Role targetRole, String recipientType, List<String> recipientTargets, Long departmentId) {
        if (targetType != TargetType.DEPARTMENT && targetType != TargetType.SECTION && targetType != TargetType.USER && targetType != TargetType.ROLE) deny("Faculty may target students in assigned departments only.");
        if (targetRole != null && targetRole != Role.STUDENT) deny("Faculty may target students only.");
        if (targetType == TargetType.USER && (targetUser == null || targetUser.getRole() != Role.STUDENT)) deny("Faculty may target students only.");
        if (recipientType == null || recipientType.isBlank()) return;
        String type = recipientType.trim().toLowerCase();

        if ("all".equals(type) || "all_campus".equals(type)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Faculty cannot broadcast campus-wide.");
        }

        if (departmentId == null) {
            // If departmentId wasn't explicitly passed in request, check sender's primary department
            Long primaryDeptId = sender.getDepartmentEntity() != null ? sender.getDepartmentEntity().getId() : null;
            if (primaryDeptId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A target department must be specified for faculty posts.");
            }
            departmentId = primaryDeptId;
        }

        // Faculty can only post into departments they belong to (HOME or SUB)
        boolean hasAccess = facultyDepartmentService.isFacultyInDepartment(sender.getId(), departmentId);
        if (!hasAccess) {
            Long senderDeptId = sender.getDepartmentEntity() != null ? sender.getDepartmentEntity().getId() : null;
            if (!Objects.equals(departmentId, senderDeptId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to department ID " + departmentId + " (HOME or SUB).");
            }
        }
    }

    private void validateRoleTargets(String recipientType, List<String> recipientTargets, Role... allowed) {
        if (recipientType == null || recipientType.isBlank() || (!"role".equalsIgnoreCase(recipientType) && !"roles".equalsIgnoreCase(recipientType))) return;
        for (String target : recipientTargets == null ? List.<String>of() : recipientTargets) {
            boolean valid = false;
            for (Role role : allowed) valid |= role.name().equalsIgnoreCase(target) || String.valueOf(role.ordinal()).equals(target);
            if (!valid) deny("The selected recipient role is not allowed.");
        }
    }

    private void deny(String message) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }
}
