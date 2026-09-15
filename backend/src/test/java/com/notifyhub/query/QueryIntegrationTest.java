package com.notifyhub.query;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.Role;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.security.JwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class QueryIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired QueryRepository queryRepo;
    @Autowired JwtService jwt;

    @Test
    @Transactional
    void querySubmissionAndAdminAnswerFlow() throws Exception {
        // Create student user
        String studentEmail = "student." + System.nanoTime() + "@example.edu";
        User student = new User();
        student.setUsername(studentEmail);
        student.setEmail(studentEmail);
        student.setPasswordHash("hash");
        student.setRole(Role.STUDENT);
        student.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(student);
        String studentToken = jwt.accessToken(student);

        // Create admin user
        String adminEmail = "admin." + System.nanoTime() + "@example.edu";
        User admin = new User();
        admin.setUsername(adminEmail);
        admin.setEmail(adminEmail);
        admin.setPasswordHash("hash");
        admin.setRole(Role.ADMIN);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        users.saveAndFlush(admin);
        String adminToken = jwt.accessToken(admin);

        // Student submits a query
        String queryJson = """
            {
                "name": "Alex Student",
                "email": "%s",
                "department": "Computer Science",
                "subject": "Lab schedule question",
                "message": "When will Lab 3 be open for project work?"
            }
            """.formatted(studentEmail);

        mvc.perform(post("/api/v1/queries")
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson))
                .andExpect(status().isCreated());

        // Student fetches their queries - should see 1 OPEN query with no admin answer
        mvc.perform(get("/api/v1/queries/my")
                .cookie(new Cookie("NH_ACCESS", studentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].subject").value("Lab schedule question"))
                .andExpect(jsonPath("$.data.content[0].status").value("OPEN"))
                .andExpect(jsonPath("$.data.content[0].adminResponse").doesNotExist());

        // Get query ID from repository
        CampusQuery savedQuery = queryRepo.findByEmailIgnoreCase(studentEmail, org.springframework.data.domain.PageRequest.of(0, 10)).getContent().get(0);

        // Admin answers the query
        String answerJson = """
            {
                "response": "Lab 3 is open Mon-Fri from 9am to 6pm."
            }
            """;

        mvc.perform(post("/api/v1/queries/" + savedQuery.getId() + "/answer")
                .with(csrf())
                .cookie(new Cookie("NH_ACCESS", adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(answerJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ANSWERED"))
                .andExpect(jsonPath("$.data.adminResponse").value("Lab 3 is open Mon-Fri from 9am to 6pm."));

        // Student refreshes / fetches their queries again - should see ANSWERED status and the admin response
        mvc.perform(get("/api/v1/queries/my")
                .cookie(new Cookie("NH_ACCESS", studentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].status").value("ANSWERED"))
                .andExpect(jsonPath("$.data.content[0].adminResponse").value("Lab 3 is open Mon-Fri from 9am to 6pm."));
    }
}
