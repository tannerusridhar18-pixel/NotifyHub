package com.notifyhub.users;

import com.notifyhub.academicstructure.*;
import com.notifyhub.auth.*;
import com.notifyhub.faculty.FacultyDepartmentService;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import com.notifyhub.hostel.HostelRepository;
import com.notifyhub.hostel.HostelBlockRepository;
import com.notifyhub.hostel.RoomRepository;
import com.notifyhub.security.SecureTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdminInvitationServiceTest {

    @Mock UserRepository users;
    @Mock RoleRepository roles;
    @Mock DepartmentRepository departments;
    @Mock BranchRepository branches;
    @Mock SectionRepository sections;
    @Mock StudentProfileRepository students;
    @Mock FacultyProfileRepository faculty;
    @Mock FacultyDepartmentService facultyDepartmentService;
    @Mock HostelRepository hostels;
    @Mock HostelBlockRepository blocks;
    @Mock RoomRepository rooms;
    @Mock InvitationRepository invitations;
    @Mock com.notifyhub.rbac.UserRoleAssignmentRepository userRoleAssignments;
    @Mock ApplicationEventPublisher events;

    private AdminInvitationService service;
    private User admin;
    private Department department;
    private Branch branch;
    private Section section;
    private RoleEntity studentRole;
    private RoleEntity superAdminRole;
    private RoleEntity deptAdminRole;

    @BeforeEach
    void setUp() {
        service = new AdminInvitationService(users, roles, departments, branches, sections, students, faculty, hostels,
                blocks, rooms, invitations, userRoleAssignments, facultyDepartmentService, new BCryptPasswordEncoder(4), new SecureTokenService(), events, 48);
        superAdminRole = new RoleEntity("SUPER_ADMIN", 0, null, null, "[0,1,2,3,4,5]");
        studentRole = new RoleEntity("STUDENT", 5, null, null, "[]");
        deptAdminRole = new RoleEntity("DEPARTMENT_ADMIN", 3, null, null, "[3,4,5]");
        admin = new User();
        admin.setPublicId(UUID.randomUUID());
        admin.setUsername("admin");
        admin.setEmail("admin@notifyhub.local");
        admin.setRole(Role.SUPER_ADMIN);
        admin.setRoleEntity(superAdminRole);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        department = mock(Department.class);
        branch = mock(Branch.class);
        section = mock(Section.class);
        when(department.getId()).thenReturn(1L);
        when(branch.getId()).thenReturn(2L);
        when(branch.getDepartment()).thenReturn(department);
        when(branch.getMaxYear()).thenReturn(4);
        when(section.getId()).thenReturn(3L);
        when(section.getDepartment()).thenReturn(department);
        when(section.getBranch()).thenReturn(branch);
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(users.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(roles.findByNameIgnoreCase("STUDENT")).thenReturn(Optional.of(studentRole));
        when(roles.findByNameIgnoreCase("SUPER_ADMIN")).thenReturn(Optional.of(superAdminRole));
        when(roles.findByNameIgnoreCase("DEPARTMENT_ADMIN")).thenReturn(Optional.of(deptAdminRole));
        when(departments.findById(1L)).thenReturn(Optional.of(department));
        when(branches.findById(2L)).thenReturn(Optional.of(branch));
        when(sections.findById(3L)).thenReturn(Optional.of(section));
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(students.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(invitations.save(any(Invitation.class))).thenAnswer(invocation -> {
            Invitation invitation = invocation.getArgument(0);
            setInvitationId(invitation);
            return invitation;
        });
    }

    @Test
    void validInvitationPersistsAndPublishesEmailEventWithoutSendingSynchronously() {
        AdminInvitationService.ProfileRequest profile = new AdminInvitationService.ProfileRequest(
                "STU-1", null, "Student One", null, null, 1L, 2L, 3L, 1, 1, "2026", false, null, null, null, null, null, null);
        AdminInvitationService.InvitationResult result = service.create("admin",
                new AdminInvitationService.InvitationRequest("student@example.edu", Role.STUDENT, profile));

        assertThat(result.email()).isEqualTo("student@example.edu");
        verify(invitations).save(argThat(i -> i.getStatus().name().equals("PENDING") && i.getEmailStatus().name().equals("PENDING")));
        verify(events).publishEvent(any(InvitationCreatedEvent.class));
        verify(invitations, never()).delete(any());
    }

    @Test
    void customRoleInvitationCreatesScopedAssignment() {
        AdminInvitationService.ProfileRequest profile = new AdminInvitationService.ProfileRequest(
                null, "FAC-10", "Dept Head", null, null, 1L, null, null, null, null, null, false, null, null, null, "HOD", 1L, null);
        AdminInvitationService.InvitationResult result = service.create("admin",
                new AdminInvitationService.InvitationRequest("depthead@example.edu", "DEPARTMENT_ADMIN", null, 1L, null, null, profile));

        assertThat(result.email()).isEqualTo("depthead@example.edu");
        assertThat(result.role()).isEqualTo("DEPARTMENT_ADMIN");
        verify(userRoleAssignments).save(argThat(a ->
                a.getScopeType() == com.notifyhub.rbac.ScopeType.DEPARTMENT &&
                Long.valueOf(1L).equals(a.getScopeId()) &&
                "DEPARTMENT_ADMIN".equals(a.getRole().getName())));
    }

    @Test
    void superAdminCannotBeInvitedViaPublicInviteFlow() {
        AdminInvitationService.ProfileRequest profile = new AdminInvitationService.ProfileRequest(
                null, null, "Admin User", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> service.create("admin",
                new AdminInvitationService.InvitationRequest("admin2@example.edu", Role.SUPER_ADMIN, profile)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Super Admin accounts cannot be created via the public invitation flow");
        verify(invitations, never()).save(any());
    }

    @Test
    void mismatchedAcademicChainIsRejectedBeforePersistence() {
        Department otherDepartment = mock(Department.class);
        when(otherDepartment.getId()).thenReturn(9L);
        when(departments.findById(9L)).thenReturn(Optional.of(otherDepartment));

        AdminInvitationService.ProfileRequest profile = new AdminInvitationService.ProfileRequest(
                "STU-2", null, "Student Two", null, null, 9L, 2L, 3L, 1, 1, "2026", false, null, null, null, null, null, null);

        assertThatThrownBy(() -> service.create("admin",
                new AdminInvitationService.InvitationRequest("student2@example.edu", Role.STUDENT, profile)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Student academic scope is invalid");
        verify(invitations, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    private void setInvitationId(Invitation invitation) {
        try {
            Field idField = Invitation.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(invitation, UUID.randomUUID());
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
