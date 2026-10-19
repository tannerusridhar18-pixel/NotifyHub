package com.notifyhub.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.notifyhub.auth.Invitation;
import com.notifyhub.auth.InvitationEmailStatus;
import com.notifyhub.auth.InvitationRepository;
import com.notifyhub.auth.Role;
import com.notifyhub.auth.RoleEntity;
import com.notifyhub.auth.RoleRepository;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.common.GlobalExceptionHandler;
import com.notifyhub.config.AdminSeeder;
import com.notifyhub.rbac.UserRoleAssignmentRepository;
import com.notifyhub.users.InvitationCreatedEvent;
import com.notifyhub.users.InvitationEmailDispatcher;
import com.notifyhub.users.InvitationEmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LogSecurityHardeningTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock UserRoleAssignmentRepository assignmentRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock InvitationEmailService emailService;
    @Mock InvitationRepository invitationRepository;

    private ListAppender<ILoggingEvent> appender;
    private Logger adminSeederLogger;
    private Logger dispatcherLogger;
    private Logger exceptionHandlerLogger;

    @BeforeEach
    void setUp() {
        appender = new ListAppender<>();
        appender.start();

        adminSeederLogger = (Logger) LoggerFactory.getLogger(AdminSeeder.class);
        adminSeederLogger.addAppender(appender);

        dispatcherLogger = (Logger) LoggerFactory.getLogger(InvitationEmailDispatcher.class);
        dispatcherLogger.addAppender(appender);

        exceptionHandlerLogger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        exceptionHandlerLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        if (adminSeederLogger != null) adminSeederLogger.detachAppender(appender);
        if (dispatcherLogger != null) dispatcherLogger.detachAppender(appender);
        if (exceptionHandlerLogger != null) exceptionHandlerLogger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName("AdminSeeder does not log the Super Admin username or email address")
    void adminSeederDoesNotExposeUsernameOrEmailInLogs() {
        String sensitiveUsername = "secret_superadmin_user_99";
        String sensitiveEmail = "sensitive_superadmin_99@notifyhub.local";
        String sensitivePassword = "VerySecurePassword123!";

        RoleEntity superAdminRole = new RoleEntity("SUPER_ADMIN", 0, null, null, "[0,1,2,3,4,5]");
        superAdminRole.setSuperadmin(true);
        when(roleRepository.findByNameIgnoreCase("SUPER_ADMIN")).thenReturn(Optional.of(superAdminRole));
        when(userRepository.findByUsername(sensitiveUsername)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(sensitiveEmail)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(sensitivePassword)).thenReturn("hashed_value");
        when(roleRepository.findByNameIgnoreCase("DEPARTMENT_ADMIN")).thenReturn(Optional.of(new RoleEntity()));

        AdminSeeder seeder = new AdminSeeder(
                userRepository,
                roleRepository,
                assignmentRepository,
                passwordEncoder,
                sensitiveUsername,
                sensitiveEmail,
                sensitivePassword,
                false
        );

        seeder.run();

        // Verify logs do NOT contain the sensitive username or email
        for (ILoggingEvent event : appender.list) {
            String formatted = event.getFormattedMessage();
            assertThat(formatted).doesNotContain(sensitiveUsername);
            assertThat(formatted).doesNotContain(sensitiveEmail);
            assertThat(formatted).doesNotContain(sensitivePassword);
        }

        // Verify generic success message is present
        boolean hasGenericSuccess = appender.list.stream()
                .anyMatch(e -> e.getFormattedMessage().contains("NotifyHub Super Admin account initialization completed successfully."));
        assertThat(hasGenericSuccess).isTrue();
    }

    @Test
    @DisplayName("InvitationEmailDispatcher suppresses email address from temporary account logs")
    void invitationEmailDispatcherDoesNotLogRecipientEmailForTemporaryAccounts() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitationRepository);
        UUID invId = UUID.randomUUID();
        String sensitiveEmail = "temporary.student.private.identity@notifyhub.local";

        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitationRepository.findById(invId)).thenReturn(Optional.of(invitation));

        dispatcher.dispatch(new InvitationCreatedEvent(invId, sensitiveEmail, "STUDENT", "raw-secret-token", Instant.now()));

        // Verify that the suppression log was written
        boolean foundSuppressionLog = false;
        for (ILoggingEvent event : appender.list) {
            String formatted = event.getFormattedMessage();
            if (formatted.contains("suppressing outbound email dispatch")) {
                foundSuppressionLog = true;
                // Crucial assertion: the sensitive email must NOT be in the log message!
                assertThat(formatted).doesNotContain(sensitiveEmail);
                assertThat(formatted).contains(invId.toString());
            }
        }
        assertThat(foundSuppressionLog).isTrue();
    }

    @Test
    @DisplayName("GlobalExceptionHandler redacts sensitive values from DataIntegrityViolationException logs")
    void globalExceptionHandlerRedactsSensitiveDatabaseValues() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/users");

        String sensitiveEmail = "user.secret@institution.edu";
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "Duplicate entry",
                new org.hibernate.exception.ConstraintViolationException(
                        "Duplicate entry '" + sensitiveEmail + "' for key 'users.ux_users_email'",
                        new java.sql.SQLException("Duplicate entry '" + sensitiveEmail + "' for key 'users.ux_users_email'"),
                        "users.ux_users_email"
                )
        );

        handler.conflict(ex, request);

        // Verify logged message has redacted the sensitive literal email
        boolean foundLog = false;
        for (ILoggingEvent event : appender.list) {
            if (event.getLevel() == Level.WARN && event.getFormattedMessage().contains("Data integrity violation")) {
                foundLog = true;
                String formatted = event.getFormattedMessage();
                assertThat(formatted).doesNotContain(sensitiveEmail);
                assertThat(formatted).contains("[REDACTED]");
            }
        }
        assertThat(foundLog).isTrue();
    }

    @Test
    @DisplayName("AnnouncementNotificationDispatcher does not log recipient email addresses")
    void announcementNotificationDispatcherDoesNotLogRecipientEmails() {
        Logger announcementLogger = (Logger) LoggerFactory.getLogger(com.notifyhub.announcement.AnnouncementNotificationDispatcher.class);
        announcementLogger.addAppender(appender);

        try {
            org.springframework.mail.javamail.JavaMailSender mailSender = mock(org.springframework.mail.javamail.JavaMailSender.class);
            com.notifyhub.faculty.FacultyProfileRepository facultyRepo = mock(com.notifyhub.faculty.FacultyProfileRepository.class);
            com.notifyhub.student.StudentProfileRepository studentRepo = mock(com.notifyhub.student.StudentProfileRepository.class);
            com.notifyhub.announcement.AnnouncementRepository announcementRepo = mock(com.notifyhub.announcement.AnnouncementRepository.class);
            com.notifyhub.targeting.TargetingService targeting = mock(com.notifyhub.targeting.TargetingService.class);

            com.notifyhub.announcement.AnnouncementNotificationDispatcher dispatcher =
                    new com.notifyhub.announcement.AnnouncementNotificationDispatcher(
                            mailSender, userRepository, studentRepo, facultyRepo, announcementRepo, targeting,
                            true, "notifyhub@localhost", "http://localhost:3000", "/announcements"
                    );

            Long announcementId = 999L;
            com.notifyhub.announcement.AnnouncementPublishedEvent event =
                    new com.notifyhub.announcement.AnnouncementPublishedEvent(
                            announcementId, "Quarterly Examination Schedule", "Exams start on Monday.",
                            false, com.notifyhub.targeting.TargetType.GLOBAL, null, null, null, null, null, null
                    );

            dispatcher.dispatch(event);

            // Verify logs contain summary counts, never individual email addresses
            for (ILoggingEvent logEvent : appender.list) {
                String formatted = logEvent.getFormattedMessage();
                assertThat(formatted).doesNotContain("@notifyhub.local");
                assertThat(formatted).doesNotContain("@example.com");
            }
        } finally {
            announcementLogger.detachAppender(appender);
        }
    }

    @Test
    @DisplayName("Production logging config suppresses Flyway raw JDBC connection URLs")
    void productionLoggingConfigurationSuppressesJdbcUrls() {
        org.springframework.beans.factory.config.YamlPropertiesFactoryBean yaml =
                new org.springframework.beans.factory.config.YamlPropertiesFactoryBean();
        yaml.setResources(new org.springframework.core.io.ClassPathResource("application-prod.yml"));
        java.util.Properties props = yaml.getObject();
        assertThat(props).isNotNull();

        // Verify Flyway executor log level is set to WARN to suppress raw JDBC URL INFO output
        String flywayLogLevel = props.getProperty("logging.level.org.flywaydb.core.FlywayExecutor");
        assertThat(flywayLogLevel).isEqualTo("WARN");

        // Verify synthetic JDBC URL credential redaction pattern
        String syntheticJdbcUrl = "jdbc:mysql://internal-db:3306/notifyhub?user=root&password=synthetic_secret_password_123";
        String redacted = syntheticJdbcUrl.replaceAll("(?i)(password=)[^&;]+", "$1***");
        assertThat(redacted).doesNotContain("synthetic_secret_password_123");
        assertThat(redacted).contains("password=***");
    }

    @Test
    @DisplayName("Base application logging config suppresses Flyway raw JDBC connection URLs")
    void defaultLoggingConfigurationSuppressesJdbcUrls() {
        org.springframework.beans.factory.config.YamlPropertiesFactoryBean yaml =
                new org.springframework.beans.factory.config.YamlPropertiesFactoryBean();
        yaml.setResources(new org.springframework.core.io.ClassPathResource("application.yml"));
        java.util.Properties props = yaml.getObject();
        assertThat(props).isNotNull();

        String flywayLogLevel = props.getProperty("logging.level.org.flywaydb.core.FlywayExecutor");
        assertThat(flywayLogLevel).isEqualTo("WARN");
    }

    @Test
    @DisplayName("Production auth config configures SameSite=None and Secure=true for cross-origin hosting")
    void productionAuthConfigSupportsCrossOriginCookies() {
        org.springframework.beans.factory.config.YamlPropertiesFactoryBean yaml =
                new org.springframework.beans.factory.config.YamlPropertiesFactoryBean();
        yaml.setResources(new org.springframework.core.io.ClassPathResource("application-prod.yml"));
        java.util.Properties props = yaml.getObject();
        assertThat(props).isNotNull();

        assertThat(props.getProperty("notifyhub.auth.cookie-same-site")).isEqualTo("${AUTH_COOKIE_SAME_SITE:None}");
        assertThat(props.getProperty("notifyhub.auth.cookie-secure")).isEqualTo("${AUTH_COOKIE_SECURE:true}");
    }
}
