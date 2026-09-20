package com.notifyhub.users;

import com.notifyhub.academicstructure.*;
import com.notifyhub.auth.*;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.faculty.FacultyDepartmentService;
import com.notifyhub.security.SecureTokenService;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import com.notifyhub.hostel.Hostel;
import com.notifyhub.hostel.HostelBlock;
import com.notifyhub.hostel.Room;
import com.notifyhub.hostel.HostelRepository;
import com.notifyhub.hostel.HostelBlockRepository;
import com.notifyhub.hostel.RoomRepository;
import com.notifyhub.rbac.ScopeType;
import com.notifyhub.rbac.UserRoleAssignment;
import com.notifyhub.rbac.UserRoleAssignmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AdminInvitationService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final SectionRepository sections;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final HostelRepository hostels;
    private final HostelBlockRepository blocks;
    private final RoomRepository rooms;
    private final InvitationRepository invitations;
    private final UserRoleAssignmentRepository userRoleAssignments;
    private final FacultyDepartmentService facultyDepartmentService;
    private final PasswordEncoder encoder;
    private final SecureTokenService secureTokens;
    private final long invitationHours;
    private final ApplicationEventPublisher events;

    public AdminInvitationService(UserRepository users, RoleRepository roles, DepartmentRepository departments, BranchRepository branches, SectionRepository sections,
                                  StudentProfileRepository students, FacultyProfileRepository faculty, HostelRepository hostels,
                                  HostelBlockRepository blocks, RoomRepository rooms, InvitationRepository invitations,
                                  UserRoleAssignmentRepository userRoleAssignments,
                                  FacultyDepartmentService facultyDepartmentService,
                                  PasswordEncoder encoder, SecureTokenService secureTokens, ApplicationEventPublisher events,
                                  @Value("${notifyhub.invitation-hours:48}") long invitationHours) {
        this.users = users; this.roles = roles; this.departments = departments; this.branches = branches; this.sections = sections; this.students = students; this.faculty = faculty;
        this.hostels = hostels; this.blocks = blocks; this.rooms = rooms;
        this.invitations = invitations; this.userRoleAssignments = userRoleAssignments;
        this.facultyDepartmentService = facultyDepartmentService;
        this.encoder = encoder; this.secureTokens = secureTokens; this.events = events; this.invitationHours = invitationHours;
    }

    @Transactional
    public InvitationResult create(String adminUsername, InvitationRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists for this email.");
        User caller = admin(adminUsername);

        // Resolve Target Role
        RoleEntity targetRole = null;
        if (request.roleId() != null) {
            targetRole = roles.findById(request.roleId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found."));
        } else if (request.role() != null && !request.role().isBlank()) {
            String rName = request.role().trim();
            final String finalRoleName = rName;
            targetRole = roles.findByNameIgnoreCase(finalRoleName)
                    .orElseGet(() -> roles.findAll().stream()
                            .filter(r -> r.getName().equalsIgnoreCase(finalRoleName))
                            .findFirst()
                            .orElse(null));
        }

        if (targetRole == null) {
            targetRole = roles.findByNameIgnoreCase("STUDENT").orElse(null);
        }

        if (targetRole != null && (targetRole.getLevel() == 0 || "SUPER_ADMIN".equalsIgnoreCase(targetRole.getName()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Super Admin accounts cannot be created via the public invitation flow. Provision directly via User Management.");
        }

        if (targetRole != null && targetRole.getLevel() < caller.getEffectiveLevel()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot invite a user into a role higher than your own.");
        }

        Department userDept = null;
        if (request.departmentId() != null) {
            userDept = department(request.departmentId());
        } else if (request.profile() != null && request.profile().departmentId() != null) {
            userDept = department(request.profile().departmentId());
        }

        Branch userBranch = null;
        if (request.branchId() != null) {
            userBranch = branch(request.branchId());
        } else if (request.profile() != null && request.profile().branchId() != null) {
            userBranch = branch(request.profile().branchId());
        }

        User user = new User();
        user.setUsername(request.email());
        user.setEmail(request.email());
        user.setRole(targetRole != null ? Role.fromName(targetRole.getName()) : (request.role() != null ? Role.fromName(request.role()) : Role.STUDENT));
        user.setRoleEntity(targetRole);
        user.setDepartmentEntity(userDept);
        user.setBranchEntity(userBranch);
        user.setPublicId(UUID.randomUUID());
        user.setAccountStatus(AccountStatus.INVITED);
        user.setPasswordHash(encoder.encode(UUID.randomUUID().toString()));
        user.setMustChangePassword(true);

        if (request.reportsToId() != null) {
            User mgr = users.findById(request.reportsToId()).orElse(null);
            user.setReportsTo(mgr);
        }

        users.save(user);

        if (targetRole != null) {
            UserRoleAssignment ura = new UserRoleAssignment();
            ura.setUser(user);
            ura.setRole(targetRole);
            if (userDept != null) {
                ura.setScopeType(ScopeType.DEPARTMENT);
                ura.setScopeId(userDept.getId());
            } else if (request.profile() != null && request.profile().sectionId() != null) {
                ura.setScopeType(ScopeType.SECTION);
                ura.setScopeId(request.profile().sectionId());
            } else {
                ura.setScopeType(ScopeType.GLOBAL);
                ura.setScopeId(null);
            }
            ura.setAssignedBy(caller);
            userRoleAssignments.save(ura);
        }

        ProfileRequest profile = request.profile();
        if (profile != null) {
            String roleName = targetRole != null ? targetRole.getName() : (request.role() != null ? request.role() : "STUDENT");
            if ("STUDENT".equalsIgnoreCase(roleName)) {
                createStudent(user, profile);
            } else if ("FACULTY".equalsIgnoreCase(roleName)) {
                createFaculty(user, profile);
            }
        }

        String rawToken = secureTokens.rawToken();
        Invitation invitation = new Invitation();
        invitation.setUser(user);
        invitation.setCreatedBy(caller);
        invitation.setTokenHash(secureTokens.hash(rawToken));
        invitation.setExpiresAt(Instant.now().plus(invitationHours, ChronoUnit.HOURS));
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        invitations.save(invitation);
        events.publishEvent(new InvitationCreatedEvent(invitation.getId(), user.getEmail(), user.getEffectiveRoleName(), rawToken, invitation.getExpiresAt()));
        return new InvitationResult(invitation.getId().toString(), user.getPublicId().toString(), user.getEmail(), user.getEffectiveRoleName(), invitation.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public java.util.List<InvitationView> list() {
        Instant now = Instant.now();
        return invitations.findAllByOrderByCreatedAtDesc().stream().map(invitation -> {
            InvitationStatus status = invitation.getUsedAt() != null ? InvitationStatus.USED
                    : invitation.getExpiresAt().isBefore(now) ? InvitationStatus.EXPIRED : InvitationStatus.PENDING;
            User u = invitation.getUser();
            return new InvitationView(
                    invitation.getId() != null ? invitation.getId().toString() : "",
                    u != null ? u.getEmail() : "",
                    u != null ? u.getEffectiveRoleName() : "STUDENT",
                    u != null ? u.getDepartment() : null,
                    status.name(),
                    invitation.getEmailStatus() != null ? invitation.getEmailStatus().name() : "PENDING",
                    invitation.getExpiresAt(),
                    invitation.getCreatedAt(),
                    invitation.getUsedAt(),
                    u != null && u.getPublicId() != null ? u.getPublicId().toString() : null
            );
        }).toList();
    }

    private void createStudent(User user, ProfileRequest request) {
        if (request.studentId() == null || request.name() == null || request.departmentId() == null || request.branchId() == null || request.sectionId() == null || request.year() == null || request.semester() == null) return;
        Department department = department(request.departmentId()); Branch branch = branch(request.branchId()); Section section = section(request.sectionId());
        if (!branch.getDepartment().getId().equals(department.getId()) || !section.getDepartment().getId().equals(department.getId()) || !section.getBranch().getId().equals(branch.getId()) || request.year() < 1 || request.year() > branch.getMaxYear()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student academic scope is invalid.");
        boolean hosteller = request.hosteller() != null && request.hosteller();
        StudentProfile profile = new StudentProfile(); profile.setUser(user); profile.setStudentId(request.studentId()); profile.setName(request.name()); profile.setPhone(request.phone()); profile.setPersonalEmail(request.personalEmail()); profile.setDepartment(department); profile.setBranch(branch); profile.setSection(section); profile.setYear(request.year()); profile.setSemester(request.semester()); profile.setBatch(request.batch()); profile.setHosteller(hosteller);
        if (hosteller && request.hostelId() != null) {
            Hostel hostel = hostels.findById(request.hostelId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hostel not found."));
            HostelBlock block = request.blockId() == null ? null : blocks.findById(request.blockId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hostel block not found."));
            Room room = request.roomId() == null ? null : rooms.findById(request.roomId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room not found."));
            if (!hostel.isActive() || (block != null && (!block.isActive() || !block.getHostel().getId().equals(hostel.getId()))) || (room != null && (room.getBlock() == null || block == null || !room.getBlock().getId().equals(block.getId())))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hostel assignment is invalid.");
            profile.setHostel(hostel); profile.setBlock(block); profile.setRoom(room);
        }
        students.save(profile);
    }

    private void createFaculty(User user, ProfileRequest request) {
        if (request.facultyId() == null || request.name() == null) return;
        Long homeDeptId = request.homeDepartmentId() != null ? request.homeDepartmentId() : request.departmentId();
        if (homeDeptId == null) return;
        Department homeDept = department(homeDeptId);

        FacultyProfile profile = new FacultyProfile();
        profile.setUser(user);
        profile.setFacultyId(request.facultyId());
        profile.setName(request.name());
        profile.setPhone(request.phone());
        profile.setDesignation(request.designation());
        profile.setDepartment(homeDept);
        FacultyProfile saved = faculty.save(profile);

        facultyDepartmentService.configureDepartments(saved, homeDeptId, request.subDepartmentIds());
    }

    private User admin(String username) {
        User user = users.findByUsername(username).orElseGet(() -> users.findByEmailIgnoreCase(username).orElse(null));
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        if (user.getEffectiveLevel() > 3 || !user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied.");
        return user;
    }
    private Department department(Long id) { return departments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found.")); }
    private Branch branch(Long id) { return branches.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch not found.")); }
    private Section section(Long id) { return sections.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section not found.")); }

    public record InvitationRequest(String email, String role, Long roleId, Long departmentId, Long branchId, Long reportsToId, ProfileRequest profile) {
        public InvitationRequest(String email, Role role, ProfileRequest profile) {
            this(email, role != null ? role.name() : null, null, null, null, null, profile);
        }
        public InvitationRequest(String email, String role, ProfileRequest profile) {
            this(email, role, null, null, null, null, profile);
        }
        public InvitationRequest(String email, Role role, Long roleId, Long departmentId, Long branchId, Long reportsToId, ProfileRequest profile) {
            this(email, role != null ? role.name() : null, roleId, departmentId, branchId, reportsToId, profile);
        }
    }
    public record ProfileRequest(String studentId, String facultyId, String name, String phone, String personalEmail, Long departmentId, Long branchId, Long sectionId, Integer year, Integer semester, String batch, Boolean hosteller, Long hostelId, Long blockId, Long roomId, String designation, Long homeDepartmentId, java.util.List<Long> subDepartmentIds) { }
    public record InvitationResult(String invitationId, String userPublicId, String email, String role, Instant expiresAt) { }
    public record InvitationView(String invitationId, String email, String role, String department, String status, String emailStatus, Instant expiresAt, Instant createdAt, Instant usedAt, String userPublicId) {
        public InvitationView(String invitationId, String email, String role, String status, String emailStatus, Instant expiresAt, Instant createdAt, Instant usedAt) {
            this(invitationId, email, role, null, status, emailStatus, expiresAt, createdAt, usedAt, null);
        }
    }
}
