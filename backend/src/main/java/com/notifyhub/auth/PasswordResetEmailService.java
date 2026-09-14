package com.notifyhub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetEmailService {
    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;
    private final String frontendOrigin;
    private final String resetPath;

    public PasswordResetEmailService(JavaMailSender mailSender,
                                     @Value("${notifyhub.mail.enabled:false}") boolean enabled,
                                     @Value("${notifyhub.mail.from:notifyhub@localhost}") String from,
                                     @Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin,
                                     @Value("${notifyhub.mail.password-reset-path:/auth/reset-password}") String resetPath) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.frontendOrigin = frontendOrigin.replaceAll("/$", "");
        this.resetPath = resetPath;
    }

    public void send(String email, String rawToken, long resetMinutes) {
        if (!enabled) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Reset your NotifyHub password");
        message.setText("Reset your NotifyHub password by opening this secure link:\n"
                + frontendOrigin + resetPath + "?token=" + rawToken + "\n\n"
                + "This link expires in " + resetMinutes + " minutes. If you did not request this, you can ignore this email.");
        mailSender.send(message);
    }
}
