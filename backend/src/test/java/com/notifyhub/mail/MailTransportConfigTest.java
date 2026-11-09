package com.notifyhub.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class MailTransportConfigTest {

    private MailTransportConfig config;
    private JavaMailSender mockMailSender;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        config = new MailTransportConfig();
        mockMailSender = mock(JavaMailSender.class);
        objectMapper = new ObjectMapper();
    }

    @Test
    void explicitlySelectsResendWhenMailProviderIsResend() {
        EmailTransport transport = config.emailTransport(
                "resend",
                "onboarding@resend.dev",
                "re_123456789",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(ResendEmailTransport.class);
        assertThat(transport.getProviderName()).contains("Resend");
    }

    @Test
    void selectsResendWhenProviderIsAutoAndResendKeyIsConfigured() {
        EmailTransport transport = config.emailTransport(
                "auto",
                "onboarding@resend.dev",
                "re_987654321",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(ResendEmailTransport.class);
        assertThat(transport.getProviderName()).contains("Resend");
    }

    @Test
    void selectsResendWhenProviderIsEmptyAndResendKeyIsConfigured() {
        EmailTransport transport = config.emailTransport(
                "",
                "onboarding@resend.dev",
                "re_987654321",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(ResendEmailTransport.class);
        assertThat(transport.getProviderName()).contains("Resend");
    }

    @Test
    void selectsSmtpWhenProviderIsExplicitlySmtpEvenIfResendKeyIsSet() {
        EmailTransport transport = config.emailTransport(
                "smtp",
                "onboarding@resend.dev",
                "re_123456789",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(SmtpEmailTransport.class);
        assertThat(transport.getProviderName()).contains("SMTP");
    }

    @Test
    void fallsBackToSmtpWhenProviderIsAutoAndNoResendKeyIsSet() {
        EmailTransport transport = config.emailTransport(
                "auto",
                "notifyhub@localhost",
                "",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(SmtpEmailTransport.class);
        assertThat(transport.getProviderName()).contains("SMTP");
    }

    @Test
    void selectsSmtpCaseInsensitively() {
        EmailTransport transport = config.emailTransport(
                "SMTP",
                "admin@notifyhub.local",
                "",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(SmtpEmailTransport.class);
        assertThat(transport.getProviderName()).contains("SMTP");
    }

    @Test
    void selectsResendCaseInsensitively() {
        EmailTransport transport = config.emailTransport(
                "ReSeNd",
                "onboarding@resend.dev",
                "re_test_key",
                "https://api.resend.com/emails",
                mockMailSender,
                objectMapper
        );

        assertThat(transport).isInstanceOf(ResendEmailTransport.class);
        assertThat(transport.getProviderName()).contains("Resend");
    }
}

