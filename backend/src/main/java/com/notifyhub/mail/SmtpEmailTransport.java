package com.notifyhub.mail;

import jakarta.mail.AuthenticationFailedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Standard SMTP transport implementation backed by Spring's JavaMailSender.
 * Provides accurate diagnostics distinguishing between credential authentication failures
 * and connection timeout/refusal caused by hosting firewall restrictions on ports 25, 465, or 587.
 */
public class SmtpEmailTransport implements EmailTransport {
    private static final Logger log = LoggerFactory.getLogger(SmtpEmailTransport.class);

    private final JavaMailSender mailSender;

    public SmtpEmailTransport(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void send(String from, String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    @Override
    public void validateConnection() {
        if (!(mailSender instanceof JavaMailSenderImpl sender)) {
            log.warn("SMTP validation could not run because the configured JavaMailSender does not expose a connection test.");
            return;
        }
        try {
            sender.testConnection();
            log.info("NotifyHub SMTP connection/authentication validated successfully for {}:{}.", sender.getHost(), sender.getPort());
        } catch (AuthenticationFailedException ex) {
            log.error("NotifyHub SMTP authentication failed for {}:{}: {}. Invitation creation will remain available; check your SMTP credentials (for Gmail, ensure 2-Step Verification and an active App Password).",
                    sender.getHost(), sender.getPort(), safeMessage(ex));
        } catch (Exception ex) {
            log.error("NotifyHub SMTP connection to {}:{} failed: {}. Hosting providers such as Railway block outbound SMTP ports (25, 465, 587); configure an HTTPS API provider (e.g. MAIL_PROVIDER=resend with RESEND_API_KEY) for production email delivery. Invitation creation will remain available.",
                    sender.getHost(), sender.getPort(), safeMessage(ex));
        }
    }

    @Override
    public String getProviderName() {
        return "SMTP";
    }

    public JavaMailSender getMailSender() {
        return mailSender;
    }

    private static String safeMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        return message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;]+", "$1=***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***");
    }
}
