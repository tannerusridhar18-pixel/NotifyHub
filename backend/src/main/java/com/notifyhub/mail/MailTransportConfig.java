package com.notifyhub.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Automatically configures the appropriate EmailTransport bean based on
 * notifyhub.mail.provider:
 * - "resend" or "api": uses ResendEmailTransport over HTTPS port 443 (ideal for Railway).
 * - "smtp": uses SmtpEmailTransport via Spring JavaMailSender.
 * If provider is unset or auto, presence of RESEND_API_KEY defaults to Resend.
 */
@Configuration
public class MailTransportConfig {
    private static final Logger log = LoggerFactory.getLogger(MailTransportConfig.class);

    @Bean
    @ConditionalOnMissingBean(EmailTransport.class)
    public EmailTransport emailTransport(
            @Value("${notifyhub.mail.provider:smtp}") String provider,
            @Value("${notifyhub.mail.from:notifyhub@localhost}") String mailFrom,
            @Value("${notifyhub.mail.resend.api-key:}") String resendApiKey,
            @Value("${notifyhub.mail.resend.api-url:https://api.resend.com/emails}") String resendApiUrl,
            JavaMailSender javaMailSender,
            ObjectMapper objectMapper) {

        String p = provider != null ? provider.trim().toLowerCase() : "smtp";

        boolean useResend = "resend".equals(p) || "api".equals(p)
                || ((p.isEmpty() || "auto".equals(p)) && resendApiKey != null && !resendApiKey.isBlank());

        if (useResend) {
            log.info("Configuring NotifyHub EmailTransport using Resend HTTPS API.");
            if (mailFrom != null && (mailFrom.endsWith("@localhost") || mailFrom.endsWith(".local"))) {
                log.warn("Resend email delivery is enabled, but MAIL_FROM is '{}'. Resend requires a verified sender domain (e.g. notifications@yourdomain.edu).", mailFrom);
            }
            return new ResendEmailTransport(resendApiKey, resendApiUrl, null, objectMapper);
        }

        log.info("Configuring NotifyHub EmailTransport using standard SMTP.");
        return new SmtpEmailTransport(javaMailSender);
    }
}
