package com.notifyhub.targeting;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.academicstructure.*;
import com.notifyhub.announcement.Announcement;
import com.notifyhub.auth.*;
import com.notifyhub.event.Event;
import com.notifyhub.faculty.*;
import com.notifyhub.hostel.*;
import com.notifyhub.student.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class TargetingService {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final SectionRepository sections;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final HostelRepository hostels;
    private final UserRepository users;
    private final RoleRepository roles;
    private final BroadcastPermissionResolver broadcastPermissionResolver;
    private final FacultyDepartmentService facultyDepartmentService;

    public TargetingService(DepartmentRepository d, BranchRepository b, SectionRepository s,
                            StudentProfileRepository sp, FacultyProfileRepository fp, HostelRepository h,
                            UserRepository u, RoleRepository r,
                            BroadcastPermissionResolver broadcastPermissionResolver,
                            FacultyDepartmentService facultyDepartmentService) {
        this.departments = d;
        this.branches = b;
        this.sections = s;
        this.students = sp;
        this.faculty = fp;
        this.hostels = h;
        this.users = u;
        this.roles = r;
        this.broadcastPermissionResolver = broadcastPermissionResolver;
        this.facultyDepartmentService = facultyDepartmentService;
    }

    public Target resolve(TargetType type, Long departmentId, Long branchId, Long sectionId, Long hostelId, String userEmail, Role role) {
        if (type == null) type = TargetType.GLOBAL;
        Department d = null;
        Branch b = null;
        Section s = null;
        Hostel h = null;
        User u = null;
        switch (type) {
            case GLOBAL -> none(departmentId, branchId, sectionId, hostelId, userEmail, role);
            case ROLE -> {
                none(departmentId, branchId, sectionId, hostelId, userEmail, null);
                if (role == null) throw bad("Role target requires a role.");
            }
            case DEPARTMENT -> {
                none(null, branchId, sectionId, hostelId, userEmail, role);
                d = department(departmentId);
            }
            case BRANCH -> {
                none(null, null, sectionId, hostelId, userEmail, role);
                b = branch(branchId);
                d = b.getDepartment();
                if (departmentId != null && !departmentId.equals(d.getId()))
                    throw bad("Branch does not belong to selected department.");
            }
            case SECTION -> {
                none(null, null, null, hostelId, userEmail, role);
                s = section(sectionId);
                b = s.getBranch();
                d = s.getDepartment();
                if ((branchId != null && !branchId.equals(b.getId())) || (departmentId != null && !departmentId.equals(d.getId())))
                    throw bad("Section does not belong to selected academic scope.");
            }
            case HOSTEL -> {
                none(null, null, null, null, userEmail, role);
                h = hostel(hostelId);
            }
            case USER -> {
                none(null, null, null, hostelId, null, role);
                if (userEmail == null || userEmail.isBlank()) throw bad("User target requires userEmail.");
                u = users.findByEmailIgnoreCase(userEmail).filter(User::isActive).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found."));
            }
        }
        return new Target(type, d, b, s, h, u, role);
    }

    public void validateSenderPermissions(User sender, String recipientType, List<String> recipientTargets, Long departmentId) {
        broadcastPermissionResolver.validate(sender, recipientType, recipientTargets, departmentId);
    }

    /**
     * Validates the sender against what they are really targeting (targetType and the department that a
     * section/branch belongs to), not only the free-text recipientType the client sends.
     */
    public void validateSenderPermissions(User sender, String recipientType, List<String> recipientTargets,
                                          Long departmentId, TargetType targetType, Long branchId, Long sectionId) {
        TargetType effectiveType = targetType != null ? targetType : TargetType.GLOBAL;
        int level = sender.getEffectiveLevel();
        if (effectiveType == TargetType.GLOBAL && level >= 2 && level <= 4) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Principal or Super Admin can broadcast campus-wide.");
        }
        Long effectiveDepartmentId = departmentId;
        if (effectiveDepartmentId == null && effectiveType == TargetType.SECTION && sectionId != null) {
            effectiveDepartmentId = sections.findById(sectionId).map(s -> s.getDepartment().getId()).orElse(null);
        }
        if (effectiveDepartmentId == null && effectiveType == TargetType.BRANCH && branchId != null) {
            effectiveDepartmentId = branches.findById(branchId).map(b -> b.getDepartment().getId()).orElse(null);
        }
        broadcastPermissionResolver.validate(sender, recipientType, recipientTargets, effectiveDepartmentId);
    }

    public boolean matches(Announcement a, User viewer) {
        if (viewer.getEffectiveLevel() == 0) return true;

        String rType = a.getRecipientType();
        if ("all".equalsIgnoreCase(rType) || "all_campus".equalsIgnoreCase(rType) || (a.getTargetType() == TargetType.GLOBAL && (rType == null || rType.isBlank() || "global".equalsIgnoreCase(rType)))) {
            return true;
        }

        List<String> targets = parseTargets(a.getRecipientTargets());
        int viewerLevel = viewer.getEffectiveLevel();
        String viewerRoleName = viewer.getEffectiveRoleName();

        // 1. Target by Role
        if ("role".equalsIgnoreCase(rType) || a.getTargetType() == TargetType.ROLE) {
            if (a.getTargetRole() != null && a.getTargetRole() == viewer.getRole()) return true;
            for (String t : targets) {
                if (t.equalsIgnoreCase(viewerRoleName) || t.equals(String.valueOf(viewerLevel))) return true;
                if (viewer.getRoleEntity() != null && t.equals(String.valueOf(viewer.getRoleEntity().getId()))) return true;
            }
            return false;
        }

        // 2. Audience filter: FACULTY_ONLY
        if ("faculty_only".equalsIgnoreCase(rType)) {
            return viewerLevel <= 4; // Principal, Dean, HOD, Faculty
        }

        // 3. Audience filter: STUDENT_ONLY
        if ("student_only".equalsIgnoreCase(rType)) {
            return viewerLevel == 5 || viewer.getRole() == Role.STUDENT;
        }

        // 4. Audience filter: SPECIFIC_HOD
        if ("specific_hod".equalsIgnoreCase(rType)) {
            if (viewer.getRole() != Role.HOD && viewerLevel != 3) return false;
            if (targets.isEmpty()) return true; // targeted to all HODs
            Long viewerDeptId = getViewerDepartmentId(viewer);
            return targets.stream().anyMatch(t -> t.equalsIgnoreCase(viewer.getEmail()) ||
                    t.equals(String.valueOf(viewer.getId())) ||
                    (viewerDeptId != null && t.equals(String.valueOf(viewerDeptId))));
        }

        // 5. Audience filter: SPECIFIC_DEAN
        if ("specific_dean".equalsIgnoreCase(rType)) {
            if (viewer.getRole() != Role.DEAN && viewerLevel != 2) return false;
            if (targets.isEmpty()) return true;
            return targets.stream().anyMatch(t -> t.equalsIgnoreCase(viewer.getEmail()) || t.equals(String.valueOf(viewer.getId())));
        }

        // 6. Audience filter: SPECIFIC_FACULTY
        if ("specific_faculty".equalsIgnoreCase(rType)) {
            if (viewerLevel != 4 && viewer.getRole() != Role.FACULTY) return false;
            return targets.stream().anyMatch(t -> t.equalsIgnoreCase(viewer.getEmail()) || t.equals(String.valueOf(viewer.getId())));
        }

        // 7. Audience filter: YEAR
        if ("year".equalsIgnoreCase(rType)) {
            if (viewerLevel == 5 || viewer.getRole() == Role.STUDENT) {
                StudentProfile sp = students.findByUserId(viewer.getId()).orElse(null);
                if (sp != null) {
                    Long targetDeptId = a.getTargetDepartment() != null ? a.getTargetDepartment().getId() : null;
                    if (targetDeptId != null && !Objects.equals(targetDeptId, sp.getDepartment().getId())) return false;
                    return targets.stream().anyMatch(t -> t.equals(String.valueOf(sp.getYear())));
                }
            }
            return false;
        }

        // 8. Audience filter: SECTION
        if ("section".equalsIgnoreCase(rType) || a.getTargetType() == TargetType.SECTION) {
            if (viewerLevel == 5 || viewer.getRole() == Role.STUDENT) {
                StudentProfile sp = students.findByUserId(viewer.getId()).orElse(null);
                if (sp != null) {
                    if (a.getTargetSection() != null && Objects.equals(a.getTargetSection().getId(), sp.getSection().getId())) return true;
                    return targets.stream().anyMatch(t -> t.equals(String.valueOf(sp.getSection().getId())) || t.equalsIgnoreCase(sp.getSection().getName()));
                }
            }
            return false;
        }

        // 9. Department matching
        if ("department".equalsIgnoreCase(rType) || a.getTargetType() == TargetType.DEPARTMENT) {
            Long targetDeptId = a.getTargetDepartment() != null ? a.getTargetDepartment().getId() : null;
            if (targetDeptId == null && !targets.isEmpty()) {
                try { targetDeptId = Long.parseLong(targets.get(0)); } catch (Exception ignored) {}
            }

            if (viewerLevel == 4) {
                // Faculty: matches if faculty is mapped (HOME or SUB) to target department
                if (targetDeptId != null && facultyDepartmentService.isFacultyInDepartment(viewer.getId(), targetDeptId)) {
                    return true;
                }
            }

            Long viewerDeptId = getViewerDepartmentId(viewer);
            if (targetDeptId != null && Objects.equals(targetDeptId, viewerDeptId)) {
                return true;
            }
            for (String t : targets) {
                if (t.equals(String.valueOf(viewerDeptId))) return true;
            }
            return false;
        }

        if ("hierarchy_below".equalsIgnoreCase(rType)) {
            User sender = a.getCreatedBy();
            return sender != null && viewer.getEffectiveLevel() >= sender.getEffectiveLevel();
        }

        if ("specific_user".equalsIgnoreCase(rType) || a.getTargetType() == TargetType.USER) {
            if (a.getTargetUser() != null && Objects.equals(a.getTargetUser().getId(), viewer.getId())) return true;
            for (String t : targets) {
                if (t.equalsIgnoreCase(viewer.getEmail()) || t.equals(String.valueOf(viewer.getId()))) return true;
            }
            return false;
        }

        Scope s = scope(viewer);
        return (a.getTargetType() == TargetType.BRANCH && Objects.equals(a.getTargetBranch().getId(), s.branchId()))
                || (a.getTargetType() == TargetType.SECTION && Objects.equals(a.getTargetSection().getId(), s.sectionId()))
                || (a.getTargetType() == TargetType.HOSTEL && Objects.equals(a.getTargetHostel().getId(), s.hostelId()));
    }

    public boolean matchesEvent(Event e, User viewer) {
        if (viewer.getEffectiveLevel() == 0) return true;

        String rType = e.getRecipientType();
        if ("all".equalsIgnoreCase(rType) || "all_campus".equalsIgnoreCase(rType) || (e.getTargetType() == TargetType.GLOBAL && (rType == null || rType.isBlank() || "global".equalsIgnoreCase(rType)))) {
            return true;
        }

        List<String> targets = parseTargets(e.getRecipientTargets());
        int viewerLevel = viewer.getEffectiveLevel();
        String viewerRoleName = viewer.getEffectiveRoleName();

        if ("role".equalsIgnoreCase(rType) || e.getTargetType() == TargetType.ROLE) {
            if (e.getTargetRole() != null && e.getTargetRole() == viewer.getRole()) return true;
            for (String t : targets) {
                if (t.equalsIgnoreCase(viewerRoleName) || t.equals(String.valueOf(viewerLevel))) return true;
                if (viewer.getRoleEntity() != null && t.equals(String.valueOf(viewer.getRoleEntity().getId()))) return true;
            }
            return false;
        }

        if ("faculty_only".equalsIgnoreCase(rType)) {
            return viewerLevel <= 4;
        }

        if ("student_only".equalsIgnoreCase(rType)) {
            return viewerLevel == 5 || viewer.getRole() == Role.STUDENT;
        }

        if ("specific_hod".equalsIgnoreCase(rType)) {
            if (viewer.getRole() != Role.HOD && viewerLevel != 3) return false;
            if (targets.isEmpty()) return true;
            Long viewerDeptId = getViewerDepartmentId(viewer);
            return targets.stream().anyMatch(t -> t.equalsIgnoreCase(viewer.getEmail()) ||
                    t.equals(String.valueOf(viewer.getId())) ||
                    (viewerDeptId != null && t.equals(String.valueOf(viewerDeptId))));
        }

        if ("specific_dean".equalsIgnoreCase(rType)) {
            if (viewer.getRole() != Role.DEAN && viewerLevel != 2) return false;
            if (targets.isEmpty()) return true;
            return targets.stream().anyMatch(t -> t.equalsIgnoreCase(viewer.getEmail()) || t.equals(String.valueOf(viewer.getId())));
        }

        if ("specific_faculty".equalsIgnoreCase(rType)) {
            if (viewerLevel != 4 && viewer.getRole() != Role.FACULTY) return false;
            return targets.stream().anyMatch(t -> t.equalsIgnoreCase(viewer.getEmail()) || t.equals(String.valueOf(viewer.getId())));
        }

        if ("year".equalsIgnoreCase(rType)) {
            if (viewerLevel == 5 || viewer.getRole() == Role.STUDENT) {
                StudentProfile sp = students.findByUserId(viewer.getId()).orElse(null);
                if (sp != null) {
                    Long targetDeptId = e.getTargetDepartment() != null ? e.getTargetDepartment().getId() : null;
                    if (targetDeptId != null && !Objects.equals(targetDeptId, sp.getDepartment().getId())) return false;
                    return targets.stream().anyMatch(t -> t.equals(String.valueOf(sp.getYear())));
                }
            }
            return false;
        }

        if ("section".equalsIgnoreCase(rType) || e.getTargetType() == TargetType.SECTION) {
            if (viewerLevel == 5 || viewer.getRole() == Role.STUDENT) {
                StudentProfile sp = students.findByUserId(viewer.getId()).orElse(null);
                if (sp != null) {
                    if (e.getTargetSection() != null && Objects.equals(e.getTargetSection().getId(), sp.getSection().getId())) return true;
                    return targets.stream().anyMatch(t -> t.equals(String.valueOf(sp.getSection().getId())) || t.equalsIgnoreCase(sp.getSection().getName()));
                }
            }
            return false;
        }

        if ("department".equalsIgnoreCase(rType) || e.getTargetType() == TargetType.DEPARTMENT) {
            Long targetDeptId = e.getTargetDepartment() != null ? e.getTargetDepartment().getId() : null;
            if (targetDeptId == null && !targets.isEmpty()) {
                try { targetDeptId = Long.parseLong(targets.get(0)); } catch (Exception ignored) {}
            }

            if (viewerLevel == 4) {
                if (targetDeptId != null && facultyDepartmentService.isFacultyInDepartment(viewer.getId(), targetDeptId)) {
                    return true;
                }
            }

            Long viewerDeptId = getViewerDepartmentId(viewer);
            if (targetDeptId != null && Objects.equals(targetDeptId, viewerDeptId)) {
                return true;
            }
            for (String t : targets) {
                if (t.equals(String.valueOf(viewerDeptId))) return true;
            }
            return false;
        }

        if ("hierarchy_below".equalsIgnoreCase(rType)) {
            User sender = e.getCreatedBy();
            return sender != null && viewer.getEffectiveLevel() >= sender.getEffectiveLevel();
        }

        if ("specific_user".equalsIgnoreCase(rType) || e.getTargetType() == TargetType.USER) {
            if (e.getTargetUser() != null && Objects.equals(e.getTargetUser().getId(), viewer.getId())) return true;
            for (String t : targets) {
                if (t.equalsIgnoreCase(viewer.getEmail()) || t.equals(String.valueOf(viewer.getId()))) return true;
            }
            return false;
        }

        Scope s = scope(viewer);
        return (e.getTargetType() == TargetType.BRANCH && Objects.equals(e.getTargetBranch().getId(), s.branchId()))
                || (e.getTargetType() == TargetType.SECTION && Objects.equals(e.getTargetSection().getId(), s.sectionId()))
                || (e.getTargetType() == TargetType.HOSTEL && Objects.equals(e.getTargetHostel().getId(), s.hostelId()));
    }

    private Long getViewerDepartmentId(User viewer) {
        if (viewer.getDepartmentEntity() != null) return viewer.getDepartmentEntity().getId();
        Scope s = scope(viewer);
        return s.departmentId();
    }

    public Scope scope(User u) {
        if (u.getEffectiveLevel() == 0 || u.getRole() == Role.SUPER_ADMIN || u.getRole() == Role.ADMIN)
            return new Scope(u.getRole(), null, null, null, null, u.getId());
        if (u.getEffectiveLevel() == 5 || u.getRole() == Role.STUDENT) {
            StudentProfile p = students.findByUserId(u.getId()).orElse(null);
            return p == null ? new Scope(u.getRole(), u.getDepartmentEntity() != null ? u.getDepartmentEntity().getId() : null, null, null, null, u.getId())
                    : new Scope(u.getRole(), p.getDepartment().getId(), p.getBranch().getId(), p.getSection().getId(), p.getHostel() == null ? null : p.getHostel().getId(), u.getId());
        }
        FacultyProfile p = faculty.findByUserId(u.getId()).orElse(null);
        return new Scope(u.getRole(), p != null && p.getDepartment() != null ? p.getDepartment().getId() : (u.getDepartmentEntity() != null ? u.getDepartmentEntity().getId() : null), null, null, null, u.getId());
    }

    private List<String> parseTargets(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            try {
                List<Object> raw = MAPPER.readValue(json, new TypeReference<List<Object>>() {});
                List<String> list = new ArrayList<>();
                for (Object o : raw) list.add(String.valueOf(o));
                return list;
            } catch (Exception ex) {
                List<String> single = new ArrayList<>();
                single.add(json.trim());
                return single;
            }
        }
    }

    private Department department(Long id) {
        if (id == null) throw bad("Department target requires departmentId.");
        return departments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));
    }
    private Branch branch(Long id) {
        if (id == null) throw bad("Branch target requires branchId.");
        return branches.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found."));
    }
    private Section section(Long id) {
        if (id == null) throw bad("Section target requires sectionId.");
        return sections.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));
    }
    private Hostel hostel(Long id) {
        if (id == null) throw bad("Hostel target requires hostelId.");
        return hostels.findById(id).filter(Hostel::isActive).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hostel not found."));
    }
    private void none(Object a, Object b, Object c, Object d, Object e, Object f) {
        if (a != null || b != null || c != null || d != null || e != null || f != null)
            throw bad("Target contains fields invalid for its type.");
    }
    private ResponseStatusException bad(String m) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, m);
    }

    public record Target(TargetType type, Department department, Branch branch, Section section, Hostel hostel, User user, Role role) {}
    public record Scope(Role role, Long departmentId, Long branchId, Long sectionId, Long hostelId, Long userId) {}
}
