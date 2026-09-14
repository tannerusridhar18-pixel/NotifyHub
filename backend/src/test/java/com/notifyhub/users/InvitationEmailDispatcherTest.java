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
}
