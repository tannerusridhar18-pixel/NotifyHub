package com.notifyhub.security;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.Role;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.auth.RefreshToken;
import com.notifyhub.auth.RefreshTokenRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.time.Instant;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired SecureTokenService secureTokens;

    @Test
    void protectedCurrentUserEndpointRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpointRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/admin/invitations")).andExpect(status().isUnauthorized());
    }

    @Test
    void anonymousStateChangingRequestWithoutCsrfIsUnauthorized() throws Exception {
        mvc.perform(post("/api/v1/admin/invitations").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void authenticatedStateChangingRequestWithoutCsrfRemainsForbidden() throws Exception {
        User user = new User();
        user.setUsername("csrf-test-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash("test-hash");
        user.setRole(Role.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(user);
        String token = jwt.accessToken(user);

        mvc.perform(post("/api/v1/admin/invitations").cookie(new Cookie("NH_ACCESS", token))
                        .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void unknownAuthenticatedRouteReturnsNotFound() throws Exception {
        User user = new User();
        user.setUsername("not-found-test-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash("test-hash");
        user.setRole(Role.ADMIN);
        user.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(user);
        String token = jwt.accessToken(user);

        mvc.perform(get("/api/v1/no-such-endpoint").cookie(new Cookie("NH_ACCESS", token)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void adminCanAccessAdminEndpointsAndStudentReceivesForbidden() throws Exception {
        User admin = new User();
        admin.setUsername("admin-test-" + System.nanoTime() + "@example.edu");
        admin.setEmail(admin.getUsername());
        admin.setPasswordHash("test-hash");
        admin.setRole(Role.ADMIN);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(admin);
        String adminToken = jwt.accessToken(admin);

        mvc.perform(get("/api/v1/admin/roles").cookie(new Cookie("NH_ACCESS", adminToken)))
                .andExpect(status().isOk());

        User student = new User();
        student.setUsername("student-test-" + System.nanoTime() + "@example.edu");
        student.setEmail(student.getUsername());
        student.setPasswordHash("test-hash");
        student.setRole(Role.STUDENT);
        student.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(student);
        String studentToken = jwt.accessToken(student);

        mvc.perform(get("/api/v1/admin/roles").cookie(new Cookie("NH_ACCESS", studentToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void departmentAdminCannotReachGlobalAdminEndpoints() throws Exception {
        User admin = new User();
        admin.setUsername("dept-admin-security-" + System.nanoTime() + "@example.edu");
        admin.setEmail(admin.getUsername());
        admin.setPasswordHash("test-hash");
        admin.setRole(Role.DEPARTMENT_ADMIN);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(admin);
        String token = jwt.accessToken(admin);
        Cookie cookie = new Cookie("NH_ACCESS", token);

        mvc.perform(get("/api/v1/admin/roles").cookie(cookie)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/users").cookie(cookie)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/audit").cookie(cookie)).andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void studentAndFacultyCannotReachAdminEndpoints() throws Exception {
        for (Role role : new Role[]{Role.STUDENT, Role.FACULTY}) {
            User user = new User();
            user.setUsername(role.name().toLowerCase() + "-security-" + System.nanoTime() + "@example.edu");
            user.setEmail(user.getUsername());
            user.setPasswordHash("test-hash");
            user.setRole(role);
            user.setAccountStatus(AccountStatus.ACTIVE);
            users.saveAndFlush(user);
            mvc.perform(get("/api/v1/admin/invitations").cookie(new Cookie("NH_ACCESS", jwt.accessToken(user))))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @Transactional
    void deactivatedStudentTokensStopWorking() throws Exception {
        User student = new User();
        student.setUsername("deactivated-student-" + System.nanoTime() + "@example.edu");
        student.setEmail(student.getUsername());
        student.setPasswordHash("test-hash");
        student.setRole(Role.STUDENT);
        student.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(student);
        String access = jwt.accessToken(student);
        String rawRefresh = secureTokens.rawToken();
        RefreshToken refresh = new RefreshToken();
        refresh.setUser(student);
        refresh.setTokenHash(secureTokens.hash(rawRefresh));
        refresh.setFamilyId(UUID.randomUUID());
        refresh.setExpiresAt(Instant.now().plusSeconds(3600));
        refreshTokens.saveAndFlush(refresh);

        student.setAccountStatus(AccountStatus.INACTIVE);
        users.saveAndFlush(student);

        mvc.perform(get("/api/v1/users/me").cookie(new Cookie("NH_ACCESS", access)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("NH_REFRESH", rawRefresh)))
                .andExpect(status().isUnauthorized());
    }
}
