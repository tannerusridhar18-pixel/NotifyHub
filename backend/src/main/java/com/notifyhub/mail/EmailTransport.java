package com.notifyhub.mail;

/**
 * Common abstraction for email delivery.
 * Supports traditional SMTP (via JavaMailSender) and modern HTTPS API providers (e.g. Resend)
 * for environments like Railway, Render, or AWS where outbound SMTP ports (25, 465, 587) are restricted.
 */
public interface EmailTransport {
    /**
     * Send an email message.
     *
     * @param from sender address
     * @param to recipient address
     * @param subject email subject
     * @param text plain text content
     */
    void send(String from, String to, String subject, String text);

    /**
     * Validate the email provider connection/configuration at application startup.
     * Must not throw uncaught exceptions that would crash application startup.
     */
    void validateConnection();

    /**
     * Human-readable provider identifier (e.g. "SMTP", "Resend (HTTPS API)").
     */
    String getProviderName();
}
