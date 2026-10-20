package com.notifyhub.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Modern HTTPS API email transport using Resend (https://resend.com).
 * Communicates over standard HTTPS (Port 443), making it reliable in cloud hosting
 * environments such as Railway, Render, and Vercel where outbound SMTP ports are blocked.
 */
public class ResendEmailTransport implements EmailTransport {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailTransport.class);

    private final String apiKey;
    private final String apiUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ResendEmailTransport(String apiKey, String apiUrl, HttpClient httpClient, ObjectMapper objectMapper) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.apiUrl = (apiUrl != null && !apiUrl.isBlank()) ? apiUrl.trim() : "https://api.resend.com/emails";
        this.httpClient = httpClient != null ? httpClient : HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public ResendEmailTransport(String apiKey) {
        this(apiKey, "https://api.resend.com/emails", null, null);
    }

    @Override
    public void send(String from, String to, String subject, String text) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("Resend API key is not configured. Set RESEND_API_KEY environment variable.");
        }
        try {
            Map<String, Object> payload = Map.of(
                    "from", from,
                    "to", List.of(to),
                    "subject", subject,
                    "text", text
            );
            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String sanitizedBody = sanitize(response.body());
                throw new IllegalStateException("Resend API returned HTTP " + response.statusCode() + ": " + sanitizedBody);
            }
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Resend API request failed: " + sanitize(ex.getMessage()), ex);
        }
    }

    @Override
    public void validateConnection() {
        if (apiKey.isBlank()) {
            log.error("Resend email delivery is enabled (MAIL_PROVIDER=resend) but RESEND_API_KEY is not set. Invitation creation will remain available.");
            return;
        }
        if (!apiKey.startsWith("re_")) {
            log.warn("RESEND_API_KEY does not start with standard 're_' prefix. Check that a valid Resend API key is configured.");
        }
        log.info("NotifyHub Resend HTTPS API email delivery configured successfully (endpoint: {}).", apiUrl);
    }

    @Override
    public String getProviderName() {
        return "Resend (HTTPS API)";
    }

    public String getApiUrl() {
        return apiUrl;
    }

    private static String sanitize(String message) {
        if (message == null || message.isBlank()) return "Unknown error";
        return message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;\"']+", "$1=***")
                .replaceAll("(?i)(re_[a-zA-Z0-9_-]+)", "re_***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***");
    }
}
