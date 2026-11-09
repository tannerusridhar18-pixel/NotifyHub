package com.notifyhub.mail;

import jakarta.mail.AuthenticationFailedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SmtpEmailTransportTest {

    private JavaMailSender mockMailSender;
    private SmtpEmailTransport transport;

    @BeforeEach
    void setUp() {
        mockMailSender = mock(JavaMailSender.class);
        transport = new SmtpEmailTransport(mockMailSender);
    }

    @Test
    void sendsEmailSuccessfullyViaSpringJavaMailSender() {
        transport.send(
                "notifications@university.edu",
                "student@campus.edu",
                "NotifyHub Invitation",
                "Welcome to NotifyHub!"
        );

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mockMailSender).send(captor.capture());

        SimpleMailMessage sent = captor.getValue();
        assertThat(sent.getFrom()).isEqualTo("notifications@university.edu");
        assertThat(sent.getTo()).containsExactly("student@campus.edu");
        assertThat(sent.getSubject()).isEqualTo("NotifyHub Invitation");
        assertThat(sent.getText()).isEqualTo("Welcome to NotifyHub!");
        assertThat(transport.getProviderName()).contains("SMTP");
    }

    @Test
    void handlesSmtpValidationAuthFailureSafelyWithoutThrowing() throws Exception {
        JavaMailSenderImpl implMock = mock(JavaMailSenderImpl.class);
        when(implMock.getHost()).thenReturn("smtp.gmail.com");
        when(implMock.getPort()).thenReturn(587);
        doThrow(new AuthenticationFailedException("535 5.7.8 Credentials invalid")).when(implMock).testConnection();

        SmtpEmailTransport smtpTransport = new SmtpEmailTransport(implMock);

        // Validation should log diagnostic error and NOT rethrow or crash startup
        smtpTransport.validateConnection();

        verify(implMock).testConnection();
    }

    @Test
    void handlesSmtpValidationConnectionFailureSafelyWithoutThrowing() throws Exception {
        JavaMailSenderImpl implMock = mock(JavaMailSenderImpl.class);
        when(implMock.getHost()).thenReturn("smtp.custom.org");
        when(implMock.getPort()).thenReturn(25);
        doThrow(new RuntimeException("Connection timed out to port 25")).when(implMock).testConnection();

        SmtpEmailTransport smtpTransport = new SmtpEmailTransport(implMock);

        // Connection failure should log diagnostic warning about port blocking without crashing startup
        smtpTransport.validateConnection();

        verify(implMock).testConnection();
    }
}

