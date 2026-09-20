package com.notifyhub.academicstructure;

import com.notifyhub.announcement.AnnouncementRepository;
import com.notifyhub.auth.*;
import com.notifyhub.event.EventRepository;
import com.notifyhub.faculty.FacultyDepartmentMappingRepository;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.query.QueryRepository;
import com.notifyhub.rbac.AuditLog;
import com.notifyhub.rbac.AuditLogRepository;
import com.notifyhub.rbac.RbacAuthorizationService;
import com.notifyhub.rbac.UserRoleAssignment;
import com.notifyhub.rbac.UserRoleAssignmentRepository;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentLeadershipServiceTest {

    @Mock private DepartmentRepository departments;
    @Mock private BranchRepository branches;
    @Mock private SectionRepository sections;
    @Mock private StudentProfileRepository students;
    @Mock private FacultyProfileRepository faculty;
    @Mock private FacultyDepartmentMappingRepository facultyMappings;
    @Mock private UserRepository users;
    @Mock private RoleRepository roles;
    @Mock private UserRoleAssignmentRepository assignments;
    @Mock private QueryRepository queries;
    @Mock private AnnouncementRepository announcements;
    @Mock private EventRepository events;
    @Mock private AuditLogRepository audit;
    @Mock private RbacAuthorizationService rbac;

    private DepartmentLeadershipService service;
    private Department dept;
    private Branch branch;
    private User superAdmin;

    @BeforeEach
    void setUp() {
        service = new DepartmentLeadershipService(
                departments,
                branches,
                sections,
                students,
                faculty,
                facultyMappings,
                users,
                roles,
                assignments,
                queries,
                announcements,
                events,
                audit,
                rbac
        );

        dept = new Department();
        dept.setName("Computer Science");
        dept.setActive(true);

        branch = new Branch();
        branch.setDepartment(dept);
        branch.setName("B.Tech CSE");
        branch.setMaxYear(4);
        branch.setActive(true);

        superAdmin = new User();
        superAdmin.setUsername("superadmin@notifyhub.local");
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdmin.setAccountStatus(AccountStatus.ACTIVE);
    }

    @Test
    void batchPromoteStudents_promotesEligibleStudentsAndResolvesSection() {
        when(users.findByUsername("superadmin@notifyhub.local")).thenReturn(Optional.of(superAdmin));
        when(departments.findById(1L)).thenReturn(Optional.of(dept));

        StudentProfile sp = new StudentProfile();
        sp.setYear(1);
        sp.setSemester(1);
        sp.setDepartment(dept);
        sp.setBranch(branch);

        Section secYear1 = new Section();
        secYear1.setName("Section A");
        secYear1.setAcademicYear(1);
        sp.setSection(secYear1);

        Section secYear2 = new Section();
        secYear2.setName("Section A");
        secYear2.setAcademicYear(2);

        when(students.findByDepartmentIdAndYear(1L, 1)).thenReturn(List.of(sp));
        when(sections.findByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(eq(1L), any(), eq(2), eq("Section A")))
                .thenReturn(Optional.of(secYear2));

        var result = service.batchPromoteStudents(1L, 1, 2, "superadmin@notifyhub.local");

        assertThat(result.promotedCount()).isEqualTo(1);
        assertThat(sp.getYear()).isEqualTo(2);
        assertThat(sp.getSemester()).isEqualTo(3);
        assertThat(sp.getSection()).isEqualTo(secYear2);
        verify(students).save(sp);
        verify(audit).save(any(AuditLog.class));
    }

    @Test
    void batchPromoteStudents_skipsStudentsExceedingBranchMaxYear() {
        when(users.findByUsername("superadmin@notifyhub.local")).thenReturn(Optional.of(superAdmin));
        when(departments.findById(1L)).thenReturn(Optional.of(dept));

        StudentProfile finalYear = new StudentProfile();
        finalYear.setYear(4);
        finalYear.setSemester(7);
        finalYear.setDepartment(dept);
        finalYear.setBranch(branch); // maxYear = 4

        when(students.findByDepartmentIdAndYear(1L, 4)).thenReturn(List.of(finalYear));

        var result = service.batchPromoteStudents(1L, 4, 5, "superadmin@notifyhub.local");

        assertThat(result.promotedCount()).isEqualTo(0);
        assertThat(result.skippedMaxYearCount()).isEqualTo(1);
        verify(students, never()).save(finalYear);
    }

    @Test
    void assignHod_assignsHodRoleAndCreatesAuditLog() {
        when(users.findByUsername("superadmin@notifyhub.local")).thenReturn(Optional.of(superAdmin));
        when(departments.findById(1L)).thenReturn(Optional.of(dept));

        User facultyUser = new User();
        facultyUser.setUsername("prof.smith@notifyhub.local");
        facultyUser.setRole(Role.FACULTY);

        RoleEntity hodRole = new RoleEntity();
        hodRole.setName("HOD");
        hodRole.setLevel(3);

        when(users.findById(10L)).thenReturn(Optional.of(facultyUser));
        when(roles.findByNameIgnoreCase("HOD")).thenReturn(Optional.of(hodRole));

        service.assignHod(1L, 10L, "superadmin@notifyhub.local");

        assertThat(facultyUser.getRole()).isEqualTo(Role.HOD);
        assertThat(facultyUser.getRoleEntity()).isEqualTo(hodRole);
        assertThat(facultyUser.getDepartmentEntity()).isEqualTo(dept);
        verify(users).save(facultyUser);
        verify(assignments).save(any(UserRoleAssignment.class));
        verify(audit).save(any(AuditLog.class));
    }
}
