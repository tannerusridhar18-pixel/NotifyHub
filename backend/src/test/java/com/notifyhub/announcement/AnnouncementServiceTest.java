package com.notifyhub.announcement;
import com.notifyhub.auth.*; import com.notifyhub.targeting.*; import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith; import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension; import org.springframework.context.ApplicationEventPublisher; import org.springframework.web.server.ResponseStatusException; import java.util.Optional; import static org.assertj.core.api.Assertions.*; import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class) class AnnouncementServiceTest {
 @Mock AnnouncementRepository repo; @Mock UserRepository users; @Mock TargetingService targeting; @Mock ApplicationEventPublisher events; @Mock com.notifyhub.rbac.AuditLogRepository audit; @InjectMocks AnnouncementService service;
 @Test void draftCanPublishAndThenUnpublish(){Announcement a=new Announcement();a.setCreatedBy(author());when(repo.findById(1L)).thenReturn(Optional.of(a));assertThat(service.publish(1L).status()).isEqualTo(AnnouncementStatus.PUBLISHED);assertThat(service.unpublish(1L).status()).isEqualTo(AnnouncementStatus.DRAFT);}
 @Test void archivedAnnouncementCannotBePublished(){Announcement a=new Announcement();a.setCreatedBy(author());a.setStatus(AnnouncementStatus.ARCHIVED);when(repo.findById(1L)).thenReturn(Optional.of(a));assertThatThrownBy(()->service.publish(1L)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("draft");}
 @Test void createsAsDraftWithServerAuthor(){User u=new User();u.setUsername("admin");u.setRole(Role.ADMIN);when(users.findByUsername("admin")).thenReturn(Optional.of(u));when(targeting.resolve(TargetType.GLOBAL,null,null,null,null,null,null)).thenReturn(new TargetingService.Target(TargetType.GLOBAL,null,null,null,null,null,null));when(repo.save(any())).thenAnswer(x->x.getArgument(0));var result=service.create(new AnnouncementService.Request("T","Body",false,TargetType.GLOBAL,null,null,null,null,null,null),"admin");assertThat(result.status()).isEqualTo(AnnouncementStatus.DRAFT);}

 @Test void departmentAdminCannotDeleteAnotherUsersAnnouncement(){
     User owner = new User(); owner.setId(1L); owner.setRole(Role.FACULTY);
     Announcement announcement = new Announcement(); announcement.setCreatedBy(owner);
     User departmentAdmin = new User(); departmentAdmin.setId(2L); departmentAdmin.setRole(Role.DEPARTMENT_ADMIN);
     when(repo.findById(7L)).thenReturn(Optional.of(announcement));
     when(users.findByUsername("deptadmin")).thenReturn(Optional.of(departmentAdmin));

     assertThatThrownBy(() -> service.delete(7L, "deptadmin"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("You can only manage announcements you authored");
     verify(repo, never()).delete(any(Announcement.class));
 }

 @Test
 void attachmentUrlValidationRejectsUnsafeSchemesAndBypasses() {
     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("javascript:alert(1)"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("not allowed");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("data:text/html,<script>alert(1)</script>"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("not allowed");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("file:///etc/passwd"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("not allowed");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("//evil.com/payload"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("Protocol-relative");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("///evil.com"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("Protocol-relative");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("/\\evil.com"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("backslashes");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("\\evil.com"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("backslashes");

     assertThatThrownBy(() -> AnnouncementService.validateAttachmentUrl("https://example.com/\u0000bad"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("control characters");
 }

 @Test
 void attachmentUrlValidationAcceptsSafeUrls() {
     assertThat(AnnouncementService.validateAttachmentUrl(null)).isNull();
     assertThat(AnnouncementService.validateAttachmentUrl("   ")).isNull();
     assertThat(AnnouncementService.validateAttachmentUrl("https://example.com/midterms.pdf"))
             .isEqualTo("https://example.com/midterms.pdf");
     assertThat(AnnouncementService.validateAttachmentUrl("http://campus.edu/files/notice.png"))
             .isEqualTo("http://campus.edu/files/notice.png");
     assertThat(AnnouncementService.validateAttachmentUrl("/uploads/syllabus.pdf"))
             .isEqualTo("/uploads/syllabus.pdf");
 }

 private User author(){User u=new User();u.setRole(Role.ADMIN);return u;}
}
