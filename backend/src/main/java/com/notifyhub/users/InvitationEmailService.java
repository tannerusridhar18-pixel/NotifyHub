package com.notifyhub.users;

import com.notifyhub.mail.EmailTransport;
import com.notifyhub.mail.SmtpEmailTransport;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class InvitationEmailService {
    private static final Logger log = LoggerFactory.getLogger(InvitationEmailService.class);

    private final EmailTransport transport;
    private final boolean enabled;
    private final String from;
    private final String frontendOrigin;
    private final String invitationPath;

    @org.springframework.beans.factory.annotation.Autowired
    public InvitationEmailService(EmailTransport transport,
                                  @Value("${notifyhub.mail.enabled:false}") boolean enabled,
                                  @Value("${notifyhub.mail.from:notifyhub@localhost}") String from,
                                  @Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin,
                                  @Value("${notifyhub.mail.invitation-path:/auth/register}") String invitationPath) {
        this.transport = transport;
        this.enabled = enabled;
        this.from = from;
        this.frontendOrigin = frontendOrigin.replaceAll("/$", "");
        this.invitationPath = invitationPath;
    }

    /**
     * Backward-compatible constructor for existing tests and configurations.
     */
    public InvitationEmailService(JavaMailSender mailSender,
                                  boolean enabled,
                                  String from,
                                  String frontendOrigin,
                                  String invitationPath) {
        this(new SmtpEmailTransport(mailSender), enabled, from, frontendOrigin, invitationPath);
    }

    @PostConstruct
    void validateSmtpConnection() {
        if (!enabled) {
            log.info("NotifyHub invitation email delivery is disabled.");
            return;
        }
        try {
            transport.validateConnection();
        } catch (Exception ex) {
            log.warn("NotifyHub email validation warning: {}", safeMessage(ex));
        }
    }

    public void send(String email, String role, String token, String expiresAt) {
        if (!enabled) throw new IllegalStateException("Invitation email delivery is disabled. Configure MAIL_ENABLED=true and email provider settings.");
        String link = frontendOrigin + invitationPath + "?token=" + token;
        String subject = "Your NotifyHub " + role.toLowerCase() + " invitation";
        String text = "You have been invited to NotifyHub.\n\nComplete your account by opening this secure link:\n" + link + "\n\nThis invitation expires at " + expiresAt + ".\n\nIf you did not expect this invitation, you can ignore this email.";
        transport.send(from, email, subject, text);
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        return message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;]+", "$1=***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***");
    }
}
