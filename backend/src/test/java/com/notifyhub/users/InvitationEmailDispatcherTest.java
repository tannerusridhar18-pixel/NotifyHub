package com.notifyhub.users;

import com.notifyhub.auth.Invitation;
import com.notifyhub.auth.InvitationEmailStatus;
import com.notifyhub.auth.InvitationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvitationEmailDispatcherTest {
    @Mock InvitationEmailService emailService;
    @Mock InvitationRepository invitations;

    @Test
    void emailFailureMarksInvitationFailedWithoutThrowing() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);
        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));
        doThrow(new IllegalStateException("SMTP authentication failed")).when(emailService)
                .send("student@example.edu", "STUDENT", "raw-token", "2026-09-15T00:00:00Z");

        dispatcher.dispatch(new InvitationCreatedEvent(id, "student@example.edu", "STUDENT", "raw-token", Instant.parse("2026-09-15T00:00:00Z")));

        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(invitation.getEmailError()).contains("SMTP authentication failed");
        verify(invitations).save(invitation);
    }

    @Test
    void temporaryAccountSuppressesOutboundEmail() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);
        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));

        dispatcher.dispatch(new InvitationCreatedEvent(id, "staging.student.12345@notifyhub.local", "STUDENT", "raw-token", Instant.parse("2026-09-15T00:00:00Z")));

        // Email service must NOT be called for temporary account
        verify(emailService, never()).send(anyString(), anyString(), anyString(), anyString());
        // Status should be marked safely without failing
        verify(invitations).save(argThat(i -> i.getEmailStatus() == InvitationEmailStatus.SENT
                && i.getEmailError() != null && i.getEmailError().contains("temporary account")));
    }

    @Test
    void legitimateAccountDispatchesOutboundEmail() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);
        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));

        dispatcher.dispatch(new InvitationCreatedEvent(id, "legitimate.student@university.edu", "STUDENT", "raw-token", Instant.parse("2026-09-15T00:00:00Z")));

        // Email service MUST be called for legitimate account
        verify(emailService).send("legitimate.student@university.edu", "STUDENT", "raw-token", "2026-09-15T00:00:00Z");
        verify(invitations).save(argThat(i -> i.getEmailStatus() == InvitationEmailStatus.SENT && i.getEmailError() == null));
    }
}
