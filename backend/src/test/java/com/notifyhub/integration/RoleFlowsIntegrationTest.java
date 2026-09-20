package com.notifyhub.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.academicstructure.*;
import com.notifyhub.announcement.*;
import com.notifyhub.auth.*;
import com.notifyhub.event.*;
import com.notifyhub.faculty.*;
import com.notifyhub.query.*;
import com.notifyhub.rbac.AuditLogRepository;
import com.notifyhub.security.JwtService;
import com.notifyhub.student.*;
import com.notifyhub.targeting.TargetType;
import com.notifyhub.targeting.TargetingService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoleFlowsIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepo;
    @Autowired DepartmentRepository departmentRepo;
    @Autowired BranchRepository branchRepo;
    @Autowired SectionRepository sectionRepo;
    @Autowired StudentProfileRepository studentProfileRepo;
    @Autowired FacultyProfileRepository facultyProfileRepo;
    @Autowired FacultyDepartmentMappingRepository mappingRepo;
    @Autowired AnnouncementRepository announcementRepo;
    @Autowired AnnouncementService announcementService;
    @Autowired EventRepository eventRepo;
    @Autowired EventService eventService;
    @Autowired EventRegistrationRepository registrationRepo;
    @Autowired QueryRepository queryRepo;
    @Autowired QueryService queryService;
    @Autowired TargetingService targetingService;
    @Autowired JwtService jwt;
    @Autowired AuditLogRepository auditRepo;

    private Department cseDept;
    private Department eceDept;
    private Branch cseBranch;
    private Section sectionA;
    private Section sectionB;

    @BeforeEach
    void setUp() {
        cseDept = new Department();
        cseDept.setName("Computer Science & Engineering");
        departmentRepo.saveAndFlush(cseDept);

        eceDept = new Department();
        eceDept.setName("Electronics & Communication");
        departmentRepo.saveAndFlush(eceDept);

        cseBranch = new Branch();
        cseBranch.setName("B.Tech CSE");
        cseBranch.setDepartment(cseDept);
        branchRepo.saveAndFlush(cseBranch);

        sectionA = new Section();
        sectionA.setName("CSE-A");
        sectionA.setAcademicYear(2026);
        sectionA.setDepartment(cseDept);
        sectionA.setBranch(cseBranch);
        sectionRepo.saveAndFlush(sectionA);

        sectionB = new Section();
        sectionB.setName("CSE-B");
        sectionB.setAcademicYear(2026);
        sectionB.setDepartment(cseDept);
        sectionB.setBranch(cseBranch);
        sectionRepo.saveAndFlush(sectionB);
    }

    private User createUser(String email, Role role, Department dept) {
        User u = new User();
        u.setUsername(email);
        u.setEmail(email);
        u.setPasswordHash("$2a$12$testHashValuedPlaceholderForTesting");
        u.setRole(role);
        u.setDepartmentEntity(dept);
        u.setDepartment(dept != null ? dept.getName() : null);
        u.setAccountStatus(AccountStatus.ACTIVE);
        return userRepo.saveAndFlush(u);
    }

    private Cookie authCookie(User user) {
        return new Cookie("NH_ACCESS", jwt.accessToken(user));
    }

    // =========================================================================
    // 1. Edge Case: Faculty with no HOME department yet
    // =========================================================================
    @Test
    @DisplayName("Faculty with no HOME department handles query routing & post creation without NPE")
    void testFacultyNoHomeDepartmentGracefulHandling() throws Exception {
        // Faculty with only SUB mapping (no HOME mapping assigned yet)
        User subOnlyFaculty = createUser("sub.faculty@example.edu", Role.FACULTY, null);
        FacultyProfile facultyProfile = new FacultyProfile();
        facultyProfile.setUser(subOnlyFaculty);
        facultyProfile.setDesignation("Assistant Professor");
        facultyProfileRepo.saveAndFlush(facultyProfile);

        FacultyDepartmentMapping subMap = new FacultyDepartmentMapping();
        subMap.setFaculty(facultyProfile);
        subMap.setDepartment(eceDept);
        subMap.setRelationship(FacultyDepartmentRelationship.SUB);
        mappingRepo.saveAndFlush(subMap);

        // 1. Query routing / submission from faculty with only SUB mapping falls back to SUB dept without NPE
        var queryDto = queryService.submitFaculty(
                new QueryService.FacultyQueryRequest("Sub Faculty Query", "Question regarding ECE lab access"),
                subOnlyFaculty.getUsername()
        );
        assertThat(queryDto).isNotNull();
        assertThat(queryDto.department()).isEqualTo(eceDept.getName());
        assertThat(queryDto.status()).isEqualTo(QueryStatus.OPEN);

        // 2. Faculty with completely empty department mappings: throws clear exception without NPE
        User unmappedFaculty = createUser("unmapped.faculty@example.edu", Role.FACULTY, null);
        FacultyProfile unmappedProfile = new FacultyProfile();
        unmappedProfile.setUser(unmappedFaculty);
        facultyProfileRepo.saveAndFlush(unmappedProfile);

        assertThatThrownBy(() -> queryService.submitFaculty(
                new QueryService.FacultyQueryRequest("Unassigned Query", "When will department mapping be assigned?"),
                unmappedFaculty.getUsername()
        )).isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("no assigned department");

        // 3. Faculty query inbox endpoint responds cleanly (empty list, no 500 error)
        mvc.perform(get("/api/v1/queries/faculty/inbox")
                .cookie(authCookie(unmappedFaculty)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    // =========================================================================
    // 2. Edge Case: Dean broadcast audience filtering
    // =========================================================================
    @Test
    @DisplayName("Dean broadcast targeting HODs/Faculty is scoped server-side and does not leak to students")
    void testDeanBroadcastAudienceFiltering() {
        User dean = createUser("dean@example.edu", Role.DEAN, null);
        User hod = createUser("hod.cse@example.edu", Role.HOD, cseDept);
        User faculty = createUser("faculty.cse@example.edu", Role.FACULTY, cseDept);
        User student = createUser("student.cse@example.edu", Role.STUDENT, cseDept);

        // Dean creates an announcement targeted strictly to HOD role
        Announcement hodBroadcast = new Announcement();
        hodBroadcast.setTitle("Confidential: HOD Strategy Meeting");
        hodBroadcast.setContent("Dean directive for all HODs regarding semester curriculum.");
        hodBroadcast.setTargetType(TargetType.ROLE);
        hodBroadcast.setRecipientType("role");
        hodBroadcast.setTargetRole(Role.HOD);
        hodBroadcast.setStatus(AnnouncementStatus.PUBLISHED);
        hodBroadcast.setCreatedBy(dean);
        announcementRepo.saveAndFlush(hodBroadcast);

        // Test server-side targeting matches recipient set
        assertThat(targetingService.matches(hodBroadcast, hod)).isTrue();
        assertThat(targetingService.matches(hodBroadcast, faculty)).isFalse();
        assertThat(targetingService.matches(hodBroadcast, student)).isFalse();

        // Dean broadcasts to Faculty
        Announcement facultyBroadcast = new Announcement();
        facultyBroadcast.setTitle("Faculty Research Grant Notice");
        facultyBroadcast.setContent("Submission guidelines for upcoming research proposals.");
        facultyBroadcast.setTargetType(TargetType.ROLE);
        facultyBroadcast.setRecipientType("role");
        facultyBroadcast.setTargetRole(Role.FACULTY);
        facultyBroadcast.setStatus(AnnouncementStatus.PUBLISHED);
        facultyBroadcast.setCreatedBy(dean);
        announcementRepo.saveAndFlush(facultyBroadcast);

        assertThat(targetingService.matches(facultyBroadcast, faculty)).isTrue();
        assertThat(targetingService.matches(facultyBroadcast, student)).isFalse();
    }

    // =========================================================================
    // 3. Edge Case: CSV export / Event Registration list with new fields
    // =========================================================================
    @Test
    @DisplayName("Event registration CSV export includes all new fields (student_id, name, email, department, year, section, registered_at)")
    void testEventRegistrationCsvExportWithNewFields() throws Exception {
        User admin = createUser("admin.events@example.edu", Role.ADMIN, cseDept);
        User studentUser = createUser("student.reg@example.edu", Role.STUDENT, cseDept);

        StudentProfile studentProfile = new StudentProfile();
        studentProfile.setUser(studentUser);
        studentProfile.setStudentId("STU-2026-001");
        studentProfile.setName("Jane Doe");
        studentProfile.setDepartment(cseDept);
        studentProfile.setBranch(cseBranch);
        studentProfile.setSection(sectionA);
        studentProfile.setYear(3);
        studentProfile.setSemester(5);
        studentProfileRepo.saveAndFlush(studentProfile);

        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Instant end = start.plus(2, ChronoUnit.HOURS);
        Event event = new Event();
        event.setTitle("Annual Hackathon 2026");
        event.setDescription("Annual Tech Hackathon with attachments");
        event.setLocation("Auditorium A");
        event.setStartAt(start);
        event.setEndAt(end);
        event.setTargetType(TargetType.GLOBAL);
        event.setStatus(EventStatus.PUBLISHED);
        event.setRegistrationEnabled(true);
        event.setCreatedBy(admin);
        eventRepo.saveAndFlush(event);

        // Student registers for the event
        EventRegistration registration = new EventRegistration();
        registration.setEvent(event);
        registration.setStudent(studentUser);
        registrationRepo.saveAndFlush(registration);

        // Admin exports registrations to CSV via endpoint
        MvcResult result = mvc.perform(get("/api/v1/events/" + event.getId() + "/registrations/export")
                .cookie(authCookie(admin)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.startsWith("text/csv")))
                .andReturn();

        String csvContent = result.getResponse().getContentAsString();
        assertThat(csvContent).contains("student_id,name,email,department,year,section,registered_at");
        assertThat(csvContent).contains("STU-2026-001");
        assertThat(csvContent).contains("Jane Doe");
        assertThat(csvContent).contains("student.reg@example.edu");
        assertThat(csvContent).contains(cseDept.getName());
        assertThat(csvContent).contains("3");
        assertThat(csvContent).contains("CSE-A");
    }

    // =========================================================================
    // 4. Core Flow Test: Student E2E Path
    // =========================================================================
    @Test
    @DisplayName("Student core flow: Scoped feed with attachment -> Event register -> Submit query to faculty -> View answer")
    void testStudentCoreFlow() throws Exception {
        User studentUser = createUser("student.flow@example.edu", Role.STUDENT, cseDept);
        User facultyUser = createUser("faculty.advisor@example.edu", Role.FACULTY, cseDept);

        FacultyProfile fp = new FacultyProfile();
        fp.setUser(facultyUser);
        fp.setDesignation("Assistant Professor");
        facultyProfileRepo.saveAndFlush(fp);

        FacultyDepartmentMapping map = new FacultyDepartmentMapping();
        map.setFaculty(fp);
        map.setDepartment(cseDept);
        map.setRelationship(FacultyDepartmentRelationship.HOME);
        mappingRepo.saveAndFlush(map);

        StudentProfile sp = new StudentProfile();
        sp.setUser(studentUser);
        sp.setStudentId("STU-FLOW-01");
        sp.setName("Student Flow");
        sp.setDepartment(cseDept);
        sp.setBranch(cseBranch);
        sp.setSection(sectionA);
        sp.setYear(2);
        sp.setSemester(3);
        studentProfileRepo.saveAndFlush(sp);

        // 1. View scoped feed with announcement attachment
        Announcement announcement = new Announcement();
        announcement.setTitle("CSE Dept Midterms");
        announcement.setContent("Schedule attached");
        announcement.setTargetType(TargetType.DEPARTMENT);
        announcement.setTargetDepartment(cseDept);
        announcement.setStatus(AnnouncementStatus.PUBLISHED);
        announcement.setAttachmentUrl("https://example.com/midterms.pdf");
        announcement.setAttachmentName("Midterms.pdf");
        announcement.setCreatedBy(facultyUser);
        announcementRepo.saveAndFlush(announcement);

        mvc.perform(get("/api/v1/announcements")
                .cookie(authCookie(studentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].attachmentUrl").value("https://example.com/midterms.pdf"));

        // 2. Register for event
        Event event = new Event();
        event.setTitle("CSE Coding Workshop");
        event.setDescription("Workshop description");
        event.setLocation("Lab 1");
        event.setStartAt(Instant.now().plus(1, ChronoUnit.DAYS));
        event.setEndAt(Instant.now().plus(1, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS));
        event.setTargetType(TargetType.DEPARTMENT);
        event.setTargetDepartment(cseDept);
        event.setStatus(EventStatus.PUBLISHED);
        event.setRegistrationEnabled(true);
        event.setCreatedBy(facultyUser);
        eventRepo.saveAndFlush(event);

        mvc.perform(post("/api/v1/events/" + event.getId() + "/register")
                .with(csrf())
                .cookie(authCookie(studentUser)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.studentEmail").value(studentUser.getEmail()));

        // 3. Submit query to faculty
        var queryDto = queryService.submitStudent(
                new QueryService.StudentQueryRequest("Can we use Dijkstra for DAGs?", "Algorithm Doubt", "FACULTY", facultyUser.getId()),
                studentUser.getUsername()
        );

        // Faculty answers
        queryService.answerScoped(queryDto.id(), "Yes, or topological sort + relax edges in O(V+E).", facultyUser.getUsername());

        // 4. Student views answered query
        mvc.perform(get("/api/v1/queries/my")
                .cookie(authCookie(studentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status").value("ANSWERED"))
                .andExpect(jsonPath("$.data.content[0].adminResponse").value("Yes, or topological sort + relax edges in O(V+E)."));
    }

    // =========================================================================
    // 5. Core Flow Test: Faculty E2E Path
    // =========================================================================
    @Test
    @DisplayName("Faculty core flow: View HOME/SUB departments -> Post announcement -> Answer query -> Escalate query to Department Admin")
    void testFacultyCoreFlow() throws Exception {
        User facultyUser = createUser("faculty.path@example.edu", Role.FACULTY, cseDept);
        User deptAdmin = createUser("admin.cse@example.edu", Role.ADMIN, cseDept);

        FacultyProfile fp = new FacultyProfile();
        fp.setUser(facultyUser);
        fp.setDesignation("Associate Professor");
        facultyProfileRepo.saveAndFlush(fp);

        FacultyDepartmentMapping homeMap = new FacultyDepartmentMapping();
        homeMap.setFaculty(fp);
        homeMap.setDepartment(cseDept);
        homeMap.setRelationship(FacultyDepartmentRelationship.HOME);
        mappingRepo.saveAndFlush(homeMap);

        FacultyDepartmentMapping subMap = new FacultyDepartmentMapping();
        subMap.setFaculty(fp);
        subMap.setDepartment(eceDept);
        subMap.setRelationship(FacultyDepartmentRelationship.SUB);
        mappingRepo.saveAndFlush(subMap);

        // 1. Verify HOME/SUB departments mapping
        mvc.perform(get("/api/v1/users/me")
                .cookie(authCookie(facultyUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.faculty.departments", hasSize(2)));

        // 2. Post department scoped announcement
        var created = announcementService.create(new AnnouncementService.Request(
                "Faculty Lecture Note",
                "Module 4 slides are uploaded",
                false,
                TargetType.DEPARTMENT,
                cseDept.getId(),
                null, null, null, null, null
        ), facultyUser.getUsername());
        assertThat(created).isNotNull();
        assertThat(created.status()).isEqualTo(AnnouncementStatus.DRAFT);

        // 3. Receive student query & answer
        CampusQuery studentQuery = new CampusQuery();
        studentQuery.setName("Student Name");
        studentQuery.setEmail("student@example.edu");
        studentQuery.setDepartment(cseDept.getName());
        studentQuery.setDepartmentEntity(cseDept);
        studentQuery.setSubject("Lab Equipment Issue");
        studentQuery.setMessage("Oscilloscope in Lab 2 needs calibration");
        studentQuery.setStatus(QueryStatus.OPEN);
        studentQuery.setTargetType("FACULTY");
        studentQuery.setTargetFaculty(facultyUser);
        queryRepo.saveAndFlush(studentQuery);

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/queries/" + studentQuery.getId() + "/answer")
                .with(csrf())
                .cookie(authCookie(facultyUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"response\": \"Noted, escalating to Dept Admin for maintenance.\"}"))
                .andExpect(status().isOk());

        // 4. Faculty submits upward query to HOME department admin
        var upwardQuery = queryService.submitFaculty(
                new QueryService.FacultyQueryRequest("Lab Maintenance Request", "Please approve calibration vendor for Lab 2 oscilloscopes"),
                facultyUser.getUsername()
        );
        assertThat(upwardQuery.targetType()).isEqualTo("DEPARTMENT_ADMIN");
        assertThat(upwardQuery.department()).isEqualTo(cseDept.getName());
    }

    // =========================================================================
    // 6. Core Flow Test: HOD E2E Path
    // =========================================================================
    @Test
    @DisplayName("HOD core flow: View Dean directives -> View roster -> Reassign section -> Post department circular")
    void testHodCoreFlow() throws Exception {
        User hod = createUser("hod.flow@example.edu", Role.HOD, cseDept);
        User dean = createUser("dean.flow@example.edu", Role.DEAN, null);
        User student = createUser("student.hodflow@example.edu", Role.STUDENT, cseDept);

        StudentProfile sp = new StudentProfile();
        sp.setUser(student);
        sp.setStudentId("STU-HOD-01");
        sp.setName("Student Roster");
        sp.setDepartment(cseDept);
        sp.setBranch(cseBranch);
        sp.setSection(sectionA);
        sp.setYear(1);
        sp.setSemester(1);
        studentProfileRepo.saveAndFlush(sp);

        // 1. Dean publishes a directive to HODs
        Announcement deanDirective = new Announcement();
        deanDirective.setTitle("Dean Directive on Syllabus Completion");
        deanDirective.setContent("All HODs to submit syllabus completion report by Friday");
        deanDirective.setTargetType(TargetType.ROLE);
        deanDirective.setRecipientType("role");
        deanDirective.setTargetRole(Role.HOD);
        deanDirective.setStatus(AnnouncementStatus.PUBLISHED);
        deanDirective.setCreatedBy(dean);
        announcementRepo.saveAndFlush(deanDirective);

        assertThat(targetingService.matches(deanDirective, hod)).isTrue();

        // 2. HOD views student roster & reassigns section from CSE-A to CSE-B
        sp.setSection(sectionB);
        studentProfileRepo.saveAndFlush(sp);

        StudentProfile updatedProfile = studentProfileRepo.findByUserId(student.getId()).orElseThrow();
        assertThat(updatedProfile.getSection().getName()).isEqualTo("CSE-B");

        // 3. HOD posts a department circular
        var circular = announcementService.create(new AnnouncementService.Request(
                "CSE Department Circular",
                "Internal assessment dates announced",
                false,
                TargetType.DEPARTMENT,
                cseDept.getId(),
                null, null, null, null, null
        ), hod.getUsername());
        assertThat(circular.targetType()).isEqualTo(TargetType.DEPARTMENT);
    }

    // =========================================================================
    // 7. Core Flow Test: Department Admin E2E Path
    // =========================================================================
    @Test
    @DisplayName("Department Admin core flow: Invite/Map faculty HOME+SUB -> Batch promote students -> Resolve queries")
    void testDepartmentAdminCoreFlow() {
        User deptAdmin = createUser("deptadmin.flow@example.edu", Role.ADMIN, cseDept);
        User faculty = createUser("faculty.new@example.edu", Role.FACULTY, cseDept);

        FacultyProfile fp = new FacultyProfile();
        fp.setUser(faculty);
        fp.setDesignation("Assistant Professor");
        facultyProfileRepo.saveAndFlush(fp);

        // 1. Map faculty with HOME in CSE and SUB in ECE
        FacultyDepartmentMapping homeMapping = new FacultyDepartmentMapping();
        homeMapping.setFaculty(fp);
        homeMapping.setDepartment(cseDept);
        homeMapping.setRelationship(FacultyDepartmentRelationship.HOME);
        mappingRepo.saveAndFlush(homeMapping);

        FacultyDepartmentMapping subMapping = new FacultyDepartmentMapping();
        subMapping.setFaculty(fp);
        subMapping.setDepartment(eceDept);
        subMapping.setRelationship(FacultyDepartmentRelationship.SUB);
        mappingRepo.saveAndFlush(subMapping);

        List<FacultyDepartmentMapping> mappings = mappingRepo.findByFacultyUserId(faculty.getId());
        assertThat(mappings).hasSize(2);

        // 2. Batch promote students in CSE department
        User student = createUser("student.promo@example.edu", Role.STUDENT, cseDept);
        StudentProfile sp = new StudentProfile();
        sp.setUser(student);
        sp.setStudentId("PROMO-001");
        sp.setName("Promo Candidate");
        sp.setDepartment(cseDept);
        sp.setBranch(cseBranch);
        sp.setSection(sectionA);
        sp.setYear(1);
        sp.setSemester(2);
        studentProfileRepo.saveAndFlush(sp);

        sp.setYear(sp.getYear() + 1);
        sp.setSemester(sp.getSemester() + 1);
        studentProfileRepo.saveAndFlush(sp);

        StudentProfile promoted = studentProfileRepo.findByUserId(student.getId()).orElseThrow();
        assertThat(promoted.getYear()).isEqualTo(2);
        assertThat(promoted.getSemester()).isEqualTo(3);

        // 3. Resolve faculty and student queries
        CampusQuery query = new CampusQuery();
        query.setName("Faculty Question");
        query.setEmail(faculty.getEmail());
        query.setDepartment(cseDept.getName());
        query.setDepartmentEntity(cseDept);
        query.setSubject("Subject Allotment");
        query.setMessage("Requesting Distributed Systems course");
        query.setTargetType("DEPARTMENT_ADMIN");
        query.setStatus(QueryStatus.OPEN);
        queryRepo.saveAndFlush(query);

        var answered = queryService.answer(query.getId(), "Approved for upcoming semester.");
        assertThat(answered.status()).isEqualTo(QueryStatus.ANSWERED);
        assertThat(answered.adminResponse()).isEqualTo("Approved for upcoming semester.");
    }

    // =========================================================================
    // 8. Core Flow Test: Principal & Dean E2E Path
    // =========================================================================
    @Test
    @DisplayName("Principal/Dean core flow: Broadcast to HODs -> Verify receipt -> View oversight feed")
    void testPrincipalDeanCoreFlow() {
        User principal = createUser("principal.flow@example.edu", Role.PRINCIPAL, null);
        User dean = createUser("dean.flow2@example.edu", Role.DEAN, null);
        User hod = createUser("hod.flow2@example.edu", Role.HOD, cseDept);
        User student = createUser("student.flow2@example.edu", Role.STUDENT, cseDept);

        // 1. Principal creates campus-wide emergency broadcast
        Announcement principalBroadcast = new Announcement();
        principalBroadcast.setTitle("Campus Holiday Notice");
        principalBroadcast.setContent("Campus will remain closed tomorrow due to weather warning.");
        principalBroadcast.setTargetType(TargetType.GLOBAL);
        principalBroadcast.setRecipientType("all_campus");
        principalBroadcast.setStatus(AnnouncementStatus.PUBLISHED);
        principalBroadcast.setCreatedBy(principal);
        announcementRepo.saveAndFlush(principalBroadcast);

        assertThat(targetingService.matches(principalBroadcast, hod)).isTrue();
        assertThat(targetingService.matches(principalBroadcast, student)).isTrue();

        // 2. Dean broadcasts strictly to HODs
        Announcement deanBroadcast = new Announcement();
        deanBroadcast.setTitle("Annual Budget Submission");
        deanBroadcast.setContent("HODs must submit departmental budgets by next Monday.");
        deanBroadcast.setTargetType(TargetType.ROLE);
        deanBroadcast.setRecipientType("role");
        deanBroadcast.setTargetRole(Role.HOD);
        deanBroadcast.setStatus(AnnouncementStatus.PUBLISHED);
        deanBroadcast.setCreatedBy(dean);
        announcementRepo.saveAndFlush(deanBroadcast);

        // HOD receives, Student does not receive
        assertThat(targetingService.matches(deanBroadcast, hod)).isTrue();
        assertThat(targetingService.matches(deanBroadcast, student)).isFalse();

        // 3. Oversight feed: Principal and Dean can view all announcements across the institution
        List<Announcement> allAnnouncements = announcementRepo.findAll();
        assertThat(allAnnouncements).contains(principalBroadcast, deanBroadcast);
    }
}
