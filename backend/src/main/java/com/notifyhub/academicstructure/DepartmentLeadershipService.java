package com.notifyhub.academicstructure;

import com.notifyhub.announcement.AnnouncementRepository;
import com.notifyhub.announcement.AnnouncementStatus;
import com.notifyhub.auth.*;
import com.notifyhub.event.EventRepository;
import com.notifyhub.event.EventStatus;
import com.notifyhub.faculty.FacultyDepartmentMappingRepository;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.query.QueryRepository;
import com.notifyhub.query.QueryStatus;
import com.notifyhub.rbac.*;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional
public class DepartmentLeadershipService {
    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final SectionRepository sections;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final FacultyDepartmentMappingRepository facultyMappings;
    private final UserRepository users;
    private final RoleRepository roles;
    private final UserRoleAssignmentRepository assignments;
    private final QueryRepository queries;
    private final AnnouncementRepository announcements;
    private final EventRepository events;
    private final AuditLogRepository audit;
    private final RbacAuthorizationService rbac;

    public DepartmentLeadershipService(
            DepartmentRepository departments,
            BranchRepository branches,
            SectionRepository sections,
            StudentProfileRepository students,
            FacultyProfileRepository faculty,
            FacultyDepartmentMappingRepository facultyMappings,
            UserRepository users,
            RoleRepository roles,
            UserRoleAssignmentRepository assignments,
            QueryRepository queries,
            AnnouncementRepository announcements,
            EventRepository events,
            AuditLogRepository audit,
            RbacAuthorizationService rbac) {
        this.departments = departments;
        this.branches = branches;
        this.sections = sections;
        this.students = students;
        this.faculty = faculty;
        this.facultyMappings = facultyMappings;
        this.users = users;
        this.roles = roles;
        this.assignments = assignments;
        this.queries = queries;
        this.announcements = announcements;
        this.events = events;
        this.audit = audit;
        this.rbac = rbac;
    }

    public BatchPromoteResult batchPromoteStudents(Long departmentId, int fromYear, int toYear, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);

        if (fromYear >= toYear || fromYear < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid year transition: fromYear (" + fromYear + ") must be less than toYear (" + toYear + ").");
        }

