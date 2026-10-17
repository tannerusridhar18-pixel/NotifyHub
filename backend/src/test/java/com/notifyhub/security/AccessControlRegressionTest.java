package com.notifyhub.security;

import com.notifyhub.academicstructure.Department;
import com.notifyhub.academicstructure.DepartmentRepository;
import com.notifyhub.announcement.AnnouncementRepository;
import com.notifyhub.announcement.AnnouncementService;
import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.AuthService;
import com.notifyhub.auth.RefreshTokenRepository;
import com.notifyhub.auth.Role;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.query.CampusQuery;
import com.notifyhub.query.QueryRepository;
import com.notifyhub.targeting.TargetType;
import com.notifyhub.targeting.TargetingService;
import com.notifyhub.event.Event;
import com.notifyhub.event.EventRepository;
import com.notifyhub.event.EventStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for the access-control and persistence bugs found in the backend review.
 * Not class-level @Transactional on purpose: the lockout test needs real commits/rollbacks.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AccessControlRegressionTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired AnnouncementService announcementService;
    @Autowired QueryRepository queryRepo;
    @Autowired AuthService authService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired SecureTokenService secureTokens;
    @Autowired DepartmentRepository departmentRepo;
    @Autowired AnnouncementRepository announcementRepo;
    @Autowired TargetingService targetingService;
    @Autowired EventRepository eventRepo;
    @PersistenceContext EntityManager em;

    private User newUser(String prefix, Role role) {
        User user = new User();
        user.setUsername(prefix + "-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash("test-hash");
        user.setRole(role);
        user.setAccountStatus(AccountStatus.ACTIVE);
        return users.saveAndFlush(user);
    }

    private Cookie cookieFor(User user) {
        return new Cookie("NH_ACCESS", jwt.accessToken(user));
    }

    @Test
    @Transactional
    void studentCannotListUsersButAdminCan() throws Exception {
        User student = newUser("student", Role.STUDENT);
        User admin = newUser("admin", Role.ADMIN);

        mvc.perform(get("/api/v1/users").cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/users").cookie(cookieFor(admin)))
                .andExpect(status().isOk());
    }

    @Test
    @Transactional
    void studentCannotUseDepartmentLeadershipAliases() throws Exception {
        User student = newUser("student-leadership", Role.STUDENT);

        mvc.perform(get("/api/v1/departments/1/students").cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/departments/1/faculty").cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/students/batch-promote")
                        .with(csrf()).cookie(cookieFor(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"departmentId\":1,\"fromYear\":1,\"toYear\":2}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void studentCanReadFacultyDirectoryOnlyForOwnDepartment() throws Exception {
        Department department = new Department();
        department.setName("Student Faculty Directory " + System.nanoTime());
        department = departmentRepo.saveAndFlush(department);

        User student = newUser("student-faculty", Role.STUDENT);
        student.setDepartmentEntity(department);
        users.saveAndFlush(student);

        mvc.perform(get("/api/v1/departments/" + department.getId() + "/faculty").cookie(cookieFor(student)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/departments/" + (department.getId() + 1) + "/faculty").cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void studentCannotPublishOrDeleteSomeoneElsesAnnouncement() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        User student = newUser("student", Role.STUDENT);

        var created = announcementService.create(new AnnouncementService.Request(
                "Regression notice", "Body text", false, TargetType.GLOBAL,
                null, null, null, null, null, null), admin.getUsername());
        assertNotNull(created.id());

        mvc.perform(post("/api/v1/announcements/" + created.id() + "/publish")
                        .with(csrf()).cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/announcements/" + created.id() + "/archive")
                        .with(csrf()).cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/announcements/" + created.id())
                        .with(csrf()).cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void studentCannotAnswerOrDeleteQueriesThroughLegacyEndpoints() throws Exception {
        User student = newUser("student", Role.STUDENT);
        String queryJson = """
                {
                    "name": "Alex Student",
                    "email": "%s",
                    "department": "Computer Science",
                    "subject": "Regression question",
                    "message": "Can a student answer this?"
                }
                """.formatted(student.getEmail());

        mvc.perform(post("/api/v1/queries").contentType(MediaType.APPLICATION_JSON).content(queryJson))
                .andExpect(status().isCreated());
        CampusQuery saved = queryRepo.findByEmailIgnoreCase(student.getEmail(), PageRequest.of(0, 10))
                .getContent().get(0);

        mvc.perform(post("/api/v1/queries/" + saved.getId() + "/answer")
                        .with(csrf()).cookie(cookieFor(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"response\":\"I answered my own question\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/queries/" + saved.getId())
                        .with(csrf()).cookie(cookieFor(student)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void announcementTitleWithQuotesDoesNotBreakAuditLogging() {
        User admin = newUser("admin", Role.ADMIN);

        var created = announcementService.create(new AnnouncementService.Request(
                "Guest lecture: \"AI in 2026\"", "Body text", false, TargetType.GLOBAL,
                null, null, null, null, null, null), admin.getUsername());
        em.flush(); // forces the audit_log JSON column insert

        assertNotNull(created.id());
    }

    @Test
    void failedLoginsAreCountedAndLockTheAccount() {
        // No @Transactional here: each login() call must commit on its own, as in production.
        User user = new User();
        user.setUsername("lockout-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash(passwordEncoder.encode("Correct123"));
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user = users.saveAndFlush(user);
        Long id = user.getId();

        try {
            for (int i = 0; i < 5; i++) {
                assertThrows(ResponseStatusException.class,
                        () -> authService.login(users.findById(id).orElseThrow().getEmail(), "Wrong-password-1"));
            }

            User reloaded = users.findById(id).orElseThrow();
            assertEquals(5, reloaded.getFailedLoginAttempts(), "failed attempts must survive the exception");
            assertTrue(reloaded.isLocked(Instant.now()), "account must be locked after 5 failures");

            ResponseStatusException locked = assertThrows(ResponseStatusException.class,
                    () -> authService.login(users.findById(id).orElseThrow().getEmail(), "Correct123"));
            assertEquals(429, locked.getStatusCode().value());
        } finally {
            users.deleteById(id);
        }
    }

    @Test
    @Transactional
    void facultyCannotBroadcastCampusWide() {
        User faculty = newUser("faculty", Role.FACULTY);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                announcementService.create(new AnnouncementService.Request(
                        "Campus-wide notice", "Body text", false, TargetType.GLOBAL,
                        null, null, null, null, null, null), faculty.getUsername()));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @Transactional
    void anonymousUrgentFeedDoesNotExposeDepartmentTargetedAnnouncements() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        Department dept = new Department();
        dept.setName("Leak Test Dept " + System.nanoTime());
        dept = departmentRepo.saveAndFlush(dept);

        var created = announcementService.create(new AnnouncementService.Request(
                "Secret urgent notice", "Only for one department", true, TargetType.DEPARTMENT,
                dept.getId(), null, null, null, null, null), admin.getUsername());
        announcementService.publish(created.id());
        em.flush();

        mvc.perform(get("/api/v1/announcements/urgent"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("Secret urgent notice"))));
    }

    @Test
    @Transactional
    void globalAnnouncementWithDefaultRecipientTypeIsVisibleToSignedInUsers() {
        User admin = newUser("admin", Role.ADMIN);
        User student = newUser("student", Role.STUDENT);

        var created = announcementService.create(new AnnouncementService.Request(
                "Campus open day", "Body text", false, TargetType.GLOBAL,
                null, null, null, null, null, null), admin.getUsername());

        var entity = announcementRepo.findById(created.id()).orElseThrow();
        assertTrue(targetingService.matches(entity, student));
    }

    @Test
    @Transactional
    void plainAdminCannotResetASuperAdminsPassword() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        User superAdmin = newUser("superadmin", Role.SUPER_ADMIN);

        mvc.perform(put("/api/v1/admin/users/" + superAdmin.getPublicId())
                        .with(csrf()).cookie(cookieFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"NewPassw0rd123\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void parallelRefreshWithTheSameTokenDoesNotEndTheSession() {
        User user = new User();
        user.setUsername("refresh-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash(passwordEncoder.encode("Correct123"));
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user = users.saveAndFlush(user);

        var session = authService.login(user.getEmail(), "Correct123");
        var first = authService.refresh(session.rawRefreshToken());
        // a second request from the same browser presents the same, just-rotated token
        var second = authService.refresh(session.rawRefreshToken());

        assertNotNull(second.rawRefreshToken());
        assertNotNull(authService.refresh(first.rawRefreshToken()).rawRefreshToken(), "session must still be alive");
    }

    @Test
    @Transactional
    void reusingAnOldRotatedRefreshTokenStillRevokesTheSession() {
        User user = new User();
        user.setUsername("reuse-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash(passwordEncoder.encode("Correct123"));
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user = users.saveAndFlush(user);

        var session = authService.login(user.getEmail(), "Correct123");
        var first = authService.refresh(session.rawRefreshToken());

        // pretend the rotation happened a minute ago: this is now genuine token reuse
        var old = refreshTokens.findByTokenHash(secureTokens.hash(session.rawRefreshToken())).orElseThrow();
        old.setRevokedAt(Instant.now().minusSeconds(60));
        refreshTokens.saveAndFlush(old);

        assertThrows(ResponseStatusException.class, () -> authService.refresh(session.rawRefreshToken()));
        assertThrows(ResponseStatusException.class, () -> authService.refresh(first.rawRefreshToken()));
    }

    @Test
    void unauthenticatedCannotRegisterForEvent() throws Exception {
        mvc.perform(post("/api/v1/events/999/register")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void nonStudentCannotRegisterForEvent() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        User faculty = newUser("faculty", Role.FACULTY);

        Event event = new Event();
        event.setTitle("Campus Tech Talk");
        event.setDescription("Tech Talk Description");
        event.setLocation("Auditorium");
        event.setStartAt(Instant.now().plusSeconds(86400));
        event.setEndAt(Instant.now().plusSeconds(93600));
        event.setStatus(EventStatus.PUBLISHED);
        event.setTargetType(TargetType.GLOBAL);
        event.setRegistrationEnabled(true);
        event.setCreatedBy(admin);
        event = eventRepo.saveAndFlush(event);

        mvc.perform(post("/api/v1/events/" + event.getId() + "/register")
                        .with(csrf())
                        .cookie(cookieFor(faculty)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(containsString("Only students can register for events")));
    }

    @Test
    @Transactional
    void duplicateStudentRegistrationReturnsConflict() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        User student = newUser("student", Role.STUDENT);

        Event event = new Event();
        event.setTitle("Hackathon 2026");
        event.setDescription("Annual Hackathon");
        event.setLocation("Main Hall");
        event.setStartAt(Instant.now().plusSeconds(86400));
        event.setEndAt(Instant.now().plusSeconds(93600));
        event.setStatus(EventStatus.PUBLISHED);
        event.setTargetType(TargetType.GLOBAL);
        event.setRegistrationEnabled(true);
        event.setCreatedBy(admin);
        event = eventRepo.saveAndFlush(event);

        // First registration succeeds
        mvc.perform(post("/api/v1/events/" + event.getId() + "/register")
                        .with(csrf())
                        .cookie(cookieFor(student)))
                .andExpect(status().isCreated());

        // Duplicate registration returns 409 Conflict
        mvc.perform(post("/api/v1/events/" + event.getId() + "/register")
                        .with(csrf())
                        .cookie(cookieFor(student)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("already registered")));
    }

    @Test
    @Transactional
    void departmentAdminCanOnlyAccessRegistrationsForOwnDepartment() throws Exception {
        User admin = newUser("admin", Role.ADMIN);

        Department deptA = new Department();
        deptA.setName("DeptA-" + System.nanoTime());
        deptA = departmentRepo.saveAndFlush(deptA);

        Department deptB = new Department();
        deptB.setName("DeptB-" + System.nanoTime());
        deptB = departmentRepo.saveAndFlush(deptB);

        User deptAdmin = newUser("deptadmin", Role.DEPARTMENT_ADMIN);
        deptAdmin.setDepartmentEntity(deptA);
        deptAdmin = users.saveAndFlush(deptAdmin);

        Event eventA = new Event();
        eventA.setTitle("Event Dept A");
        eventA.setDescription("Desc");
        eventA.setLocation("Room 1");
        eventA.setStartAt(Instant.now().plusSeconds(86400));
        eventA.setEndAt(Instant.now().plusSeconds(93600));
        eventA.setStatus(EventStatus.PUBLISHED);
        eventA.setTargetType(TargetType.DEPARTMENT);
        eventA.setTargetDepartment(deptA);
        eventA.setRegistrationEnabled(true);
        eventA.setCreatedBy(admin);
        eventA = eventRepo.saveAndFlush(eventA);

        Event eventB = new Event();
        eventB.setTitle("Event Dept B");
        eventB.setDescription("Desc");
        eventB.setLocation("Room 2");
        eventB.setStartAt(Instant.now().plusSeconds(86400));
        eventB.setEndAt(Instant.now().plusSeconds(93600));
        eventB.setStatus(EventStatus.PUBLISHED);
        eventB.setTargetType(TargetType.DEPARTMENT);
        eventB.setTargetDepartment(deptB);
        eventB.setRegistrationEnabled(true);
        eventB.setCreatedBy(admin);
        eventB = eventRepo.saveAndFlush(eventB);

        // Dept admin viewing own department event registrations -> 200 OK
        mvc.perform(get("/api/v1/events/" + eventA.getId() + "/registrations")
                        .cookie(cookieFor(deptAdmin)))
                .andExpect(status().isOk());

        // Dept admin viewing another department event registrations -> 403 Forbidden
        mvc.perform(get("/api/v1/events/" + eventB.getId() + "/registrations")
                        .cookie(cookieFor(deptAdmin)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void superAdminCanAccessRegistrationsForAnyDepartment() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        User superAdmin = newUser("superadmin", Role.SUPER_ADMIN);

        Department dept = new Department();
        dept.setName("DeptX-" + System.nanoTime());
        dept = departmentRepo.saveAndFlush(dept);

        Event event = new Event();
        event.setTitle("Event Dept X");
        event.setDescription("Desc");
        event.setLocation("Room X");
        event.setStartAt(Instant.now().plusSeconds(86400));
        event.setEndAt(Instant.now().plusSeconds(93600));
        event.setStatus(EventStatus.PUBLISHED);
        event.setTargetType(TargetType.DEPARTMENT);
        event.setTargetDepartment(dept);
        event.setRegistrationEnabled(true);
        event.setCreatedBy(admin);
        event = eventRepo.saveAndFlush(event);

        mvc.perform(get("/api/v1/events/" + event.getId() + "/registrations")
                        .cookie(cookieFor(superAdmin)))
                .andExpect(status().isOk());
    }

    @Test
    @Transactional
    void departmentAdminCanOnlyAccessDepartmentScopedEventManagementApi() throws Exception {
        User admin = newUser("admin", Role.ADMIN);
        User superAdmin = newUser("superadmin", Role.SUPER_ADMIN);

        Department deptA = new Department();
        deptA.setName("DeptA-Mgmt-" + System.nanoTime());
        deptA = departmentRepo.saveAndFlush(deptA);

        Department deptB = new Department();
        deptB.setName("DeptB-Mgmt-" + System.nanoTime());
        deptB = departmentRepo.saveAndFlush(deptB);

        User deptAdmin = newUser("deptadmin", Role.DEPARTMENT_ADMIN);
        deptAdmin.setDepartmentEntity(deptA);
        deptAdmin = users.saveAndFlush(deptAdmin);

        Event eventA = new Event();
        eventA.setTitle("Event In Dept A");
        eventA.setDescription("Desc");
        eventA.setLocation("Hall A");
        eventA.setStartAt(Instant.now().plusSeconds(86400));
        eventA.setEndAt(Instant.now().plusSeconds(93600));
        eventA.setStatus(EventStatus.PUBLISHED);
        eventA.setTargetType(TargetType.DEPARTMENT);
        eventA.setTargetDepartment(deptA);
        eventA.setRegistrationEnabled(true);
        eventA.setCreatedBy(admin);
        eventRepo.saveAndFlush(eventA);

        Event eventB = new Event();
        eventB.setTitle("Event In Dept B");
        eventB.setDescription("Desc");
        eventB.setLocation("Hall B");
        eventB.setStartAt(Instant.now().plusSeconds(86400));
        eventB.setEndAt(Instant.now().plusSeconds(93600));
        eventB.setStatus(EventStatus.PUBLISHED);
        eventB.setTargetType(TargetType.DEPARTMENT);
        eventB.setTargetDepartment(deptB);
        eventB.setRegistrationEnabled(true);
        eventB.setCreatedBy(admin);
        eventRepo.saveAndFlush(eventB);

        // Dept admin calling department-management endpoint: succeeds and returns only Dept A event
        mvc.perform(get("/api/v1/events/department-management")
                        .cookie(cookieFor(deptAdmin)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Event In Dept A")))
                .andExpect(content().string(not(containsString("Event In Dept B"))));

        // Dept admin calling global /events/management endpoint -> 403 Forbidden
        mvc.perform(get("/api/v1/events/management")
                        .cookie(cookieFor(deptAdmin)))
                .andExpect(status().isForbidden());

        // Super Admin calling global /events/management endpoint -> 200 OK
        mvc.perform(get("/api/v1/events/management")
                        .cookie(cookieFor(superAdmin)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Event In Dept A")))
                .andExpect(content().string(containsString("Event In Dept B")));
    }

    @Test
    @Transactional
    void eventDraftLifecycleAndExclusionFromPublicFeed() throws Exception {
        User superAdmin = newUser("superadmin-events", Role.SUPER_ADMIN);
        String startAt = Instant.now().plusSeconds(86400).toString();
        String endAt = Instant.now().plusSeconds(93600).toString();

        String draftPayload = """
            {
                "title": "Confidential Research Symposium",
                "description": "Internal discussion and planning",
                "location": "Auditorium X",
                "startAt": "%s",
                "endAt": "%s",
                "targetType": "GLOBAL"
            }
            """.formatted(startAt, endAt);

        // 1. Super Admin saves draft event
        var createResult = mvc.perform(post("/api/v1/events")
                        .with(csrf())
                        .cookie(cookieFor(superAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.title").value("Confidential Research Symposium"))
                .andReturn();

        String responseBody = createResult.getResponse().getContentAsString();
        long eventId = com.jayway.jsonpath.JsonPath.parse(responseBody).read("$.data.id", Long.class);

        // 2. Draft is excluded from public feeds
        mvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("Confidential Research Symposium"))));

        mvc.perform(get("/api/v1/events/upcoming"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("Confidential Research Symposium"))));

        // 3. Draft appears in super admin management queue
        mvc.perform(get("/api/v1/events/management")
                        .cookie(cookieFor(superAdmin)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Confidential Research Symposium")));

        // 4. Update the draft
        String updatePayload = """
            {
                "title": "Annual Research Symposium 2026",
                "description": "Updated event description",
                "location": "Auditorium Main",
                "startAt": "%s",
                "endAt": "%s",
                "targetType": "GLOBAL"
            }
            """.formatted(startAt, endAt);

        mvc.perform(put("/api/v1/events/" + eventId)
                        .with(csrf())
                        .cookie(cookieFor(superAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.title").value("Annual Research Symposium 2026"));

        // 5. Publish the event
        mvc.perform(post("/api/v1/events/" + eventId + "/publish")
                        .with(csrf())
                        .cookie(cookieFor(superAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));

        // 6. Now published event is visible in public feed
        mvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Annual Research Symposium 2026")));
    }
}