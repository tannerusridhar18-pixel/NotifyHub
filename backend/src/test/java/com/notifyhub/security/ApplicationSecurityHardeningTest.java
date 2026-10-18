package com.notifyhub.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.academicstructure.*;
import com.notifyhub.announcement.*;
import com.notifyhub.auth.*;
import com.notifyhub.event.*;
import com.notifyhub.query.*;
import com.notifyhub.student.*;
import com.notifyhub.targeting.TargetType;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationSecurityHardeningTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepo;
    @Autowired RoleRepository roleRepo;
    @Autowired DepartmentRepository departmentRepo;
    @Autowired BranchRepository branchRepo;
    @Autowired SectionRepository sectionRepo;
    @Autowired StudentProfileRepository studentProfileRepo;
    @Autowired AnnouncementRepository announcementRepo;
    @Autowired EventRepository eventRepo;
    @Autowired EventRegistrationRepository registrationRepo;
    @Autowired QueryRepository queryRepo;
    @Autowired RefreshTokenRepository refreshTokenRepo;
    @Autowired InvitationRepository invitationRepo;
    @Autowired JwtService jwtService;
    @Autowired SecureTokenService secureTokenService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired RateLimitFilter rateLimitFilter;
    @PersistenceContext EntityManager em;

    @Value("${notifyhub.jwt-secret}")
    String jwtSecret;

    private Department deptCSE;
    private Department deptECE;
    private Branch branchCSE;
    private Section sectionCSE;

    @BeforeEach
    void setupFixtures() {
        if (rateLimitFilter != null) {
            rateLimitFilter.reset();
        }
        deptCSE = new Department();
        deptCSE.setName("Hardening CSE " + System.nanoTime());
        departmentRepo.saveAndFlush(deptCSE);

        deptECE = new Department();
        deptECE.setName("Hardening ECE " + System.nanoTime());
        departmentRepo.saveAndFlush(deptECE);

        branchCSE = new Branch();
        branchCSE.setName("CSE Branch " + System.nanoTime());
        branchCSE.setDepartment(deptCSE);
        branchCSE.setMaxYear(4);
        branchRepo.saveAndFlush(branchCSE);

        sectionCSE = new Section();
        sectionCSE.setName("Section A");
        sectionCSE.setAcademicYear(1);
        sectionCSE.setDepartment(deptCSE);
        sectionCSE.setBranch(branchCSE);
        sectionRepo.saveAndFlush(sectionCSE);
    }

    @AfterEach
    void tearDown() {
        if (rateLimitFilter != null) {
            rateLimitFilter.reset();
        }
    }

    private User createUser(String roleName, Role roleEnum, Department dept) {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        User u = new User();
        u.setUsername(roleName.toLowerCase() + "." + unique + "@hardening.local");
        u.setEmail(u.getUsername());
        u.setPasswordHash(passwordEncoder.encode("Test@12345"));
        u.setRole(roleEnum);
        RoleEntity re = roleRepo.findByNameIgnoreCase(roleName).orElse(null);
        u.setRoleEntity(re);
        u.setDepartmentEntity(dept);
        u.setAccountStatus(AccountStatus.ACTIVE);
        return userRepo.saveAndFlush(u);
    }

    private Cookie accessCookie(User u) {
        return new Cookie("NH_ACCESS", jwtService.accessToken(u));
    }

    // ==========================================
    // Task A: Authentication & Session Enforcement
    // ==========================================

    @Test
    void taskA_noTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Authentication required."));
    }

    @Test
    void taskA_malformedTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/users/me").cookie(new Cookie("NH_ACCESS", "invalid.malformed.jwt")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void taskA_tamperedSignatureReturns401() throws Exception {
        User u = createUser("STUDENT", Role.STUDENT, deptCSE);
        String validToken = jwtService.accessToken(u);
        String tampered = validToken.substring(0, validToken.lastIndexOf('.') + 1) + "InVaLiDsIgNaTuRe1234567890";

        mvc.perform(get("/api/v1/users/me").cookie(new Cookie("NH_ACCESS", tampered)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void taskA_expiredTokenReturns401() throws Exception {
        User u = createUser("STUDENT", Role.STUDENT, deptCSE);
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        byte[] secretBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        String expiredToken = Jwts.builder()
                .subject(u.getUsername())
                .claim("uid", u.getId())
                .claim("role", u.getEffectiveRoleName())
                .claim("roleLevel", u.getEffectiveLevel())
                .issuedAt(Date.from(past.minus(15, ChronoUnit.MINUTES)))
                .expiration(Date.from(past))
                .signWith(Keys.hmacShaKeyFor(secretBytes))
                .compact();

        mvc.perform(get("/api/v1/users/me").cookie(new Cookie("NH_ACCESS", expiredToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Transactional
    void taskA_revokedSessionCannotRefresh() throws Exception {
        User u = createUser("STUDENT", Role.STUDENT, deptCSE);
        String rawRefresh = secureTokenService.rawToken();
        RefreshToken rt = new RefreshToken();
        rt.setUser(u);
        rt.setTokenHash(secureTokenService.hash(rawRefresh));
        rt.setFamilyId(UUID.randomUUID());
        rt.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        rt.setRevoked(true); // Revoked session
        rt.setRevokedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        refreshTokenRepo.saveAndFlush(rt);

        mvc.perform(post("/api/v1/auth/refresh")
                .cookie(new Cookie("NH_REFRESH", rawRefresh)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("Invalid refresh token."));
    }

    @Test
    @Transactional
    void taskA_inactiveAccountRejectsLoginAndExistingToken() throws Exception {
        User u = createUser("STUDENT", Role.STUDENT, deptCSE);
        u.setAccountStatus(AccountStatus.INACTIVE);
        u.setActive(false);
        userRepo.saveAndFlush(u);

        // Login fails with 403 Forbidden
        String loginBody = """
            {"email":"%s","password":"Test@12345"}
            """.formatted(u.getEmail());
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Account inactive."));

        // Existing token on protected endpoint fails with 401
        String token = jwtService.accessToken(u);
        mvc.perform(get("/api/v1/users/me").cookie(new Cookie("NH_ACCESS", token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void taskA_directApiAccessToAdminRoutesForbiddenForStudent() throws Exception {
        User student = createUser("STUDENT", Role.STUDENT, deptCSE);
        Cookie cookie = accessCookie(student);

        mvc.perform(get("/api/v1/admin/users").cookie(cookie)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/roles").cookie(cookie)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/invitations").cookie(cookie)).andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void taskA_repeatedLoginFailuresLockoutBehavior() throws Exception {
        User u = createUser("STUDENT", Role.STUDENT, deptCSE);
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);
        userRepo.saveAndFlush(u);

        String badLogin = """
            {"email":"%s","password":"WrongPassword123"}
            """.formatted(u.getEmail());

        // 5 consecutive failed attempts
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(badLogin))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt returns 429 Too Many Requests
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(badLogin))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many attempts. Try again later."));
    }

    // ==========================================
    // Task B: Role-based Authorization
    // ==========================================

    @Test
    @Transactional
    void taskB_insufficientPermissionsOnPrivilegedOperations() throws Exception {
        User student = createUser("STUDENT", Role.STUDENT, deptCSE);
        User faculty = createUser("FACULTY", Role.FACULTY, deptCSE);
        User deptAdmin = createUser("DEPARTMENT_ADMIN", Role.DEPARTMENT_ADMIN, deptCSE);

        // Student cannot create announcement
        String annReq = """
            {"title":"Test","content":"Content","urgent":false,"targetType":"GLOBAL"}
            """;
        mvc.perform(post("/api/v1/announcements")
                .with(csrf()).cookie(accessCookie(student))
                .contentType(MediaType.APPLICATION_JSON).content(annReq))
                .andExpect(status().isForbidden());

        // Student cannot create event
        String evReq = """
            {"title":"Test","description":"Desc","location":"Hall","startAt":"2026-11-01T10:00:00Z","endAt":"2026-11-01T12:00:00Z","targetType":"GLOBAL"}
            """;
        mvc.perform(post("/api/v1/events")
                .with(csrf()).cookie(accessCookie(student))
                .contentType(MediaType.APPLICATION_JSON).content(evReq))
                .andExpect(status().isForbidden());

        // Faculty cannot batch promote
        String promoteReq = """
            {"departmentId":%d,"fromYear":1,"toYear":2}
            """.formatted(deptCSE.getId());
        mvc.perform(post("/api/v1/admin/students/batch-promote")
                .with(csrf()).cookie(accessCookie(faculty))
                .contentType(MediaType.APPLICATION_JSON).content(promoteReq))
                .andExpect(status().isForbidden());

        // DeptAdmin cannot access global roles management
        mvc.perform(get("/api/v1/admin/roles").cookie(accessCookie(deptAdmin)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void taskB_privilegeEscalation_adminCannotPromoteToSuperAdmin() throws Exception {
        User admin = createUser("ADMIN", Role.ADMIN, null);
        User student = createUser("STUDENT", Role.STUDENT, deptCSE);

        String updateReq = """
            {"role":"SUPER_ADMIN"}
            """;
        mvc.perform(put("/api/v1/admin/users/" + student.getPublicId())
                .with(csrf()).cookie(accessCookie(admin))
                .contentType(MediaType.APPLICATION_JSON).content(updateReq))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only a Super Admin can manage Super Admin accounts."));
    }

    @Test
    @Transactional
    @DisplayName("Defect Reproduction 1: Student and unauthorized faculty cannot answer queries")
    void taskB_defectReproduction1_studentCannotAnswerQuery() throws Exception {
        User studentAsker = createUser("STUDENT", Role.STUDENT, deptCSE);
        User studentAttacker = createUser("STUDENT", Role.STUDENT, deptCSE);
        User unauthorizedFaculty = createUser("FACULTY", Role.FACULTY, deptCSE);

        // Create query in deptCSE
        CampusQuery q = new CampusQuery();
        q.setAsker(studentAsker);
        q.setName(studentAsker.getUsername());
        q.setEmail(studentAsker.getEmail());
        q.setDepartment("Hardening CSE");
        q.setDepartmentEntity(deptCSE);
        q.setSubject("Lab equipment question");
        q.setMessage("Where is oscilloscope 4?");
        q.setStatus(QueryStatus.OPEN);
        q.setTargetType("DEPARTMENT_ADMIN");
        q = queryRepo.saveAndFlush(q);

        String answerBody = """
            {"response":"Forged student answer."}
            """;

        // Student attacker in the same department MUST receive 403 Forbidden
        mvc.perform(post("/api/v1/queries/" + q.getId() + "/answer")
                .with(csrf()).cookie(accessCookie(studentAttacker))
                .contentType(MediaType.APPLICATION_JSON)
                .content(answerBody))
                .andExpect(status().isForbidden());

        // Unauthorized faculty in the same department MUST receive 403 Forbidden
        mvc.perform(post("/api/v1/queries/" + q.getId() + "/answer")
                .with(csrf()).cookie(accessCookie(unauthorizedFaculty))
                .contentType(MediaType.APPLICATION_JSON)
                .content(answerBody))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    @DisplayName("Defect Reproduction 4: System role ADMIN cannot be deleted via RoleService")
    void taskB_defectReproduction4_adminSystemRoleCannotBeDeleted() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        RoleEntity adminRole = roleRepo.findByNameIgnoreCase("ADMIN").orElseThrow();

        mvc.perform(delete("/api/v1/admin/roles/" + adminRole.getId())
                .with(csrf()).cookie(accessCookie(superAdmin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("System roles cannot be deleted.")));
    }

    // ==========================================
    // Task C: Data Isolation & Database Access
    // ==========================================

    @Test
    @Transactional
    void taskC_crossDepartmentQueryAnsweringForbidden() throws Exception {
        User deptAdminCSE = createUser("DEPARTMENT_ADMIN", Role.DEPARTMENT_ADMIN, deptCSE);
        User deptAdminECE = createUser("DEPARTMENT_ADMIN", Role.DEPARTMENT_ADMIN, deptECE);
        User studentCSE = createUser("STUDENT", Role.STUDENT, deptCSE);

        CampusQuery q = new CampusQuery();
        q.setAsker(studentCSE);
        q.setName(studentCSE.getUsername());
        q.setEmail(studentCSE.getEmail());
        q.setDepartment(deptCSE.getName());
        q.setDepartmentEntity(deptCSE);
        q.setSubject("Question for CSE");
        q.setMessage("Help needed");
        q.setStatus(QueryStatus.OPEN);
        q.setTargetType("DEPARTMENT_ADMIN");
        q = queryRepo.saveAndFlush(q);

        String answerBody = """
            {"response":"Response from ECE"}
            """;

        // ECE Department Admin cannot answer CSE query
        mvc.perform(post("/api/v1/queries/" + q.getId() + "/answer")
                .with(csrf()).cookie(accessCookie(deptAdminECE))
                .contentType(MediaType.APPLICATION_JSON)
                .content(answerBody))
                .andExpect(status().isForbidden());

        // CSE Department Admin can answer CSE query
        String cseAnswerBody = """
            {"response":"Valid response from CSE"}
            """;
        mvc.perform(post("/api/v1/queries/" + q.getId() + "/answer")
                .with(csrf()).cookie(accessCookie(deptAdminCSE))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cseAnswerBody))
                .andExpect(status().isOk());
    }

    @Test
    @Transactional
    void taskC_crossDepartmentBatchPromoteForbidden() throws Exception {
        User deptAdminECE = createUser("DEPARTMENT_ADMIN", Role.DEPARTMENT_ADMIN, deptECE);

        String promoteReq = """
            {"departmentId":%d,"fromYear":1,"toYear":2}
            """.formatted(deptCSE.getId());

        mvc.perform(post("/api/v1/admin/students/batch-promote")
                .with(csrf()).cookie(accessCookie(deptAdminECE))
                .contentType(MediaType.APPLICATION_JSON).content(promoteReq))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    @DisplayName("Defect Reproduction 3: Faculty cannot list users and HOD is department-scoped")
    void taskC_defectReproduction3_facultyCannotListUsersAndHodIsScoped() throws Exception {
        User faculty = createUser("FACULTY", Role.FACULTY, deptCSE);
        User hodCSE = createUser("HOD", Role.HOD, deptCSE);

        // Faculty calling /api/v1/users must receive 403 Forbidden
        mvc.perform(get("/api/v1/users").cookie(accessCookie(faculty)))
                .andExpect(status().isForbidden());

        // HOD calling /api/v1/users must only see users in their own department (deptCSE)
        MvcResult res = mvc.perform(get("/api/v1/users").cookie(accessCookie(hodCSE)))
                .andExpect(status().isOk())
                .andReturn();

        String body = res.getResponse().getContentAsString();
        // Should not contain ECE users or outside department entities
        assertThat(body).doesNotContain("Hardening ECE");
    }

    // ==========================================
    // Task D: Attachment & File Security
    // ==========================================

    @Test
    @Transactional
    @DisplayName("Defect Reproduction 2: Event photoUrl and externalLink must reject unsafe schemes")
    void taskD_defectReproduction2_eventRejectsJavascriptAndUnsafeUrls() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);

        // 1. javascript: scheme in externalLink
        String jsReq = """
            {
                "title": "Hackathon 2026",
                "description": "Annual Event",
                "location": "Auditorium",
                "startAt": "2026-11-01T10:00:00Z",
                "endAt": "2026-11-01T12:00:00Z",
                "targetType": "GLOBAL",
                "externalLink": "javascript:alert(document.cookie)"
            }
            """;
        mvc.perform(post("/api/v1/events")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON).content(jsReq))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("External link")));

        // 2. data: scheme in photoUrl
        String dataReq = """
            {
                "title": "Hackathon 2026",
                "description": "Annual Event",
                "location": "Auditorium",
                "startAt": "2026-11-01T10:00:00Z",
                "endAt": "2026-11-01T12:00:00Z",
                "targetType": "GLOBAL",
                "photoUrl": "data:text/html,<script>alert(1)</script>"
            }
            """;
        mvc.perform(post("/api/v1/events")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON).content(dataReq))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Photo URL")));

        // 3. Valid URLs are accepted
        String validReq = """
            {
                "title": "Hackathon 2026",
                "description": "Annual Event",
                "location": "Auditorium",
                "startAt": "2026-11-01T10:00:00Z",
                "endAt": "2026-11-01T12:00:00Z",
                "targetType": "GLOBAL",
                "photoUrl": "https://example.com/banner.png",
                "externalLink": "https://example.com/register"
            }
            """;
        mvc.perform(post("/api/v1/events")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON).content(validReq))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.photoUrl").value("https://example.com/banner.png"))
                .andExpect(jsonPath("$.data.externalLink").value("https://example.com/register"));
    }

    @Test
    @Transactional
    void taskD_announcementAttachmentUrlRejectsUnsafeSchemes() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);

        String annReq = """
            {
                "title": "Exam Notice",
                "content": "Notice details",
                "urgent": false,
                "targetType": "GLOBAL",
                "attachmentUrl": "javascript:alert(1)",
                "attachmentName": "Notice.pdf"
            }
            """;
        mvc.perform(post("/api/v1/announcements")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON).content(annReq))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Attachment URL scheme")));
    }

    @Test
    @Transactional
    void taskD_csvExportSanitizationAndHeaders() throws Exception {
        User admin = createUser("ADMIN", Role.ADMIN, deptCSE);
        User student = createUser("STUDENT", Role.STUDENT, deptCSE);

        // Create student profile with potential formula injection in name
        StudentProfile sp = new StudentProfile();
        sp.setUser(student);
        sp.setStudentId("STU-101");
        sp.setName("=cmd|' /C calc'!A0");
        sp.setDepartment(deptCSE);
        sp.setBranch(branchCSE);
        sp.setSection(sectionCSE);
        sp.setYear(1);
        sp.setSemester(1);
        studentProfileRepo.saveAndFlush(sp);

        Event ev = new Event();
        ev.setTitle("Tech Symposium");
        ev.setDescription("Tech Event");
        ev.setLocation("Main Hall");
        ev.setStartAt(Instant.now().plus(1, ChronoUnit.DAYS));
        ev.setEndAt(Instant.now().plus(2, ChronoUnit.DAYS));
        ev.setStatus(EventStatus.PUBLISHED);
        ev.setTargetType(TargetType.GLOBAL);
        ev.setRegistrationEnabled(true);
        ev.setCreatedBy(admin);
        ev = eventRepo.saveAndFlush(ev);

        EventRegistration reg = new EventRegistration();
        reg.setEvent(ev);
        reg.setStudent(student);
        registrationRepo.saveAndFlush(reg);

        MvcResult result = mvc.perform(get("/api/v1/events/" + ev.getId() + "/registrations/export")
                .cookie(accessCookie(admin)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=event-" + ev.getId() + "-registrations.csv"))
                .andReturn();

        String csvContent = result.getResponse().getContentAsString();
        // Verify formula prefix was prepended with single quote to prevent spreadsheet code execution
        assertThat(csvContent).contains("'=cmd|' /C calc'!A0");
    }

    // ==========================================
    // Task E: Negative & Adversarial Testing
    // ==========================================

    @Test
    void taskE_malformedJsonReturnsSanitized400() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        mvc.perform(post("/api/v1/announcements")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{malformed json:::"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Malformed request."));
    }

    @Test
    void taskE_invalidNumericParameterReturnsSanitized400() throws Exception {
        User admin = createUser("ADMIN", Role.ADMIN, deptCSE);
        mvc.perform(get("/api/v1/events/not-a-number").cookie(accessCookie(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid request parameter."));
    }

    @Test
    void taskE_nonExistentIdentifierReturns404() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        mvc.perform(get("/api/v1/events/99999999").cookie(accessCookie(superAdmin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Event not found."));
    }

    @Test
    @Transactional
    void taskE_duplicateEventRegistrationReturns409() throws Exception {
        User admin = createUser("ADMIN", Role.ADMIN, deptCSE);
        User student = createUser("STUDENT", Role.STUDENT, deptCSE);

        Event ev = new Event();
        ev.setTitle("Coding Sprint");
        ev.setDescription("Coding Sprint Description");
        ev.setLocation("Lab 1");
        ev.setStartAt(Instant.now().plus(1, ChronoUnit.DAYS));
        ev.setEndAt(Instant.now().plus(2, ChronoUnit.DAYS));
        ev.setStatus(EventStatus.PUBLISHED);
        ev.setTargetType(TargetType.GLOBAL);
        ev.setRegistrationEnabled(true);
        ev.setCreatedBy(admin);
        ev = eventRepo.saveAndFlush(ev);

        // 1st registration -> 201 Created
        mvc.perform(post("/api/v1/events/" + ev.getId() + "/register")
                .with(csrf()).cookie(accessCookie(student)))
                .andExpect(status().isCreated());

        // 2nd registration (duplicate submit) -> 409 Conflict
        mvc.perform(post("/api/v1/events/" + ev.getId() + "/register")
                .with(csrf()).cookie(accessCookie(student)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You are already registered."));
    }

    @Test
    void taskB_unsupportedContentTypeReturnsSanitized415() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        mvc.perform(post("/api/v1/announcements")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_XML)
                .content("<announcement><title>Test</title></announcement>"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void taskB_missingRequiredFieldsReturns400WithFieldErrors() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        mvc.perform(post("/api/v1/admin/users")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    @Transactional
    void taskB_transactionRollbackOnFailedInvitationCreation() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        long initialUserCount = userRepo.count();

        // An invalid role ID causes create() to throw 400 Bad Request
        String badReq = """
            {
                "email": "tx-fail-%d@notifyhub.local",
                "roleId": 9999999
            }
            """.formatted(System.nanoTime());

        mvc.perform(post("/api/v1/admin/invitations")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(badReq))
                .andExpect(status().isBadRequest());

        // Verify atomic rollback: no orphaned User was persisted
        long finalUserCount = userRepo.count();
        assertThat(finalUserCount).isEqualTo(initialUserCount);
    }

    @Test
    @Transactional
    @DisplayName("Eight-role privilege boundaries: academic-structure mutations and global user management")
    void taskB_sevenRolesPrivilegeBoundaryMatrix() throws Exception {
        User superAdmin = createUser("SUPER_ADMIN", Role.SUPER_ADMIN, null);
        User admin = createUser("ADMIN", Role.ADMIN, deptCSE);
        User principal = createUser("PRINCIPAL", Role.PRINCIPAL, null);
        User dean = createUser("DEAN", Role.DEAN, null);
        User hod = createUser("HOD", Role.HOD, deptCSE);
        User deptAdmin = createUser("DEPARTMENT_ADMIN", Role.DEPARTMENT_ADMIN, deptCSE);
        User faculty = createUser("FACULTY", Role.FACULTY, deptCSE);
        User student = createUser("STUDENT", Role.STUDENT, deptCSE);

        // 1. Academic structure mutation: only SUPER_ADMIN and ADMIN are permitted, other 6 roles MUST be 403 Forbidden
        String newDeptReq1 = """
            {"name":"Matrix Dept SA %d"}
            """.formatted(System.nanoTime());

        mvc.perform(post("/api/v1/academic-structure/departments")
                .with(csrf()).cookie(accessCookie(superAdmin))
                .contentType(MediaType.APPLICATION_JSON).content(newDeptReq1))
                .andExpect(status().isCreated());

        String newDeptReq2 = """
            {"name":"Matrix Dept Admin %d"}
            """.formatted(System.nanoTime());

        mvc.perform(post("/api/v1/academic-structure/departments")
                .with(csrf()).cookie(accessCookie(admin))
                .contentType(MediaType.APPLICATION_JSON).content(newDeptReq2))
                .andExpect(status().isCreated());

        List<User> restrictedRoles = List.of(principal, dean, hod, deptAdmin, faculty, student);
        for (User u : restrictedRoles) {
            mvc.perform(post("/api/v1/academic-structure/departments")
                    .with(csrf()).cookie(accessCookie(u))
                    .contentType(MediaType.APPLICATION_JSON).content(newDeptReq1))
                    .andExpect(status().isForbidden());
        }

        // 2. Global user directory access: SUPER_ADMIN and ADMIN are permitted, all other 6 roles MUST be 403 Forbidden
        mvc.perform(get("/api/v1/admin/users").cookie(accessCookie(superAdmin)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/admin/users").cookie(accessCookie(admin)))
                .andExpect(status().isOk());

        for (User u : restrictedRoles) {
            mvc.perform(get("/api/v1/admin/users").cookie(accessCookie(u)))
                    .andExpect(status().isForbidden());
        }
    }
}
