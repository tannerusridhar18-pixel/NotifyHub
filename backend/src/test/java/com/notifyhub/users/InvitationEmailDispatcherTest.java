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

    @Test
    void preventsDuplicateDispatchWhenAlreadySent() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);
        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.SENT);
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));

        dispatcher.dispatch(new InvitationCreatedEvent(id, "student@university.edu", "STUDENT", "raw-token", Instant.parse("2026-09-15T00:00:00Z")));

        // Email service must NOT be called again
        verify(emailService, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void retriesOnTransientFailureAndRecovers() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);
        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));

        // First attempt fails with transient network error, second attempt succeeds
        doThrow(new IllegalStateException("Resend API request failed: Connect timed out"))
                .doNothing()
                .when(emailService).send("student@university.edu", "STUDENT", "raw-token", "2026-09-15T00:00:00Z");

        dispatcher.dispatch(new InvitationCreatedEvent(id, "student@university.edu", "STUDENT", "raw-token", Instant.parse("2026-09-15T00:00:00Z")));

        verify(emailService, times(2)).send("student@university.edu", "STUDENT", "raw-token", "2026-09-15T00:00:00Z");
        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.SENT);
        assertThat(invitation.getEmailError()).isNull();
        verify(invitations).save(invitation);
    }

    @Test
    void schedulerRecoveryIgnoresRecentlyResentInvitation() throws Exception {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);

        // Invitation originally created 3 days ago, but resent 15 seconds ago
        Invitation resent = new Invitation();
        resent.setEmailStatus(InvitationEmailStatus.PENDING);
        resent.setStatus(com.notifyhub.auth.InvitationStatus.PENDING);
        var createdAtField = Invitation.class.getDeclaredField("createdAt");
        createdAtField.setAccessible(true);
        createdAtField.set(resent, Instant.now().minus(3, java.time.temporal.ChronoUnit.DAYS));
        resent.setLastDispatchedAt(Instant.now().minus(15, java.time.temporal.ChronoUnit.SECONDS));

        when(invitations.findByEmailStatusAndStatus(InvitationEmailStatus.PENDING, com.notifyhub.auth.InvitationStatus.PENDING))
                .thenReturn(java.util.List.of(resent));

        dispatcher.recoverStuckPendingInvitations();

        // Must NOT mark as FAILED because lastDispatchedAt is within the 2-minute cutoff window
        assertThat(resent.getEmailStatus()).isEqualTo(InvitationEmailStatus.PENDING);
        verify(invitations, never()).save(resent);
    }

    @Test
    void concurrentDispatchDropsStaleTokenEvent() {
        com.notifyhub.security.SecureTokenService secureTokens = new com.notifyhub.security.SecureTokenService();
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations, secureTokens);

        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        // Stored hash belongs to a NEWER token
        invitation.setTokenHash(secureTokens.hash("newer-raw-token"));
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));

        // Event contains an OLD stale token
        dispatcher.dispatch(new InvitationCreatedEvent(id, "student@university.edu", "STUDENT", "older-stale-token", Instant.parse("2026-09-15T00:00:00Z")));

        // Must NOT call emailService with stale token
        verify(emailService, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void smtpAuthFailureAbortsImmediatelyWithoutRetrying() {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);
        UUID id = UUID.randomUUID();
        Invitation invitation = new Invitation();
        invitation.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(id)).thenReturn(Optional.of(invitation));

        doThrow(new org.springframework.mail.MailAuthenticationException("535 5.7.8 Username and Password not accepted"))
                .when(emailService).send("student@university.edu", "STUDENT", "raw-token", "2026-09-15T00:00:00Z");

        dispatcher.dispatch(new InvitationCreatedEvent(id, "student@university.edu", "STUDENT", "raw-token", Instant.parse("2026-09-15T00:00:00Z")));

        // Must NOT retry 3 times for authentication failure
        verify(emailService, times(1)).send("student@university.edu", "STUDENT", "raw-token", "2026-09-15T00:00:00Z");
        assertThat(invitation.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(invitation.getEmailError()).contains("Username and Password not accepted");
    }

    @Test
    void recoversStuckPendingInvitationsOlderThanThreshold() throws Exception {
        InvitationEmailDispatcher dispatcher = new InvitationEmailDispatcher(emailService, invitations);

        // Stuck invitation created 5 minutes ago
        Invitation stuck = new Invitation();
        stuck.setEmailStatus(InvitationEmailStatus.PENDING);
        stuck.setStatus(com.notifyhub.auth.InvitationStatus.PENDING);
        var createdAtField = Invitation.class.getDeclaredField("createdAt");
        createdAtField.setAccessible(true);
        createdAtField.set(stuck, Instant.now().minus(5, java.time.temporal.ChronoUnit.MINUTES));

        // Fresh invitation created 10 seconds ago
        Invitation fresh = new Invitation();
        fresh.setEmailStatus(InvitationEmailStatus.PENDING);
        fresh.setStatus(com.notifyhub.auth.InvitationStatus.PENDING);
        createdAtField.set(fresh, Instant.now().minus(10, java.time.temporal.ChronoUnit.SECONDS));

        when(invitations.findByEmailStatusAndStatus(InvitationEmailStatus.PENDING, com.notifyhub.auth.InvitationStatus.PENDING))
                .thenReturn(java.util.List.of(stuck, fresh));

        dispatcher.recoverStuckPendingInvitations();

        // Stuck invitation must be marked FAILED with resend guidance
        assertThat(stuck.getEmailStatus()).isEqualTo(InvitationEmailStatus.FAILED);
        assertThat(stuck.getEmailError()).contains("Click 'Resend'");
        verify(invitations).save(stuck);

        // Fresh invitation must NOT be touched
        assertThat(fresh.getEmailStatus()).isEqualTo(InvitationEmailStatus.PENDING);
        verify(invitations, never()).save(fresh);
    }
}
