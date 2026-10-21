package com.notifyhub.announcement;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import com.notifyhub.targeting.TargetingService;
import com.notifyhub.mail.EmailTransport;
import com.notifyhub.mail.SmtpEmailTransport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
 * Uses the EmailTransport abstraction (SMTP or Resend HTTPS) and the same
 * async, after-commit dispatch pattern as InvitationEmailDispatcher so a slow
 * or failing mail server never blocks or fails the publish request itself.
 */
@Service
public class AnnouncementNotificationDispatcher {
    private static final Logger log = LoggerFactory.getLogger(AnnouncementNotificationDispatcher.class);

    private final EmailTransport transport;
    private final UserRepository users;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final AnnouncementRepository announcements;
    private final TargetingService targeting;
    private final boolean enabled;
    private final String from;
    private final String frontendOrigin;
    private final String announcementPath;

    @org.springframework.beans.factory.annotation.Autowired
    public AnnouncementNotificationDispatcher(EmailTransport transport, UserRepository users,
                                              StudentProfileRepository students, FacultyProfileRepository faculty,
                                              AnnouncementRepository announcements, TargetingService targeting,
                                              @Value("${notifyhub.mail.enabled:false}") boolean enabled,
                                              @Value("${notifyhub.mail.from:notifyhub@localhost}") String from,
                                              @Value("${notifyhub.frontend-origin:http://localhost:3000}") String frontendOrigin,
                                              @Value("${notifyhub.mail.announcement-path:/announcements}") String announcementPath) {
        this.transport = transport;
        this.users = users;
        this.students = students;
        this.faculty = faculty;
        this.announcements = announcements;
        this.targeting = targeting;
        this.enabled = enabled;
        this.from = from;
        this.frontendOrigin = frontendOrigin.replaceAll("/$", "");
        this.announcementPath = announcementPath;
    }

    public AnnouncementNotificationDispatcher(JavaMailSender mailSender, UserRepository users,
                                              StudentProfileRepository students, FacultyProfileRepository faculty,
                                              AnnouncementRepository announcements, TargetingService targeting,
                                              boolean enabled, String from, String frontendOrigin, String announcementPath) {
        this(new SmtpEmailTransport(mailSender), users, students, faculty, announcements, targeting, enabled, from, frontendOrigin, announcementPath);
    }

    @Async("notifyHubTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void dispatch(AnnouncementPublishedEvent event) {
        if (!enabled) {
            log.debug("Announcement notification email delivery is disabled; skipping announcement {}.", event.announcementId());
            return;
        }
        List<String> recipients = filterByAudience(event, resolveRecipients(event));
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
                transport.send(from, email, subject, body);
                sent++;
            } catch (RuntimeException ex) {
                failed++;
                log.warn("Failed to deliver announcement {} notification to a recipient: {}", event.announcementId(), safeMessage(ex));
            }
        }
        log.info("Announcement {} notification dispatch complete: {} sent, {} failed, {} total recipients.",
                event.announcementId(), sent, failed, recipients.size());
    }

    private boolean isEligibleRecipient(User user) {
        if (user == null || !user.isActive()) return false;
        if (user.isMustChangePassword()) {
            return false;
        }
        return !com.notifyhub.users.InvitationEmailDispatcher.isTemporaryAccount(user.getEmail());
    }

    /** The e-mail must reach only people who are allowed to see the announcement (recipient type, year, faculty-only, ...). */
    private List<String> filterByAudience(AnnouncementPublishedEvent event, List<String> emails) {
        Announcement announcement = announcements.findById(event.announcementId()).orElse(null);
        if (announcement == null) {
            return emails.stream()
                    .filter(e -> !com.notifyhub.users.InvitationEmailDispatcher.isTemporaryAccount(e))
                    .toList();
        }
        return emails.stream()
                .filter(email -> users.findByEmailIgnoreCase(email)
                        .map(user -> isEligibleRecipient(user) && targeting.matches(announcement, user))
                        .orElse(false))
                .toList();
    }

    private List<String> resolveRecipients(AnnouncementPublishedEvent event) {
        return switch (event.targetType()) {
            case GLOBAL -> users.findByAccountStatus(AccountStatus.ACTIVE).stream()
                    .filter(this::isEligibleRecipient)
                    .map(User::getEmail).distinct().toList();
            case ROLE -> users.findByAccountStatusAndRole(AccountStatus.ACTIVE, event.role()).stream()
                    .filter(this::isEligibleRecipient)
                    .map(User::getEmail).distinct().toList();
            case DEPARTMENT -> Stream.concat(
                            students.findByDepartmentId(event.departmentId()).stream().map(StudentProfile::getUser),
                            faculty.findByDepartmentId(event.departmentId()).stream().map(FacultyProfile::getUser))
                    .filter(this::isEligibleRecipient).map(User::getEmail).distinct().toList();
            case BRANCH -> students.findByBranchId(event.branchId()).stream().map(StudentProfile::getUser)
                    .filter(this::isEligibleRecipient).map(User::getEmail).distinct().toList();
            case SECTION -> students.findBySectionId(event.sectionId()).stream().map(StudentProfile::getUser)
                    .filter(this::isEligibleRecipient).map(User::getEmail).distinct().toList();
            case HOSTEL -> students.findByHostelId(event.hostelId()).stream().map(StudentProfile::getUser)
                    .filter(this::isEligibleRecipient).map(User::getEmail).distinct().toList();
            case USER -> users.findById(event.userId()).filter(this::isEligibleRecipient).map(User::getEmail).stream().toList();
        };
    }

    private String safeMessage(RuntimeException ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        return message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;]+", "$1=***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***");
    }
}
