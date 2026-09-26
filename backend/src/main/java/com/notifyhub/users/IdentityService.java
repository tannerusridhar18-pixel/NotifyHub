package com.notifyhub.users;

import com.notifyhub.academicstructure.Branch;
import com.notifyhub.academicstructure.BranchRepository;
import com.notifyhub.academicstructure.Department;
import com.notifyhub.academicstructure.DepartmentRepository;
import com.notifyhub.auth.*;
import com.notifyhub.faculty.FacultyDepartmentService;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class IdentityService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final FacultyDepartmentService facultyDepartmentService;
    private final InvitationRepository invitations;
    private final PasswordEncoder encoder;
    private final EntityManager entityManager;

    public IdentityService(
            UserRepository users,
            RoleRepository roles,
            DepartmentRepository departments,
            BranchRepository branches,
            StudentProfileRepository students,
            FacultyProfileRepository faculty,
            FacultyDepartmentService facultyDepartmentService,
            InvitationRepository invitations,
            PasswordEncoder encoder,
            EntityManager entityManager) {
        this.users = users;
        this.roles = roles;
        this.departments = departments;
        this.branches = branches;
        this.students = students;
        this.faculty = faculty;
        this.facultyDepartmentService = facultyDepartmentService;
        this.invitations = invitations;
        this.encoder = encoder;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public CurrentUser current(String username) {
        User user = user(username);
        StudentProfile student = (user.getEffectiveLevel() == 5 || user.getRole() == Role.STUDENT)
                ? students.findByUserId(user.getId()).orElse(null) : null;
        FacultyProfile teacher = (user.getEffectiveLevel() == 4 || user.getRole() == Role.FACULTY)
                ? faculty.findByUserId(user.getId()).orElse(null) : null;
        List<FacultyDeptMappingDto> deptMappings = (teacher != null)
                ? facultyDepartmentService.getMappingsForUser(user.getId()).stream()
                    .map(m -> new FacultyDeptMappingDto(m.getDepartment().getId(), m.getDepartment().getName(), m.getRelationship().name()))
                    .toList()
                : List.of();
        return CurrentUser.from(user, student, teacher, deptMappings);
    }

    @Transactional(readOnly = true)
    public Page<UserListItem> listUsers(String search, String roleFilter, Long departmentId, AccountStatus status, Pageable pageable) {
        List<User> allUsers = users.findAll();
        List<UserListItem> filtered = allUsers.stream()
                .filter(u -> {
                    if (search != null && !search.isBlank()) {
                        String q = search.toLowerCase().trim();
                        boolean match = (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                                (u.getUsername() != null && u.getUsername().toLowerCase().contains(q));
                        if (!match) return false;
                    }
                    if (roleFilter != null && !roleFilter.isBlank() && !roleFilter.equalsIgnoreCase("ALL")) {
                        if (!u.getEffectiveRoleName().equalsIgnoreCase(roleFilter)) return false;
                    }
                    if (departmentId != null) {
                        Long uDeptId = u.getDepartmentEntity() != null ? u.getDepartmentEntity().getId() : null;
                        if (!departmentId.equals(uDeptId)) return false;
                    }
                    if (status != null) {
                        if (u.getAccountStatus() != status) return false;
                    }
                    return true;
                })
                .map(this::toUserListItem)
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<UserListItem> paged = (start > filtered.size()) ? List.of() : filtered.subList(start, end);
        return new PageImpl<>(paged, pageable, filtered.size());
    }

    /** Extensible query-spec filtering; callers pass only filter[dimension] entries. */
    @Transactional(readOnly = true)
    public Page<UserListItem> listUsers(Map<String, String> filters, Pageable pageable) {
        Set<String> known = Set.of("department", "year", "section", "hostel", "block");
        if (filters.keySet().stream().anyMatch(k -> !known.contains(k)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown user filter dimension.");
        List<UserListItem> filtered = users.findAll().stream().filter(u -> matchesFilters(u, filters)).map(this::toUserListItem).toList();
        int start = (int) pageable.getOffset(), end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(start >= filtered.size() ? List.of() : filtered.subList(start, end), pageable, filtered.size());
    }

    private boolean matchesFilters(User user, Map<String, String> f) {
        if (f.containsKey("department")) {
            Long id = numeric(f.get("department"));
            Long current = user.getDepartmentEntity() != null ? user.getDepartmentEntity().getId()
                    : students.findByUserId(user.getId()).map(sp -> sp.getDepartment() != null ? sp.getDepartment().getId() : null).orElse(null);
            if (!java.util.Objects.equals(id, current)) return false;
        }
        if (f.keySet().stream().noneMatch(k -> !k.equals("department"))) return true;
        StudentProfile p = students.findByUserId(user.getId()).orElse(null);
        if (p == null) return false;
        return (!f.containsKey("year") || p.getYear() == numeric(f.get("year")))
                && (!f.containsKey("section") || (p.getSection() != null && p.getSection().getId().equals(numeric(f.get("section")))))
                && (!f.containsKey("hostel") || (p.getHostel() != null && p.getHostel().getId().equals(numeric(f.get("hostel")))))
                && (!f.containsKey("block") || (p.getBlock() != null && p.getBlock().getId().equals(numeric(f.get("block")))));
    }

    private Long numeric(String value) {
        try {
            return Long.valueOf(value);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filter values must be numeric ids.");
        }
    }

    @Transactional(readOnly = true)
    public List<EnrollmentItem> listEnrollments() {
        return invitations.findAllByOrderByCreatedAtDesc().stream()
                .filter(inv -> inv.getUsedAt() != null || inv.getStatus() == InvitationStatus.USED)
                .map(inv -> {
                    User u = inv.getUser();
                    return new EnrollmentItem(
                            inv.getId().toString(),
                            u.getPublicId().toString(),
                            u.getEmail(),
                            u.getEffectiveRoleName(),
                            u.getEffectiveLevel(),
                            u.getDepartment(),
                            inv.getCreatedAt(),
                            inv.getUsedAt(),
                            u.getAccountStatus().name()
                    );
                })
                .toList();
    }

    public UserListItem createUser(CreateUserCommand cmd) {
        if (users.existsByEmailIgnoreCase(cmd.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists for this email.");
        }

        RoleEntity role = null;
        if (cmd.roleId() != null) {
            role = roles.findById(cmd.roleId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found."));
        } else if (cmd.role() != null && !cmd.role().isBlank()) {
            role = roles.findByNameIgnoreCase(cmd.role().trim()).orElse(null);
        }

        if (role == null) {
            role = roles.findByNameIgnoreCase("STUDENT").orElse(null);
        }

        Department department = null;
        if (cmd.departmentId() != null) {
            department = departments.findById(cmd.departmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found."));
        }

        Branch branch = null;
        if (cmd.branchId() != null) {
            branch = branches.findById(cmd.branchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch not found."));
        }

        User reportsTo = null;
        if (cmd.reportsToId() != null) {
            reportsTo = users.findById(cmd.reportsToId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reports-to manager not found."));
        }

        User user = new User();
        user.setUsername(cmd.email());
        user.setEmail(cmd.email());
        user.setRoleEntity(role);
        user.setRole(role != null ? Role.fromName(role.getName()) : Role.STUDENT);
        user.setDepartmentEntity(department);
        user.setBranchEntity(branch);
        user.setReportsTo(reportsTo);
        user.setPasswordHash(encoder.encode(cmd.password() != null && !cmd.password().isBlank() ? cmd.password() : UUID.randomUUID().toString()));
        user.setAccountStatus(cmd.status() != null ? cmd.status() : AccountStatus.ACTIVE);
        user.setMustChangePassword(cmd.mustChangePassword() != null && cmd.mustChangePassword());
        user.setActive(user.getAccountStatus() == AccountStatus.ACTIVE);

        users.save(user);
        return toUserListItem(user);
    }

    public UserListItem updateUser(UUID publicId, UpdateUserCommand cmd) {
        User user = users.findByPublicId(publicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        if (cmd.roleId() != null) {
            RoleEntity role = roles.findById(cmd.roleId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found."));
            user.setRoleEntity(role);
            user.setRole(Role.fromName(role.getName()));
        } else if (cmd.role() != null && !cmd.role().isBlank()) {
            RoleEntity role = roles.findByNameIgnoreCase(cmd.role().trim()).orElse(null);
            if (role != null) {
                user.setRoleEntity(role);
                user.setRole(Role.fromName(role.getName()));
            }
        }

        if (cmd.departmentId() != null) {
            Department department = departments.findById(cmd.departmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found."));
            user.setDepartmentEntity(department);
        }

        if (cmd.branchId() != null) {
            Branch branch = branches.findById(cmd.branchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch not found."));
            user.setBranchEntity(branch);
        }

        if (cmd.reportsToId() != null) {
            if (cmd.reportsToId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A user cannot report to themselves.");
            }
            User mgr = users.findById(cmd.reportsToId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reports-to manager not found."));
            user.setReportsTo(mgr);
        }

        if (cmd.status() != null) {
            user.setAccountStatus(cmd.status());
            user.setActive(cmd.status() == AccountStatus.ACTIVE);
        }

        if (cmd.password() != null && !cmd.password().isBlank()) {
            user.setPasswordHash(encoder.encode(cmd.password()));
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        }

        users.save(user);
        return toUserListItem(user);
    }

    public void removeUser(UUID publicId) {
        User user = users.findByPublicId(publicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (user.getEffectiveLevel() == 0 && users.findAll().stream().filter(u -> !u.isDeleted() && u.getEffectiveLevel() == 0 && u.isActive()).count() <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the only active Super Admin.");
        }

        long userId = user.getId();

        // Clear nullable references from records that belong to other users and must survive the deletion.
        entityManager.createNativeQuery("UPDATE announcements SET target_user_id = NULL WHERE target_user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("UPDATE events SET target_user_id = NULL WHERE target_user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("UPDATE queries SET student_id = NULL, asker_id = NULL, target_faculty_id = NULL, answered_by = NULL WHERE student_id = ?1 OR asker_id = ?1 OR target_faculty_id = ?1 OR answered_by = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("UPDATE audit_log SET actor_id = NULL WHERE actor_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("UPDATE roles SET created_by = NULL WHERE created_by = ?1")
                .setParameter(1, userId).executeUpdate();

        // Remove records owned by the account before removing the account itself.
        entityManager.createNativeQuery("DELETE FROM event_registrations WHERE student_id = ?1 OR event_id IN (SELECT id FROM events WHERE created_by = ?1)")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM announcements WHERE created_by = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM events WHERE created_by = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM invitations WHERE user_id = ?1 OR created_by = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM password_reset_tokens WHERE user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM refresh_tokens WHERE user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM user_role_assignments WHERE user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM student_profiles WHERE user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM faculty_profiles WHERE user_id = ?1")
                .setParameter(1, userId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM users WHERE id = ?1")
                .setParameter(1, userId).executeUpdate();
    }

    @Transactional
    public void setStatus(UUID publicId, AccountStatus status) {
        if (status == AccountStatus.INVITED) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid account status transition.");
        User user = users.findByPublicId(publicId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.setAccountStatus(status);
        user.setActive(status == AccountStatus.ACTIVE);
        users.save(user);
    }

    @Transactional
    public void setRole(UUID publicId, Role role) {
        User user = users.findByPublicId(publicId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        RoleEntity entity = roles.findByNameIgnoreCase(role.name()).orElse(null);
        if (entity != null) user.setRoleEntity(entity);
        user.setRole(role);
        users.save(user);
    }

    public User user(String username) {
        return users.findByUsername(username).orElseGet(() -> users.findByEmailIgnoreCase(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.")));
    }

    private UserListItem toUserListItem(User u) {
        return new UserListItem(
                u.getId(),
                u.getPublicId().toString(),
                u.getUsername(),
                u.getEmail(),
                u.getEffectiveRoleName(),
                u.getRoleEntity() != null ? u.getRoleEntity().getId() : null,
                u.getEffectiveLevel(),
                u.getDepartment(),
                u.getDepartmentEntity() != null ? u.getDepartmentEntity().getId() : null,
                u.getBranchEntity() != null ? u.getBranchEntity().getId() : null,
                u.getReportsTo() != null ? u.getReportsTo().getId() : null,
                u.getReportsTo() != null ? u.getReportsTo().getEmail() : null,
                u.getAccountStatus().name(),
                u.isActive(),
                u.getCreatedAt()
        );
    }

    public record FacultyDeptMappingDto(Long departmentId, String departmentName, String relationship) {}

    public record CurrentUser(String publicId, String email, String role, Long roleId, int roleLevel, String department, Long departmentId, String accountStatus, StudentView student, FacultyView faculty) {
        static CurrentUser from(User user, StudentProfile student, FacultyProfile faculty, List<FacultyDeptMappingDto> deptMappings) {
            StudentView studentView = student == null ? null : new StudentView(
                    student.getStudentId(),
                    student.getName(),
                    student.getDepartment() != null ? student.getDepartment().getId() : null,
                    student.getBranch() != null ? student.getBranch().getId() : null,
                    student.getSection() != null ? student.getSection().getId() : null,
                    student.getYear(),
                    student.getSemester(),
                    student.isHosteller(),
                    student.getPhone(),
                    student.getPersonalEmail()
            );
            FacultyView facultyView = faculty == null ? null : new FacultyView(
                    faculty.getFacultyId(),
                    faculty.getName(),
                    faculty.getDepartment() != null ? faculty.getDepartment().getId() : null,
                    faculty.getPhone(),
                    faculty.getDesignation(),
                    deptMappings
            );
            return new CurrentUser(
                    user.getPublicId().toString(),
                    user.getEmail(),
                    user.getEffectiveRoleName(),
                    user.getRoleEntity() != null ? user.getRoleEntity().getId() : null,
                    user.getEffectiveLevel(),
                    user.getDepartment(),
                    user.getDepartmentEntity() != null ? user.getDepartmentEntity().getId() : null,
                    user.getAccountStatus().name(),
                    studentView,
                    facultyView
            );
        }
    }

    public record StudentView(String studentId, String name, Long departmentId, Long branchId, Long sectionId, int year, int semester, boolean hosteller, String phone, String personalEmail) { }

    public record FacultyView(String facultyId, String name, Long departmentId, String phone, String designation, List<FacultyDeptMappingDto> departments) { }

    public record UserListItem(
            Long id,
            String publicId,
            String username,
            String email,
            String role,
            Long roleId,
            int level,
            String department,
            Long departmentId,
            Long branchId,
            Long reportsToId,
            String reportsToEmail,
            String status,
            boolean active,
            Instant createdAt
    ) {}

    public record EnrollmentItem(
            String invitationId,
            String userPublicId,
            String email,
            String role,
            int level,
            String department,
            Instant invitedAt,
            Instant registeredAt,
            String status
    ) {}

    public record CreateUserCommand(
            String email,
            String password,
            String role,
            Long roleId,
            Long departmentId,
            Long branchId,
            Long reportsToId,
            AccountStatus status,
            Boolean mustChangePassword
    ) {}

    public record UpdateUserCommand(
            String role,
            Long roleId,
            Long departmentId,
            Long branchId,
            Long reportsToId,
            AccountStatus status,
            String password
    ) {}
}