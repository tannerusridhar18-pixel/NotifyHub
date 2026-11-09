package com.notifyhub.users;

import com.notifyhub.auth.Invitation;
import com.notifyhub.auth.InvitationEmailStatus;
import com.notifyhub.auth.InvitationRepository;
import com.notifyhub.auth.InvitationStatus;
import com.notifyhub.security.SecureTokenService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class InvitationEmailDispatcher {
    private static final Logger log = LoggerFactory.getLogger(InvitationEmailDispatcher.class);
    private static final int MAX_DISPATCH_ATTEMPTS = 3;

    private final InvitationEmailService emailService;
    private final InvitationRepository invitations;
    private final SecureTokenService secureTokens;

    @Autowired
    public InvitationEmailDispatcher(InvitationEmailService emailService, InvitationRepository invitations, SecureTokenService secureTokens) {
        this.emailService = emailService;
        this.invitations = invitations;
        this.secureTokens = secureTokens;
    }

    public InvitationEmailDispatcher(InvitationEmailService emailService, InvitationRepository invitations) {
        this(emailService, invitations, new SecureTokenService());
    }

    public static boolean isTemporaryAccount(String email) {
        if (email == null || email.isBlank()) return true;
        String e = email.trim().toLowerCase();
        return e.endsWith("@notifyhub.local")
                || e.endsWith("@localhost")
                || e.endsWith(".local")
                || e.endsWith(".test")
                || e.endsWith(".invalid")
                || e.endsWith(".temp")
                || e.contains("@temporary.")
                || e.contains("@temp.")
                || e.contains("temporary")
                || e.startsWith("temp.")
                || e.startsWith("temp-")
                || e.startsWith("temp_")
                || e.startsWith("staging.")
                || e.contains("staging.student")
                || e.contains("student.audit");
    }

    @Async("notifyHubTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void dispatch(InvitationCreatedEvent event) {
        var invOpt = invitations.findById(event.invitationId());
        if (invOpt.isPresent()) {
            var inv = invOpt.get();
            if (inv.getStatus() == InvitationStatus.USED || inv.getUsedAt() != null) {
                log.info("Invitation {} is already accepted/used; skipping email dispatch.", event.invitationId());
                return;
            }
            if (inv.getEmailStatus() == InvitationEmailStatus.SENT) {
                log.info("Invitation {} email has already been sent; skipping duplicate dispatch.", event.invitationId());
                return;
            }
            if (secureTokens != null && inv.getTokenHash() != null && event.rawToken() != null
                    && !inv.getTokenHash().equals(secureTokens.hash(event.rawToken()))) {
                log.info("Invitation {} token has been superseded by a newer token; skipping dispatch for stale event.", event.invitationId());
                return;
            }
        }

        if (isTemporaryAccount(event.email())) {
            log.info("Invitation {} is for a temporary account; suppressing outbound email dispatch.", event.invitationId());
            mark(event.invitationId(), InvitationEmailStatus.SENT, "Outbound email delivery skipped for temporary account");
            return;
        }

        executeWithRetry(event);
    }

    private void executeWithRetry(InvitationCreatedEvent event) {
        String lastError = null;
        for (int attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt++) {
            try {
                emailService.send(event.email(), event.role(), event.rawToken(), event.expiresAt().toString());
                mark(event.invitationId(), InvitationEmailStatus.SENT, null);
                log.info("Invitation email sent successfully for invitation {} on attempt {}", event.invitationId(), attempt);
                return;
            } catch (Exception ex) {
                lastError = safeError(ex);
                log.warn("Attempt {}/{} failed to deliver invitation email for {}: {}", attempt, MAX_DISPATCH_ATTEMPTS, event.invitationId(), lastError);
                if (!isRetryable(ex) || attempt == MAX_DISPATCH_ATTEMPTS) {
                    break;
                }
                try {
                    Thread.sleep(attempt * 500L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        String finalMessage = lastError != null ? lastError : "Email delivery failed";
        mark(event.invitationId(), InvitationEmailStatus.FAILED, finalMessage);
        log.error("Invitation {} was persisted but email delivery failed after retries: {}", event.invitationId(), finalMessage);
    }

    private boolean isRetryable(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null) return false;
        // Non-retryable configuration or permanent credential/client errors:
        if (msg.contains("disabled") || msg.contains("not configured")) return false;
        // Resend permanent client rejection:
        if (msg.contains("HTTP 401") || msg.contains("HTTP 403") || msg.contains("HTTP 422") || msg.contains("HTTP 400")) return false;
        // SMTP permanent authentication/credentials failure:
        if (ex instanceof MailAuthenticationException || msg.contains("authentication failed") || msg.contains("535")) return false;
        // Network timeouts, connection drops, 5xx server errors, temporary connection drops:
        return true;
    }

    @PostConstruct
    @Scheduled(fixedDelayString = "${notifyhub.mail.recovery-interval-ms:60000}", initialDelay = 15000)
    public void recoverStuckPendingInvitations() {
        try {
            Instant cutoff = Instant.now().minus(2, ChronoUnit.MINUTES);
            List<Invitation> pending = invitations.findByEmailStatusAndStatus(InvitationEmailStatus.PENDING, InvitationStatus.PENDING);
            for (Invitation inv : pending) {
                Instant referenceTime = inv.getLastDispatchedAt() != null ? inv.getLastDispatchedAt() : inv.getCreatedAt();
                if (referenceTime != null && referenceTime.isBefore(cutoff) && inv.getUsedAt() == null) {
                    inv.setEmailStatus(InvitationEmailStatus.FAILED);
                    inv.setEmailError("Email dispatch timed out or was interrupted. Click 'Resend' to regenerate and deliver invitation.");
                    inv.setLastDispatchedAt(Instant.now());
                    invitations.save(inv);
                    log.warn("Recovered stuck pending invitation {}: marked as FAILED with actionable resend prompt.", inv.getId());
                }
            }
        } catch (Exception ex) {
            log.error("Failed running invitation recovery sweeper: {}", safeError(ex));
        }
    }

    private void mark(UUID invitationId, InvitationEmailStatus status, String error) {
        invitations.findById(invitationId).ifPresent(invitation -> {
            invitation.setEmailStatus(status);
            invitation.setEmailError(error);
            invitation.setLastDispatchedAt(Instant.now());
            invitations.save(invitation);
        });
    }

    private String safeError(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        String sanitized = message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;\"']+", "$1=***")
                .replaceAll("(?i)(re_[a-zA-Z0-9_-]+)", "re_***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***");
        return sanitized.length() > 500 ? sanitized.substring(0, 500) : sanitized;
    }
}
