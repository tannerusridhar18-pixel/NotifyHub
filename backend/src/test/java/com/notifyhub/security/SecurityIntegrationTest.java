package com.notifyhub.security;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.Role;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
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

@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;

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
}
