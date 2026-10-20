package com.notifyhub.auth;

import com.notifyhub.mail.EmailTransport;
import com.notifyhub.mail.SmtpEmailTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetEmailService {
    private final EmailTransport transport;
    private final boolean enabled;
    private final String from;
    private final String frontendOrigin;
    private final String resetPath;

    @org.springframework.beans.factory.annotation.Autowired
    public PasswordResetEmailService(EmailTransport transport,
                                     @Value("${notifyhub.mail.enabled:false}") boolean enabled,
                                     @Value("${notifyhub.mail.from:notifyhub@localhost}") String from,
                                     @Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin,
                                     @Value("${notifyhub.mail.password-reset-path:/auth/reset-password}") String resetPath) {
        this.transport = transport;
        this.enabled = enabled;
        this.from = from;
        this.frontendOrigin = frontendOrigin.replaceAll("/$", "");
        this.resetPath = resetPath;
    }

    public PasswordResetEmailService(JavaMailSender mailSender,
                                     boolean enabled,
                                     String from,
                                     String frontendOrigin,
                                     String resetPath) {
        this(new SmtpEmailTransport(mailSender), enabled, from, frontendOrigin, resetPath);
    }

    public void send(String email, String rawToken, long resetMinutes) {
        if (!enabled) return;
        if (com.notifyhub.users.InvitationEmailDispatcher.isTemporaryAccount(email)) return;
        String subject = "Reset your NotifyHub password";
        String text = "Reset your NotifyHub password by opening this secure link:\n"
                + frontendOrigin + resetPath + "?token=" + rawToken + "\n\n"
                + "This link expires in " + resetMinutes + " minutes. If you did not request this, you can ignore this email.";
        transport.send(from, email, subject, text);
    }
}
