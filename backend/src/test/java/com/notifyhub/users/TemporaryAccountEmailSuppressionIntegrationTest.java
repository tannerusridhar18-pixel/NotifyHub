package com.notifyhub.users;

import com.notifyhub.announcement.Announcement;
import com.notifyhub.announcement.AnnouncementNotificationDispatcher;
import com.notifyhub.announcement.AnnouncementPublishedEvent;
import com.notifyhub.announcement.AnnouncementRepository;
import com.notifyhub.targeting.TargetType;
import com.notifyhub.auth.*;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.student.StudentProfileRepository;
import com.notifyhub.targeting.TargetingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TemporaryAccountEmailSuppressionIntegrationTest {

    @Mock JavaMailSender mailSender;
    @Mock UserRepository users;
    @Mock StudentProfileRepository students;
    @Mock FacultyProfileRepository faculty;
    @Mock AnnouncementRepository announcements;
    @Mock TargetingService targeting;
    @Mock InvitationEmailService invitationEmailService;
    @Mock InvitationRepository invitations;

    private AnnouncementNotificationDispatcher announcementDispatcher;
    private InvitationEmailDispatcher invitationDispatcher;

    @BeforeEach
    void setUp() {
        announcementDispatcher = new AnnouncementNotificationDispatcher(
                mailSender, users, students, faculty, announcements, targeting,
                true, "notifyhub@localhost", "http://localhost:3000", "/announcements"
        );
        invitationDispatcher = new InvitationEmailDispatcher(invitationEmailService, invitations);
    }

    @Test
    void temporaryAccountTriggersNoInvitationEmail() {
        UUID invitationId = UUID.randomUUID();
        Invitation inv = new Invitation();
        inv.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(invitationId)).thenReturn(Optional.of(inv));

        invitationDispatcher.dispatch(new InvitationCreatedEvent(
                invitationId, "temporary.student@notifyhub.local", "STUDENT", "raw-token", Instant.now().plusSeconds(3600)
        ));

        // Verify that NO email was sent via invitationEmailService
        verify(invitationEmailService, never()).send(any(), any(), any(), any());
        verify(invitations).save(argThat(i -> i.getEmailStatus() == InvitationEmailStatus.SENT
                && i.getEmailError() != null && i.getEmailError().contains("temporary account")));
    }

    @Test
    void legitimateAccountTriggersInvitationEmail() {
        UUID invitationId = UUID.randomUUID();
        Invitation inv = new Invitation();
        inv.setEmailStatus(InvitationEmailStatus.PENDING);
        when(invitations.findById(invitationId)).thenReturn(Optional.of(inv));

        invitationDispatcher.dispatch(new InvitationCreatedEvent(
                invitationId, "legitimate.user@gmail.com", "STUDENT", "raw-token", Instant.now().plusSeconds(3600)
        ));

        // Verify that email WAS sent via invitationEmailService for legitimate user
        verify(invitationEmailService).send(eq("legitimate.user@gmail.com"), eq("STUDENT"), eq("raw-token"), any());
        verify(invitations).save(argThat(i -> i.getEmailStatus() == InvitationEmailStatus.SENT && i.getEmailError() == null));
    }

    @Test
    void announcementNotificationsExcludeTemporaryAccountsAndIncludeLegitimateAccounts() {
        Long annId = 99L;
        Announcement announcement = new Announcement();
        setAnnouncementId(announcement, annId);
        announcement.setTitle("Campus Updates");
        announcement.setContent("Important update for students.");
        announcement.setTargetType(TargetType.GLOBAL);
        when(announcements.findById(annId)).thenReturn(Optional.of(announcement));

        // Temporary user with mustChangePassword = true (provisioned with temporary password in admin)
        User tempUser1 = new User();
        tempUser1.setEmail("temp.user1@school.edu");
        tempUser1.setAccountStatus(AccountStatus.ACTIVE);
        tempUser1.setActive(true);
        tempUser1.setMustChangePassword(true);

        // Temporary user with temporary/test email domain
        User tempUser2 = new User();
        tempUser2.setEmail("test.student@notifyhub.local");
        tempUser2.setAccountStatus(AccountStatus.ACTIVE);
        tempUser2.setActive(true);
        tempUser2.setMustChangePassword(false);

        // Legitimate active user
        User legitimateUser = new User();
        legitimateUser.setEmail("active.student@school.edu");
        legitimateUser.setAccountStatus(AccountStatus.ACTIVE);
        legitimateUser.setActive(true);
        legitimateUser.setMustChangePassword(false);

        when(users.findByAccountStatus(AccountStatus.ACTIVE)).thenReturn(List.of(tempUser1, tempUser2, legitimateUser));
        when(users.findByEmailIgnoreCase("temp.user1@school.edu")).thenReturn(Optional.of(tempUser1));
        when(users.findByEmailIgnoreCase("test.student@notifyhub.local")).thenReturn(Optional.of(tempUser2));
        when(users.findByEmailIgnoreCase("active.student@school.edu")).thenReturn(Optional.of(legitimateUser));
        when(targeting.matches(eq(announcement), any())).thenReturn(true);

        announcementDispatcher.dispatch(new AnnouncementPublishedEvent(
                annId, "Campus Updates", "Important update for students.", false, TargetType.GLOBAL,
                null, null, null, null, null, null
        ));

        // Capture all sent messages
        ArgumentCaptor<SimpleMailMessage> msgCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(1)).send(msgCaptor.capture());

        SimpleMailMessage sent = msgCaptor.getValue();
        assertThat(sent.getTo()).containsExactly("active.student@school.edu");
        assertThat(sent.getTo()).doesNotContain("temp.user1@school.edu");
        assertThat(sent.getTo()).doesNotContain("test.student@notifyhub.local");
    }

    private void setAnnouncementId(Announcement announcement, Long id) {
        try {
            Field idField = Announcement.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(announcement, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
