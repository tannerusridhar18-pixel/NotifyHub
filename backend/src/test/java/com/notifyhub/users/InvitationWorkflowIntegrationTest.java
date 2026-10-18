package com.notifyhub.users;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.academicstructure.Department;
import com.notifyhub.academicstructure.DepartmentRepository;
import com.notifyhub.auth.*;
import com.notifyhub.security.JwtService;
import com.notifyhub.security.SecureTokenService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InvitationWorkflowIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired InvitationRepository invitations;
    @Autowired DepartmentRepository departments;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder encoder;
    @Autowired SecureTokenService secureTokens;
    @Autowired ObjectMapper mapper;

    @MockitoBean
    JavaMailSender mailSender;

    private User superAdmin;
    private Department dept1;
    private Department dept2;

    @BeforeEach
    void setUp() {
        superAdmin = users.findByUsername("admin").orElseGet(() -> {
            User u = new User();
            u.setUsername("admin");
            u.setEmail("admin@notifyhub.local");
            u.setPasswordHash(encoder.encode("admin@123"));
            u.setRole(Role.SUPER_ADMIN);
            u.setAccountStatus(AccountStatus.ACTIVE);
            return users.saveAndFlush(u);
        });

        dept1 = departments.findAll().stream()
                .filter(d -> "Computer Science".equalsIgnoreCase(d.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setName("Computer Science");
                    return departments.saveAndFlush(d);
                });

        dept2 = departments.findAll().stream()
                .filter(d -> "Mechanical Engineering".equalsIgnoreCase(d.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setName("Mechanical Engineering");
                    return departments.saveAndFlush(d);
                });
    }

    private Cookie cookieFor(User user) {
        return new Cookie("NH_ACCESS", jwt.accessToken(user));
    }

    @Test
    void completeInvitationWorkflowLifecycle() throws Exception {
        String testEmail = "lifecycle.student." + System.nanoTime() + "@example.edu";

        // 1. Super Admin invites new student
        String invitePayload = """
                {
                    "email": "%s",
                    "role": "STUDENT"
                }
                """.formatted(testEmail);

        MvcResult createResult = mvc.perform(post("/api/v1/admin/invitations")
                        .with(csrf())
                        .cookie(cookieFor(superAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invitePayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(testEmail))
                .andExpect(jsonPath("$.data.emailStatus").value("PENDING"))
                .andReturn();

        JsonNode rootNode = mapper.readTree(createResult.getResponse().getContentAsString());
        String invitationId = rootNode.path("data").path("invitationId").asText();
        assertThat(invitationId).isNotBlank();

        // Verify database persistence
        User invitedUser = users.findByEmailIgnoreCase(testEmail).orElseThrow();
        assertThat(invitedUser.getAccountStatus()).isEqualTo(AccountStatus.INVITED);
        assertThat(invitedUser.isMustChangePassword()).isTrue();

        UUID invId = UUID.fromString(invitationId);
        Invitation inv = invitations.findById(invId).orElseThrow();
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(inv.getUser().getId()).isEqualTo(invitedUser.getId());

        // 2. Duplicate invitation for the same email must be rejected with 409 Conflict
        mvc.perform(post("/api/v1/admin/invitations")
                        .with(csrf())
                        .cookie(cookieFor(superAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invitePayload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("An account already exists for this email."));

        // 3. Resend the invitation
        MvcResult resendResult = mvc.perform(post("/api/v1/admin/invitations/" + invitationId + "/resend")
                        .with(csrf())
                        .cookie(cookieFor(superAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.emailStatus").value("PENDING"))
                .andReturn();

        // 4. Test Token Validation and Single-use Activation
        // Set a known token hash on the invitation for acceptance testing
        String testToken = "valid-raw-secret-token-" + UUID.randomUUID();
        inv.setTokenHash(secureTokens.hash(testToken));
        invitations.saveAndFlush(inv);

        // Invalid token should fail with 400 Bad Request
        String invalidRegisterPayload = """
                {
                    "invitationToken": "wrong-token-12345",
                    "password": "ValidPassword@123",
                    "confirmPassword": "ValidPassword@123"
                }
                """;
        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRegisterPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid invitation."));

        // Valid registration completes account activation
        String validRegisterPayload = """
                {
                    "invitationToken": "%s",
                    "password": "NewSecretPassword@123",
                    "confirmPassword": "NewSecretPassword@123"
                }
                """.formatted(testToken);

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRegisterPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(testEmail));

        // Verify account is now ACTIVE and invitation is USED
        User activatedUser = users.findByEmailIgnoreCase(testEmail).orElseThrow();
        assertThat(activatedUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(activatedUser.isMustChangePassword()).isFalse();

        Invitation usedInv = invitations.findById(invId).orElseThrow();
        assertThat(usedInv.getStatus()).isEqualTo(InvitationStatus.USED);
        assertThat(usedInv.getUsedAt()).isNotNull();

        // Single-use enforcement: Attempting to register again with same token must fail
        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRegisterPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid invitation."));

        // Resending on an already accepted invitation must be rejected with 409 Conflict
        mvc.perform(post("/api/v1/admin/invitations/" + invitationId + "/resend")
                        .with(csrf())
                        .cookie(cookieFor(superAdmin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Invitation has already been accepted and activated."));

        // 5. Subsequent Login Verification
        // Wrong password must fail with 401
        String wrongLogin = """
                {
                    "email": "%s",
                    "password": "WrongPassword@123"
                }
                """.formatted(testEmail);
        mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(wrongLogin))
                .andExpect(status().isUnauthorized());

        // Correct password succeeds and issues session cookies
        String correctLogin = """
                {
                    "email": "%s",
                    "password": "NewSecretPassword@123"
                }
                """.formatted(testEmail);
        MvcResult loginResult = mvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(correctLogin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("STUDENT"))
                .andReturn();

        Cookie accessCookie = loginResult.getResponse().getCookie("NH_ACCESS");
        assertThat(accessCookie).isNotNull();
        assertThat(accessCookie.getValue()).isNotBlank();

        // User can access their profile with this cookie
        mvc.perform(get("/api/v1/users/me")
                        .cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(testEmail));
    }

    @Test
    void departmentAdminCannotInviteOutsideTheirDepartment() throws Exception {
        User deptAdmin = new User();
        deptAdmin.setUsername("deptadmin." + System.nanoTime() + "@example.edu");
        deptAdmin.setEmail(deptAdmin.getUsername());
        deptAdmin.setPasswordHash(encoder.encode("password@123"));
        deptAdmin.setRole(Role.DEPARTMENT_ADMIN);
        deptAdmin.setDepartmentEntity(dept1);
        deptAdmin.setAccountStatus(AccountStatus.ACTIVE);
        deptAdmin = users.saveAndFlush(deptAdmin);

        String otherDeptEmail = "otherdept." + System.nanoTime() + "@example.edu";
        String invitePayload = """
                {
                    "email": "%s",
                    "role": "STUDENT",
                    "departmentId": %d
                }
                """.formatted(otherDeptEmail, dept2.getId());

        // Inviting into another department must be rejected with 403 Forbidden
        mvc.perform(post("/api/v1/admin/invitations")
                        .with(csrf())
                        .cookie(cookieFor(deptAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invitePayload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Department admins may invite users only into their own department."));
    }

    @Test
    void expiredInvitationTokenIsRejected() throws Exception {
        String expiredEmail = "expired." + System.nanoTime() + "@example.edu";
        User user = new User();
        user.setUsername(expiredEmail);
        user.setEmail(expiredEmail);
        user.setPasswordHash(encoder.encode("dummy"));
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.INVITED);
        user = users.saveAndFlush(user);

        String rawToken = "expired-token-" + UUID.randomUUID();
        Invitation expiredInv = new Invitation();
        expiredInv.setUser(user);
        expiredInv.setCreatedBy(superAdmin);
        expiredInv.setTokenHash(secureTokens.hash(rawToken));
        expiredInv.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS)); // expired 1 hour ago
        expiredInv.setStatus(InvitationStatus.PENDING);
        invitations.saveAndFlush(expiredInv);

        String payload = """
                {
                    "invitationToken": "%s",
                    "password": "ValidPassword@123",
                    "confirmPassword": "ValidPassword@123"
                }
                """.formatted(rawToken);

        mvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid invitation."));
    }

    @Test
    void unauthorizedRoleCannotAccessAdminInvitations() throws Exception {
        User student = new User();
        student.setUsername("unauthorized." + System.nanoTime() + "@example.edu");
        student.setEmail(student.getUsername());
        student.setPasswordHash(encoder.encode("pass"));
        student.setRole(Role.STUDENT);
        student.setAccountStatus(AccountStatus.ACTIVE);
        student = users.saveAndFlush(student);

        mvc.perform(get("/api/v1/admin/invitations")
                        .cookie(cookieFor(student)))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/admin/invitations")
                        .with(csrf())
                        .cookie(cookieFor(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"hacker@example.edu\",\"role\":\"STUDENT\"}"))
                .andExpect(status().isForbidden());
    }
}