        Department dept = departments.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));

        List<StudentProfile> eligible = students.findByDepartmentIdAndYear(departmentId, fromYear);
        int promotedCount = 0;
        int skippedMaxYearCount = 0;

        for (StudentProfile sp : eligible) {
            Branch b = sp.getBranch();
            if (b != null && toYear > b.getMaxYear()) {
                skippedMaxYearCount++;
                continue;
            }

            // Invariant check: Resolve corresponding section for toYear in the same branch to prevent orphaned section assignments
            Section currentSection = sp.getSection();
            if (currentSection != null && currentSection.getAcademicYear() != toYear) {
                Optional<Section> matchingSection = sections.findByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(
                        departmentId, b != null ? b.getId() : null, toYear, currentSection.getName());
                if (matchingSection.isPresent()) {
                    sp.setSection(matchingSection.get());
                } else {
                    List<Section> availableSections = sections.findByDepartmentIdAndBranchIdAndAcademicYear(
                            departmentId, b != null ? b.getId() : null, toYear);
                    if (!availableSections.isEmpty()) {
                        sp.setSection(availableSections.get(0));
                    }
                }
            }

            sp.setYear(toYear);
            sp.setSemester(toYear * 2 - 1);
            students.save(sp);
            promotedCount++;
        }

        String metadata = "{\"departmentId\":" + departmentId + ",\"fromYear\":" + fromYear + ",\"toYear\":" + toYear + ",\"promotedCount\":" + promotedCount + ",\"skippedMaxYear\":" + skippedMaxYearCount + "}";
        audit.save(new AuditLog(actor, "USER_BATCH_PROMOTE", "DEPARTMENT", String.valueOf(departmentId), metadata));

        String message = "Successfully promoted " + promotedCount + " students from Year " + fromYear + " to Year " + toYear + " in " + dept.getName() + ".";
        if (skippedMaxYearCount > 0) {
            message += " (" + skippedMaxYearCount + " students reached branch max year limit and were not promoted).";
        }
        return new BatchPromoteResult(departmentId, fromYear, toYear, promotedCount, skippedMaxYearCount, message);
    }

    public void assignHod(Long departmentId, Long userId, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);

        Department dept = departments.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));

        User targetUser = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        RoleEntity hodRole = roles.findByNameIgnoreCase("HOD")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role HOD not found."));

        if (targetUser.hasAdminAccess() || targetUser.getEffectiveLevel() <= 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only staff below Dean level can be assigned as HOD.");
        }

        targetUser.setRole(Role.HOD);
        targetUser.setRoleEntity(hodRole);
        targetUser.setDepartmentEntity(dept);
        users.save(targetUser);

        boolean alreadyAssigned = assignments.findByUserIdAndRevokedAtIsNull(targetUser.getId()).stream().anyMatch(a ->
                a.getRole() != null && a.getRole().getId() != null && a.getRole().getId().equals(hodRole.getId())
                        && a.getScopeType() == ScopeType.DEPARTMENT && Objects.equals(a.getScopeId(), departmentId));
        if (!alreadyAssigned) {
            // Assign scoped role
            UserRoleAssignment assignment = new UserRoleAssignment();
            assignment.setUser(targetUser);
            assignment.setRole(hodRole);
            assignment.setScopeType(ScopeType.DEPARTMENT);
            assignment.setScopeId(departmentId);
            assignment.setAssignedBy(actor);
            assignments.save(assignment);
        }

        audit.save(new AuditLog(actor, "HOD_ASSIGN", "USER", String.valueOf(targetUser.getId()), "{\"departmentId\":" + departmentId + "}"));
    }

    public void reassignStudentSection(Long studentId, Long newSectionId, String actorUsername) {
        User actor = user(actorUsername);
        StudentProfile profile = students.findById(studentId)
                .or(() -> students.findByUserId(studentId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found."));

        validateDepartmentAccess(actor, profile.getDepartment().getId());

        Section newSection = sections.findById(newSectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found."));

        if (!Objects.equals(newSection.getDepartment().getId(), profile.getDepartment().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New section must belong to student's department.");
        }

        profile.setSection(newSection);
        students.save(profile);
        audit.save(new AuditLog(actor, "STUDENT_SECTION_REASSIGN", "STUDENT", String.valueOf(profile.getId()), "{\"newSectionId\":" + newSectionId + "}"));
    }

    @Transactional(readOnly = true)
    public DepartmentAnalyticsDto getDepartmentAnalytics(Long departmentId, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);

        Department dept = departments.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));

        long studentCount = students.countByDepartmentId(departmentId);
        long facultyCount = facultyMappings.findByDepartmentId(departmentId).size();
        long openQueries = queries.findByDepartmentEntityIdAndStatus(departmentId, QueryStatus.OPEN, org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        long answeredQueries = queries.findByDepartmentEntityIdAndStatus(departmentId, QueryStatus.ANSWERED, org.springframework.data.domain.Pageable.unpaged()).getTotalElements();

        return new DepartmentAnalyticsDto(
                dept.getId(),
                dept.getName(),
                studentCount,
                facultyCount,
                openQueries,
                answeredQueries
        );
    }

    @Transactional(readOnly = true)
    public List<DepartmentOverviewDto> getCampusOverview(String actorUsername) {
        User actor = user(actorUsername);
        if (actor.getEffectiveLevel() > 2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Campus overview is restricted to Executive Leadership.");
        }

        List<Department> allDepts = departments.findAll();
        List<DepartmentOverviewDto> list = new ArrayList<>();
        List<User> allUsers = users.findAll();

        for (Department d : allDepts) {
            long studentCount = students.countByDepartmentId(d.getId());
            long facultyCount = facultyMappings.findByDepartmentId(d.getId()).size();

            // Find HOD for this department
            User hodUser = allUsers.stream()
                    .filter(u -> u.getRole() == Role.HOD && u.getDepartmentEntity() != null && u.getDepartmentEntity().getId().equals(d.getId()))
                    .findFirst()
                    .orElse(null);

            String hodName = hodUser != null ? hodUser.getUsername() : "Unassigned";
            String hodEmail = hodUser != null ? hodUser.getEmail() : null;

            list.add(new DepartmentOverviewDto(
                    d.getId(),
                    d.getName(),
                    d.isActive(),
                    hodName,
                    hodEmail,
                    studentCount,
                    facultyCount
            ));
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<DepartmentFacultyDto> getDepartmentFaculty(Long departmentId, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);

        Department dept = departments.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));

        Map<Long, DepartmentFacultyDto> result = new LinkedHashMap<>();

        List<com.notifyhub.faculty.FacultyDepartmentMapping> mappings = facultyMappings.findByDepartmentId(departmentId);
        for (var m : mappings) {
            FacultyProfile fp = m.getFaculty();
            if (fp == null || fp.getUser() == null || !fp.getUser().isActive()) continue;
            result.put(fp.getId(), new DepartmentFacultyDto(
                    fp.getId(),
                    fp.getFacultyId(),
                    fp.getName(),
                    fp.getDesignation() != null ? fp.getDesignation() : "Faculty Member",
                    dept.getId(),
                    dept.getName(),
                    m.getRelationship() != null ? m.getRelationship().name() : "HOME",
                    fp.getUser().getId(),
                    fp.getUser().getEmail()
            ));
        }

        List<FacultyProfile> directFaculty = faculty.findByDepartmentId(departmentId);
        for (FacultyProfile fp : directFaculty) {
            if (fp == null || fp.getUser() == null || !fp.getUser().isActive()) continue;
            result.putIfAbsent(fp.getId(), new DepartmentFacultyDto(
                    fp.getId(),
                    fp.getFacultyId(),
                    fp.getName(),
                    fp.getDesignation() != null ? fp.getDesignation() : "Faculty Member",
                    dept.getId(),
                    dept.getName(),
                    "HOME",
                    fp.getUser().getId(),
                    fp.getUser().getEmail()
            ));
        }

        return new ArrayList<>(result.values());
    }

    @Transactional(readOnly = true)
    public List<DepartmentStudentDto> getDepartmentStudents(Long departmentId, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);

        List<StudentProfile> list = students.findByDepartmentId(departmentId);
        return list.stream().filter(sp -> sp.getUser() == null || sp.getUser().isActive()).map(sp -> new DepartmentStudentDto(
                sp.getId(),
                sp.getStudentId(),
                sp.getName() != null ? sp.getName() : (sp.getUser() != null ? sp.getUser().getUsername() : ""),
                sp.getUser() != null ? sp.getUser().getEmail() : "",
                sp.getYear(),
                sp.getSemester(),
                sp.getBranch() != null ? sp.getBranch().getId() : null,
                sp.getBranch() != null ? sp.getBranch().getName() : "",
                sp.getSection() != null ? sp.getSection().getId() : null,
                sp.getSection() != null ? sp.getSection().getName() : ""
        )).toList();
    }

    @Transactional
    public DepartmentStudentDto updateDepartmentStudent(Long departmentId, Long studentId, String name, Integer year, Integer semester, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);
        StudentProfile profile = students.findById(studentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found."));
        if (profile.getDepartment() == null || !departmentId.equals(profile.getDepartment().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is outside your department.");
        if (name != null && !name.isBlank()) profile.setName(name.trim());
        if (year != null) profile.setYear(year);
        if (semester != null) profile.setSemester(semester);
        students.save(profile);
        return getDepartmentStudents(departmentId, actorUsername).stream().filter(s -> s.id().equals(studentId)).findFirst().orElseThrow();
    }

    @Transactional
    public void deactivateDepartmentStudent(Long departmentId, Long studentId, String actorUsername) {
        User actor = user(actorUsername);
        validateDepartmentAccess(actor, departmentId);
        StudentProfile profile = students.findById(studentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found."));
        if (profile.getDepartment() == null || !departmentId.equals(profile.getDepartment().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is outside your department.");
        if (profile.getUser() != null) {
            profile.getUser().setAccountStatus(com.notifyhub.auth.AccountStatus.INACTIVE);
            users.save(profile.getUser());
        }
    }

    private void validateDepartmentAccess(User actor, Long departmentId) {
        if (rbac.isSuperAdmin(actor) || actor.getEffectiveLevel() <= 2) return;
        Long actorDeptId = actor.getDepartmentEntity() != null ? actor.getDepartmentEntity().getId() : null;
        if (actorDeptId == null || !actorDeptId.equals(departmentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have administrative authority over department ID " + departmentId + ".");
        }
    }

    private User user(String username) {
        return users.findByUsername(username).or(() -> users.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required."));
    }

    public record BatchPromoteResult(Long departmentId, int fromYear, int toYear, int promotedCount, int skippedMaxYearCount, String message) {}
    public record DepartmentAnalyticsDto(Long departmentId, String departmentName, long studentCount, long facultyCount, long openQueries, long answeredQueries) {}
    public record DepartmentOverviewDto(Long departmentId, String departmentName, boolean active, String hodName, String hodEmail, long studentCount, long facultyCount) {}
    public record DepartmentFacultyDto(Long id, String facultyId, String name, String designation, Long departmentId, String departmentName, String relationship, Long userId, String email) {}
    public record DepartmentStudentDto(Long id, String studentId, String name, String email, int year, int semester, Long branchId, String branchName, Long sectionId, String sectionName) {}
}
