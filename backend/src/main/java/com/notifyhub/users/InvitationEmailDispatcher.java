package com.notifyhub.users;

//import com.notifyhub.auth.Invitation;
import com.notifyhub.auth.InvitationEmailStatus;
import com.notifyhub.auth.InvitationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Service
public class InvitationEmailDispatcher {
    private static final Logger log = LoggerFactory.getLogger(InvitationEmailDispatcher.class);

    private final InvitationEmailService emailService;
    private final InvitationRepository invitations;

    public InvitationEmailDispatcher(InvitationEmailService emailService, InvitationRepository invitations) {
        this.emailService = emailService;
        this.invitations = invitations;
    }

    @Async("notifyHubTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void dispatch(InvitationCreatedEvent event) {
        try {
            var invOpt = invitations.findById(event.invitationId());
            if (invOpt.isPresent()) {
                var inv = invOpt.get();
                if (inv.getStatus() == com.notifyhub.auth.InvitationStatus.USED || inv.getUsedAt() != null) {
                    log.info("Invitation {} is already accepted/used; skipping email dispatch.", event.invitationId());
                    return;
                }
            }

            emailService.send(event.email(), event.role(), event.rawToken(), event.expiresAt().toString());
            mark(event.invitationId(), InvitationEmailStatus.SENT, null);
            log.info("Invitation email sent successfully for invitation {}", event.invitationId());
        } catch (Exception ex) {
            String message = safeError(ex);
            mark(event.invitationId(), InvitationEmailStatus.FAILED, message);
            log.error("Invitation {} was persisted but email delivery failed: {}", event.invitationId(), message);
        }
    }

    private void mark(java.util.UUID invitationId, InvitationEmailStatus status, String error) {
        invitations.findById(invitationId).ifPresent(invitation -> {
            invitation.setEmailStatus(status);
            invitation.setEmailError(error);
            invitations.save(invitation);
        });
    }

    private String safeError(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        String sanitized = message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;]+", "$1=***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***");
        return sanitized.length() > 500 ? sanitized.substring(0, 500) : sanitized;
    }
}
