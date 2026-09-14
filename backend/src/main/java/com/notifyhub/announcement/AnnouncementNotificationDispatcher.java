package com.notifyhub.announcement;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.stream.Stream;

/**
 * Sends an email notification to the announcement's target audience once it
 * is published. This is what makes NotifyHub actually "notify" people,
 * rather than only updating a feed they have to check manually.
 *
 * Reuses the same SMTP configuration and enable flag as invitation emails
 * (notifyhub.mail.enabled / notifyhub.mail.from) and the same async,
 * after-commit dispatch pattern as InvitationEmailDispatcher so a slow or
 * failing mail server never blocks or fails the publish request itself.
 */
@Service
public class AnnouncementNotificationDispatcher {
    private static final Logger log = LoggerFactory.getLogger(AnnouncementNotificationDispatcher.class);

    private final JavaMailSender mailSender;
    private final UserRepository users;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final boolean enabled;
    private final String from;
    private final String frontendOrigin;
    private final String announcementPath;

    public AnnouncementNotificationDispatcher(JavaMailSender mailSender, UserRepository users,
                                              StudentProfileRepository students, FacultyProfileRepository faculty,
                                              @Value("${notifyhub.mail.enabled:false}") boolean enabled,
                                              @Value("${notifyhub.mail.from:notifyhub@localhost}") String from,
                                              @Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin,
                                              @Value("${notifyhub.mail.announcement-path:/announcements}") String announcementPath) {
        this.mailSender = mailSender;
        this.users = users;
        this.students = students;
        this.faculty = faculty;
        this.enabled = enabled;
        this.from = from;
        this.frontendOrigin = frontendOrigin.replaceAll("/$", "");
        this.announcementPath = announcementPath;
    }

    @Async("notifyHubTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void dispatch(AnnouncementPublishedEvent event) {
        if (!enabled) {
            log.debug("Announcement notification email delivery is disabled; skipping announcement {}.", event.announcementId());
            return;
        }
        List<String> recipients = resolveRecipients(event);
        if (recipients.isEmpty()) {
            log.info("Announcement {} published with no notifiable recipients for its target scope.", event.announcementId());
            return;
        }
        String subject = (event.urgent() ? "[URGENT] " : "") + "NotifyHub: " + event.title();
        String body = event.content() + "\n\nView all announcements: " + frontendOrigin + announcementPath;
        int sent = 0;
        int failed = 0;
        for (String email : recipients) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(from);
                message.setTo(email);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                sent++;
            } catch (RuntimeException ex) {
                failed++;
                log.warn("Failed to deliver announcement {} notification to a recipient: {}", event.announcementId(), safeMessage(ex));
            }
        }
        log.info("Announcement {} notification dispatch complete: {} sent, {} failed, {} total recipients.",
                event.announcementId(), sent, failed, recipients.size());
    }

    private List<String> resolveRecipients(AnnouncementPublishedEvent event) {
        return switch (event.targetType()) {
            case GLOBAL -> users.findByAccountStatus(AccountStatus.ACTIVE).stream()
                    .map(User::getEmail).distinct().toList();
            case ROLE -> users.findByAccountStatusAndRole(AccountStatus.ACTIVE, event.role()).stream()
                    .map(User::getEmail).distinct().toList();
            case DEPARTMENT -> Stream.concat(
                            students.findByDepartmentId(event.departmentId()).stream().map(StudentProfile::getUser),
                            faculty.findByDepartmentId(event.departmentId()).stream().map(FacultyProfile::getUser))
                    .filter(User::isActive).map(User::getEmail).distinct().toList();
            case BRANCH -> students.findByBranchId(event.branchId()).stream().map(StudentProfile::getUser)
                    .filter(User::isActive).map(User::getEmail).distinct().toList();
            case SECTION -> students.findBySectionId(event.sectionId()).stream().map(StudentProfile::getUser)
                    .filter(User::isActive).map(User::getEmail).distinct().toList();
                case HOSTEL -> students.findByHostelId(event.hostelId()).stream().map(StudentProfile::getUser)
                    .filter(User::isActive).map(User::getEmail).distinct().toList();
                case USER -> users.findById(event.userId()).filter(User::isActive).map(User::getEmail).stream().toList();
        };
    }

    private String safeMessage(RuntimeException ex) {
        String message = ex.getMessage();
        return message == null || message.isBlank() ? ex.getClass().getSimpleName() : message;
    }
}
