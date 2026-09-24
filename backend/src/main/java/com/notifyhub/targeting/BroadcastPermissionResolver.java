package com.notifyhub.targeting;

import com.notifyhub.auth.User;
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
            // Principal: Campus-wide broadcasts, Deans, HODs, or specific roles/departments
            if (targetRole == com.notifyhub.auth.Role.STUDENT || (targetUser != null && targetUser.getRole() == com.notifyhub.auth.Role.STUDENT)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Principals cannot directly post to students via role targeting.");
            }
            validatePrincipal(recipientType, recipientTargets);
            return;
        }

        if (level == 2) {
            // Dean: Can post to HODs, Faculty, or departments in scope, but never GLOBAL or students
            if (targetType == TargetType.GLOBAL && (recipientType == null || recipientType.isBlank() || "all".equalsIgnoreCase(recipientType) || "all_campus".equalsIgnoreCase(recipientType))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Deans cannot broadcast campus-wide. Target HODs, Faculty, or specific departments.");
            }
            if (targetRole == com.notifyhub.auth.Role.STUDENT || (targetUser != null && targetUser.getRole() == com.notifyhub.auth.Role.STUDENT)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Deans cannot post directly to students.");
            }
            validateDean(recipientType, recipientTargets);
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
            validateHodAndDeptAdmin(sender, recipientType, recipientTargets, departmentId);
            return;
        }

        if (level == 4) {
            // Faculty: Strictly scoped to HOME or SUB departments
            if (targetType == TargetType.GLOBAL && (recipientType == null || recipientType.isBlank() || "all".equalsIgnoreCase(recipientType) || "all_campus".equalsIgnoreCase(recipientType))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Faculty cannot broadcast campus-wide.");
            }
            validateFaculty(sender, recipientType, recipientTargets, departmentId);
            return;
        }

        // Level 5 (Student) or others cannot post announcements or events
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Students are not permitted to publish campus announcements or events.");
    }

    private void validatePrincipal(String recipientType, List<String> recipientTargets) {
        if (recipientType == null || recipientType.isBlank()) return;
        String type = recipientType.trim().toLowerCase();
        if ("role".equals(type) || "roles".equals(type)) {
            if (recipientTargets != null && (recipientTargets.contains("STUDENT") || recipientTargets.contains("5"))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Principals cannot directly post to students via role targeting.");
            }
        }
    }

    private void validateDean(String recipientType, List<String> recipientTargets) {
        if (recipientType == null || recipientType.isBlank()) return;
        String type = recipientType.trim().toLowerCase();
        if ("all".equals(type) || "all_campus".equals(type)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Deans cannot broadcast campus-wide. Target HODs, Faculty, or specific departments.");
        }
        if ("role".equals(type) || "roles".equals(type)) {
            if (recipientTargets != null && (recipientTargets.contains("STUDENT") || recipientTargets.contains("5"))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Deans cannot post directly to students.");
            }
        }
    }

    private void validateHodAndDeptAdmin(User sender, String recipientType, List<String> recipientTargets, Long departmentId) {
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

    private void validateFaculty(User sender, String recipientType, List<String> recipientTargets, Long departmentId) {
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
}
