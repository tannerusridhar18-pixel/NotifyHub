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
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void dispatch(InvitationCreatedEvent event) {
        try {
            emailService.send(event.email(), event.role(), event.rawToken(), event.expiresAt().toString());
            mark(event, InvitationEmailStatus.SENT, null);
            log.info("Invitation email sent successfully for invitation {}", event.invitationId());
        } catch (RuntimeException ex) {
            String message = safeError(ex);
            mark(event, InvitationEmailStatus.FAILED, message);
            log.error("Invitation {} was persisted but email delivery failed: {}", event.invitationId(), message, ex);
        }
    }

    private void mark(InvitationCreatedEvent event, InvitationEmailStatus status, String error) {
        invitations.findById(event.invitationId()).ifPresent(invitation -> {
            invitation.setEmailStatus(status);
            invitation.setEmailError(error);
            invitations.save(invitation);
        });
    }

    private String safeError(RuntimeException ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        return message.length() > 500 ? message.substring(0, 500) : message;
    }
}
