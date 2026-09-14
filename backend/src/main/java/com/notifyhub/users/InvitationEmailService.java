package com.notifyhub.users;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

@Service
public class InvitationEmailService {
    private static final Logger log = LoggerFactory.getLogger(InvitationEmailService.class);

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;
    private final String frontendOrigin;
    private final String invitationPath;

    public InvitationEmailService(JavaMailSender mailSender,
                                  @Value("${notifyhub.mail.enabled:false}") boolean enabled,
                                  @Value("${notifyhub.mail.from:notifyhub@localhost}") String from,
                                  @Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin,
                                  @Value("${notifyhub.mail.invitation-path:/auth/register}") String invitationPath) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.frontendOrigin = frontendOrigin.replaceAll("/$", "");
        this.invitationPath = invitationPath;
    }

    @PostConstruct
    void validateSmtpConnection() {
        if (!enabled) {
            log.info("NotifyHub invitation email delivery is disabled.");
            return;
        }
        if (!(mailSender instanceof JavaMailSenderImpl sender)) {
            log.error("SMTP validation could not run because the configured JavaMailSender does not expose a connection test.");
            return;
        }
        try {
            sender.testConnection();
            log.info("NotifyHub SMTP connection/authentication validated successfully for {}:{}.", sender.getHost(), sender.getPort());
        } catch (Exception ex) {
            log.error("NotifyHub SMTP authentication failed for {}:{}: {}. Invitation creation will remain available; configure valid SMTP credentials (for Gmail, use an App Password with 2-Step Verification) before expecting invitation emails to send.",
                    sender.getHost(), sender.getPort(), safeMessage(ex), ex);
        }
    }

    public void send(String email, String role, String token, String expiresAt) {
        if (!enabled) throw new IllegalStateException("Invitation email delivery is disabled. Configure MAIL_ENABLED=true and SMTP settings.");
        String link = frontendOrigin + invitationPath + "?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Your NotifyHub " + role.toLowerCase() + " invitation");
        message.setText("You have been invited to NotifyHub.\n\nComplete your account by opening this secure link:\n" + link + "\n\nThis invitation expires at " + expiresAt + ".\n\nIf you did not expect this invitation, you can ignore this email.");
        mailSender.send(message);
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return message == null || message.isBlank() ? ex.getClass().getSimpleName() : message;
    }
}
