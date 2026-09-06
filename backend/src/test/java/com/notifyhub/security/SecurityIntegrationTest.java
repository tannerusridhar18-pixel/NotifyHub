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
    @Transactional
    void authenticatedUserReadsOwnIdentityAndStudentCannotOpenAdminEndpoint() throws Exception {
        User user = new User();
        user.setUsername("security-test-" + System.nanoTime() + "@example.edu");
        user.setEmail(user.getUsername());
        user.setPasswordHash("test-hash");
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(user);
        String token = jwt.accessToken(user);

        mvc.perform(get("/api/v1/users/me").cookie(new Cookie("NH_ACCESS", token)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/invitations").cookie(new Cookie("NH_ACCESS", token)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/academic-structure/departments").cookie(new Cookie("NH_ACCESS", token)))
            .andExpect(status().isForbidden());
    }
}
