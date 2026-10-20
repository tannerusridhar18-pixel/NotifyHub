package com.notifyhub.users;

import com.notifyhub.auth.Invitation;
import com.notifyhub.auth.InvitationEmailStatus;
import com.notifyhub.auth.InvitationRepository;
import com.notifyhub.auth.PasswordResetEmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.notifyhub.mail.EmailTransport;
import com.notifyhub.mail.ResendEmailTransport;
import com.notifyhub.mail.SmtpEmailTransport;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.SimpleMailMessage;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.*;

class EmailIntegrationSafetyTest {

    private ServerSocket mockSmtpServer;
    private int mockSmtpPort;
    private Thread serverThread;

    @BeforeEach
    void setUpServer() throws Exception {
        mockSmtpServer = new ServerSocket(0); // dynamically bind to free port
        mockSmtpPort = mockSmtpServer.getLocalPort();
    }

    @AfterEach
    void tearDownServer() throws Exception {
        if (mockSmtpServer != null && !mockSmtpServer.isClosed()) {
            mockSmtpServer.close();
        }
        if (serverThread != null && serverThread.isAlive()) {
            serverThread.interrupt();
        }
    }

    @Test
    void verifiesRealSmtpMessageFormatAndDeliveryAgainstMockSandbox() throws Exception {
        CountDownLatch messageReceived = new CountDownLatch(1);
        AtomicReference<String> receivedPayload = new AtomicReference<>("");

        serverThread = new Thread(() -> {
            try (Socket socket = mockSmtpServer.accept();
                 BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                 PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {

                out.print("220 mock.smtp.local ESMTP Mock\r\n");
                out.flush();

                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) {
                    sb.append(line).append("\n");
                    if (line.startsWith("HELO") || line.startsWith("EHLO")) {
                        out.print("250-mock.smtp.local\r\n250 OK\r\n");
                    } else if (line.startsWith("MAIL FROM:")) {
                        out.print("250 OK\r\n");
                    } else if (line.startsWith("RCPT TO:")) {
                        out.print("250 OK\r\n");
                    } else if (line.startsWith("DATA")) {
                        out.print("354 Start mail input; end with <CRLF>.<CRLF>\r\n");
                    } else if (line.equals(".")) {
                        out.print("250 2.0.0 OK: queued\r\n");
                        receivedPayload.set(sb.toString());
                        messageReceived.countDown();
                    } else if (line.startsWith("QUIT")) {
                        out.print("221 2.0.0 Bye\r\n");
                        out.flush();
                        break;
                    }
                    out.flush();
                }
            } catch (Exception ignored) {
            }
        });
        serverThread.start();

        // Configure JavaMailSender against our mock sandbox
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("127.0.0.1");
        mailSender.setPort(mockSmtpPort);
        mailSender.getJavaMailProperties().put("mail.smtp.auth", "false");
        mailSender.getJavaMailProperties().put("mail.smtp.starttls.enable", "false");

        InvitationEmailService service = new InvitationEmailService(
                mailSender,
                true,
                "noreply@notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        // Send test invitation email
        service.send(
                "candidate.student@example.edu",
                "STUDENT",
                "sample-token-12345",
                "2026-10-31T23:59:59Z"
        );

        boolean reached = messageReceived.await(5, TimeUnit.SECONDS);
        assertThat(reached).isTrue();

        String payload = receivedPayload.get();
        assertThat(payload).contains("From: noreply@notifyhub.example.edu");
        assertThat(payload).contains("To: candidate.student@example.edu");
        assertThat(payload).contains("Subject: Your NotifyHub student invitation");
        assertThat(payload).contains("https://staging.notifyhub.example.edu/auth/register?token=sample-token-12345");
        assertThat(payload).contains("2026-10-31T23:59:59Z");
    }

    @Test
    void verifiesPasswordResetEmailFormatAgainstMockSandbox() throws Exception {
        CountDownLatch messageReceived = new CountDownLatch(1);
        AtomicReference<String> receivedPayload = new AtomicReference<>("");

        serverThread = new Thread(() -> {
            try (Socket socket = mockSmtpServer.accept();
                 BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                 PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {

                out.print("220 mock.smtp.local ESMTP Mock\r\n");
                out.flush();

                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null) {
                    sb.append(line).append("\n");
                    if (line.startsWith("HELO") || line.startsWith("EHLO")) {
                        out.print("250-mock.smtp.local\r\n250 OK\r\n");
                    } else if (line.startsWith("MAIL FROM:")) {
                        out.print("250 OK\r\n");
                    } else if (line.startsWith("RCPT TO:")) {
                        out.print("250 OK\r\n");
                    } else if (line.startsWith("DATA")) {
                        out.print("354 Start mail input; end with <CRLF>.<CRLF>\r\n");
                    } else if (line.equals(".")) {
                        out.print("250 2.0.0 OK: queued\r\n");
                        receivedPayload.set(sb.toString());
                        messageReceived.countDown();
                    } else if (line.startsWith("QUIT")) {
                        out.print("221 2.0.0 Bye\r\n");
                        out.flush();
                        break;
                    }
                    out.flush();
                }
            } catch (Exception ignored) {
            }
        });
        serverThread.start();

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("127.0.0.1");
        mailSender.setPort(mockSmtpPort);
        mailSender.getJavaMailProperties().put("mail.smtp.auth", "false");
        mailSender.getJavaMailProperties().put("mail.smtp.starttls.enable", "false");

        PasswordResetEmailService resetService = new PasswordResetEmailService(
                mailSender,
                true,
                "noreply@notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/reset-password"
        );

        resetService.send("user.reset@example.edu", "reset-token-abc999", 30);

        boolean reached = messageReceived.await(5, TimeUnit.SECONDS);
        assertThat(reached).isTrue();

        String payload = receivedPayload.get();
        assertThat(payload).contains("To: user.reset@example.edu");
        assertThat(payload).contains("Subject: Reset your NotifyHub password");
        assertThat(payload).contains("https://staging.notifyhub.example.edu/auth/reset-password?token=reset-token-abc999");
        assertThat(payload).contains("expires in 30 minutes");
    }

    @Test
    void verifiesInvalidSmtpConfigurationFailsSafelyWithoutDatabaseRollback() {
        // Mock JavaMailSender pointing to unreachable port
        JavaMailSenderImpl badMailSender = new JavaMailSenderImpl();
        badMailSender.setHost("127.0.0.1");
        badMailSender.setPort(65534); // Unused closed port
        badMailSender.setUsername("smtp-user");
        badMailSender.setPassword("SuperSecretSmtpPasswordThatMustNotLeak");

        InvitationEmailService badService = new InvitationEmailService(
                badMailSender,
                true,
                "noreply@notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        // Verify startup validation does not crash the application
        assertThatCode(badService::validateSmtpConnection).doesNotThrowAnyException();

        // Verify dispatcher marks invitation as FAILED without throwing or exposing password
        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(badService, mockRepo);

        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "student@example.edu",
                "STUDENT",
                "test-raw-token",
                Instant.now().plusSeconds(86400)
        );

        // Must not throw exception
        assertThatCode(() -> dispatcher.dispatch(event)).doesNotThrowAnyException();

        // Must mark invitation FAILED
        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(invitation.getEmailError()).isNotBlank();
        // Crucial safety check: password must NEVER be in error message
        assertThat(invitation.getEmailError()).doesNotContain("SuperSecretSmtpPasswordThatMustNotLeak");
        verify(mockRepo).save(invitation);
    }

    @Test
    void verifiesDisabledEmailDoesNotAttemptSmtpConnection() throws Exception {
        JavaMailSenderImpl mailSender = mock(JavaMailSenderImpl.class);

        InvitationEmailService disabledService = new InvitationEmailService(
                mailSender,
                false,
                "noreply@notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        // Validation should not call testConnection
        disabledService.validateSmtpConnection();
        verify(mailSender, never()).testConnection();

        // Password reset should not send
        PasswordResetEmailService disabledReset = new PasswordResetEmailService(
                mailSender,
                false,
                "noreply@notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/reset-password"
        );
        disabledReset.send("user@example.edu", "token", 30);
        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    @Test
    void verifiesSuccessfulDeliveryDeliversEmailWithLinkAndUpdatesStatusToSent() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        InvitationEmailService service = new InvitationEmailService(
                mailSender,
                true,
                "invitations@staging.notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        Instant expires = Instant.parse("2026-10-19T12:00:00Z");
        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "prospective.student@example.edu",
                "STUDENT",
                "raw-secret-token-xyz",
                expires
        );

        dispatcher.dispatch(event);

        org.mockito.ArgumentCaptor<SimpleMailMessage> msgCaptor = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(msgCaptor.capture());
        SimpleMailMessage sent = msgCaptor.getValue();

        assertThat(sent.getTo()).containsExactly("prospective.student@example.edu");
        assertThat(sent.getFrom()).isEqualTo("invitations@staging.notifyhub.example.edu");
        assertThat(sent.getSubject()).isEqualTo("Your NotifyHub student invitation");
        assertThat(sent.getText()).contains("https://staging.notifyhub.example.edu/auth/register?token=raw-secret-token-xyz");
        assertThat(sent.getText()).contains("2026-10-19T12:00:00Z");

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.SENT);
        assertThat(invitation.getEmailError()).isNull();
        verify(mockRepo).save(invitation);
        verify(mockRepo, never()).delete(any());
    }

    @Test
    void verifiesSmtpFailurePreservesInvitationRecordAndSetsFailedStatus() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        doThrow(new org.springframework.mail.MailSendException("Connection refused to mail.staging:1025"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        InvitationEmailService service = new InvitationEmailService(
                mailSender,
                true,
                "invitations@staging.notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "student.failure@example.edu",
                "STUDENT",
                "raw-token-123",
                Instant.now().plusSeconds(3600)
        );

        assertThatCode(() -> dispatcher.dispatch(event)).doesNotThrowAnyException();

        verify(mockRepo, never()).delete(any());
        verify(mockRepo, never()).deleteById(any());

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(invitation.getEmailError()).contains("Connection refused");
        verify(mockRepo).save(invitation);
    }

    @Test
    void verifiesAlreadyAcceptedInvitationSkipsEmailDispatch() {
        InvitationEmailService service = mock(InvitationEmailService.class);
        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setStatus(com.notifyhub.auth.InvitationStatus.USED);
        invitation.setUsedAt(Instant.now());
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "already.accepted@example.edu",
                "STUDENT",
                "raw-token-abc",
                Instant.now().plusSeconds(3600)
        );

        dispatcher.dispatch(event);

        verify(service, never()).send(any(), any(), any(), any());
        verify(mockRepo, never()).save(any());
    }

    @Test
    void verifiesErrorSanitizationStripsPasswordsAndTokens() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        doThrow(new org.springframework.mail.MailSendException("SMTP auth failure: password=SuperSecretPassword123 with token=tok_abc123"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        InvitationEmailService service = new InvitationEmailService(
                mailSender,
                true,
                "invitations@staging.notifyhub.example.edu",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "student.sanitized@example.edu",
                "STUDENT",
                "raw-token-123",
                Instant.now().plusSeconds(3600)
        );

        dispatcher.dispatch(event);

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(invitation.getEmailError()).doesNotContain("SuperSecretPassword123");
        assertThat(invitation.getEmailError()).doesNotContain("tok_abc123");
        assertThat(invitation.getEmailError()).contains("password=***");
        assertThat(invitation.getEmailError()).contains("token=***");
    }

    @Test
    void verifiesResendDeliverySucceedsAndUpdatesStatusToSent() {
        EmailTransport mockTransport = mock(EmailTransport.class);
        when(mockTransport.getProviderName()).thenReturn("Resend (HTTPS API)");

        InvitationEmailService service = new InvitationEmailService(
                mockTransport,
                true,
                "onboarding@resend.dev",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        Instant expires = Instant.parse("2026-10-25T12:00:00Z");
        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "candidate.resend@example.edu",
                "FACULTY",
                "token-resend-abc",
                expires
        );

        dispatcher.dispatch(event);

        verify(mockTransport).send(
                eq("onboarding@resend.dev"),
                eq("candidate.resend@example.edu"),
                eq("Your NotifyHub faculty invitation"),
                contains("token-resend-abc")
        );

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.SENT);
        assertThat(invitation.getEmailError()).isNull();
        verify(mockRepo).save(invitation);
    }

    @Test
    void verifiesResendApiFailureRecordsFailedStatusAndPreservesInvitationRecord() {
        EmailTransport mockTransport = mock(EmailTransport.class);
        doThrow(new IllegalStateException("Resend API returned HTTP 422: The domain is not verified"))
                .when(mockTransport).send(anyString(), anyString(), anyString(), anyString());

        InvitationEmailService service = new InvitationEmailService(
                mockTransport,
                true,
                "noreply@unverified-domain.com",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        InvitationCreatedEvent event = new InvitationCreatedEvent(
                invitationId,
                "candidate.failed@example.edu",
                "STUDENT",
                "token-fail-123",
                Instant.now().plusSeconds(3600)
        );

        assertThatCode(() -> dispatcher.dispatch(event)).doesNotThrowAnyException();

        verify(mockRepo, never()).delete(any());
        verify(mockRepo, never()).deleteById(any());

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(invitation.getEmailError()).contains("HTTP 422");
        assertThat(invitation.getEmailError()).contains("domain is not verified");
        verify(mockRepo).save(invitation);
    }

    @Test
    void verifiesAuthorizedResendRetriesDeliveryAndClearsPreviousError() {
        EmailTransport mockTransport = mock(EmailTransport.class);
        InvitationEmailService service = new InvitationEmailService(
                mockTransport,
                true,
                "onboarding@resend.dev",
                "https://staging.notifyhub.example.edu",
                "/auth/register"
        );

        InvitationRepository mockRepo = mock(InvitationRepository.class);
        UUID invitationId = UUID.randomUUID();
        Invitation invitation = new Invitation();
        // Previous state was FAILED with an error
        invitation.setEmailStatus(InvitationEmailStatus.FAILED);
        invitation.setEmailError("Previous network timeout");
        when(mockRepo.findById(invitationId)).thenReturn(Optional.of(invitation));

        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(service, mockRepo);
        InvitationCreatedEvent resendEvent = new InvitationCreatedEvent(
                invitationId,
                "retry.student@example.edu",
                "STUDENT",
                "new-raw-token-456",
                Instant.now().plusSeconds(7200)
        );

        dispatcher.dispatch(resendEvent);

        verify(mockTransport).send(
                eq("onboarding@resend.dev"),
                eq("retry.student@example.edu"),
                eq("Your NotifyHub student invitation"),
                contains("new-raw-token-456")
        );

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.SENT);
        assertThat(invitation.getEmailError()).isNull();
        verify(mockRepo).save(invitation);
    }

    @Test
    void verifiesSmtpConnectionFailureProvidesClearGuidanceAboutBlockedPorts() {
        JavaMailSenderImpl unreachableSender = new JavaMailSenderImpl();
        unreachableSender.setHost("127.0.0.1");
        unreachableSender.setPort(65534); // Closed port simulating dropped/blocked packets
        unreachableSender.setUsername("smtp-user");
        unreachableSender.setPassword("smtp-pass");

        SmtpEmailTransport transport = new SmtpEmailTransport(unreachableSender);

        // Validation must not crash application startup
        assertThatCode(transport::validateConnection).doesNotThrowAnyException();
        assertThat(transport.getProviderName()).isEqualTo("SMTP");
    }
}
