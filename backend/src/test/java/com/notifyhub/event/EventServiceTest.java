package com.notifyhub.event;
import com.notifyhub.academicstructure.Department;
import com.notifyhub.auth.*;
import com.notifyhub.targeting.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class) class EventServiceTest {
 @Mock EventRepository repo;
 @Mock UserRepository users;
 @Mock TargetingService targeting;
 @Mock EventRegistrationRepository registrations;
 @Mock com.notifyhub.student.StudentProfileRepository studentProfiles;
 @Mock com.notifyhub.rbac.AuditLogRepository audit;
 @Mock PasswordEncoder passwordEncoder;
 @InjectMocks EventService service;

 @Test void rejectsEndBeforeStart(){
     Instant now=Instant.now();
     User u = new User(); u.setUsername("a"); u.setRole(Role.ADMIN);
     org.mockito.Mockito.when(users.findByUsername("a")).thenReturn(Optional.of(u));
     assertThatThrownBy(()->service.create(new EventService.Request("T","D","L",now,now,TargetType.GLOBAL,null,null,null,null,null,null),"a")).isInstanceOf(ResponseStatusException.class).hasMessageContaining("after start");
 }
 @Test void cancelIsTerminal(){
     Event e=new Event();User u=new User();u.setRole(Role.ADMIN);e.setCreatedBy(u);
     org.mockito.Mockito.when(repo.findById(1L)).thenReturn(Optional.of(e));
     assertThat(service.cancel(1L).status()).isEqualTo(EventStatus.CANCELLED);
     assertThatThrownBy(()->service.cancel(1L)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("already cancelled");
 }

 @Test void studentCanRegisterSuccessfully() {
     Event e = new Event();
     e.setId(10L);
     e.setStatus(EventStatus.PUBLISHED);
     e.setRegistrationEnabled(true);
     org.mockito.Mockito.when(repo.findById(10L)).thenReturn(Optional.of(e));

     User student = new User();
     student.setId(42L);
     student.setUsername("student1");
     student.setEmail("student1@example.com");
     student.setRole(Role.STUDENT);
     org.mockito.Mockito.when(users.findByUsername("student1")).thenReturn(Optional.of(student));
     org.mockito.Mockito.when(targeting.matchesEvent(e, student)).thenReturn(true);
     org.mockito.Mockito.when(registrations.existsByEventIdAndStudentId(10L, 42L)).thenReturn(false);

     EventRegistration r = new EventRegistration();
     r.setEvent(e);
     r.setStudent(student);
     org.mockito.Mockito.when(registrations.save(ArgumentMatchers.any(EventRegistration.class))).thenReturn(r);

     EventService.RegistrationDto result = service.register(10L, "student1");
     assertThat(result.studentEmail()).isEqualTo("student1@example.com");
     assertThat(result.studentName()).isEqualTo("student1");
 }

 @Test void nonStudentCannotRegister() {
     Event e = new Event();
     e.setId(10L);
     org.mockito.Mockito.when(repo.findById(10L)).thenReturn(Optional.of(e));

     User faculty = new User();
     faculty.setId(99L);
     faculty.setUsername("faculty1");
     faculty.setRole(Role.FACULTY);
     org.mockito.Mockito.when(users.findByUsername("faculty1")).thenReturn(Optional.of(faculty));

     assertThatThrownBy(() -> service.register(10L, "faculty1"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("Only students can register for events");
 }

 @Test void duplicateRegistrationThrowsConflict() {
     Event e = new Event();
     e.setId(10L);
     e.setStatus(EventStatus.PUBLISHED);
     e.setRegistrationEnabled(true);
     org.mockito.Mockito.when(repo.findById(10L)).thenReturn(Optional.of(e));

     User student = new User();
     student.setId(42L);
     student.setUsername("student1");
     student.setEmail("student1@example.com");
     student.setRole(Role.STUDENT);
     org.mockito.Mockito.when(users.findByUsername("student1")).thenReturn(Optional.of(student));
     org.mockito.Mockito.when(targeting.matchesEvent(e, student)).thenReturn(true);
     org.mockito.Mockito.when(registrations.existsByEventIdAndStudentId(10L, 42L)).thenReturn(true);

     assertThatThrownBy(() -> service.register(10L, "student1"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("already registered");
 }

 @Test void departmentAdminCanViewOwnDepartmentRegistrations() {
     Event e = new Event();
     Department targetDept = new Department();
     targetDept.setId(100L);
     e.setTargetDepartment(targetDept);
     org.mockito.Mockito.when(repo.findById(5L)).thenReturn(Optional.of(e));

     User deptAdmin = new User();
     deptAdmin.setId(50L);
     deptAdmin.setRole(Role.DEPARTMENT_ADMIN);
     Department adminDept = new Department();
     adminDept.setId(100L); // same department
     deptAdmin.setDepartmentEntity(adminDept);
     org.mockito.Mockito.when(users.findByUsername("deptadmin")).thenReturn(Optional.of(deptAdmin));
     org.mockito.Mockito.when(registrations.findByEventIdOrderByRegisteredAtAsc(5L)).thenReturn(java.util.List.of());

     assertThat(service.registrations(5L, "deptadmin")).isEmpty();
 }

 @Test void departmentAdminCannotViewOtherDepartmentRegistrations() {
     Event e = new Event();
     Department targetDept = new Department();
     targetDept.setId(100L);
     e.setTargetDepartment(targetDept);
     User creator = new User();
     creator.setId(99L);
     e.setCreatedBy(creator);
     org.mockito.Mockito.when(repo.findById(5L)).thenReturn(Optional.of(e));

     User deptAdmin = new User();
     deptAdmin.setId(50L);
     deptAdmin.setRole(Role.DEPARTMENT_ADMIN);
     Department adminDept = new Department();
     adminDept.setId(200L); // different department
     deptAdmin.setDepartmentEntity(adminDept);
     org.mockito.Mockito.when(users.findByUsername("deptadmin")).thenReturn(Optional.of(deptAdmin));

     assertThatThrownBy(() -> service.registrations(5L, "deptadmin"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("Department admins can only view registrations for events within their department");
 }

 @Test void superAdminCanViewAnyDepartmentRegistrations() {
     Event e = new Event();
     Department targetDept = new Department();
     targetDept.setId(100L);
     e.setTargetDepartment(targetDept);
     org.mockito.Mockito.when(repo.findById(5L)).thenReturn(Optional.of(e));

     User superAdmin = new User();
     superAdmin.setId(1L);
     superAdmin.setRole(Role.SUPER_ADMIN);
     org.mockito.Mockito.when(users.findByUsername("superadmin")).thenReturn(Optional.of(superAdmin));
     org.mockito.Mockito.when(registrations.findByEventIdOrderByRegisteredAtAsc(5L)).thenReturn(java.util.List.of());

     assertThat(service.registrations(5L, "superadmin")).isEmpty();
 }

 @Test void saveDraftEventPersistedWithDraftStatus() {
     Instant start = Instant.now().plusSeconds(3600);
     Instant end = Instant.now().plusSeconds(7200);
     User creator = new User();
     creator.setId(1L);
     creator.setUsername("admin");
     creator.setRole(Role.SUPER_ADMIN);
     org.mockito.Mockito.when(users.findByUsername("admin")).thenReturn(Optional.of(creator));
     org.mockito.Mockito.when(targeting.resolve(ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any()))
             .thenReturn(new TargetingService.Target(TargetType.GLOBAL, null, null, null, null, null, null));

     org.mockito.Mockito.when(repo.save(ArgumentMatchers.any(Event.class))).thenAnswer(invocation -> {
         Event e = invocation.getArgument(0);
         e.setId(101L);
         return e;
     });

     EventService.Request req = new EventService.Request("Hackathon 2026", "Draft Desc", "Campus Hall", start, end, TargetType.GLOBAL, null, null, null, null, null, null);
     EventService.EventDto dto = service.create(req, "admin");

     assertThat(dto.id()).isEqualTo(101L);
     assertThat(dto.status()).isEqualTo(EventStatus.DRAFT);
     assertThat(dto.publishedAt()).isNull();
     assertThat(dto.title()).isEqualTo("Hackathon 2026");
 }

 @Test void updateDraftEventUpdatesFields() {
     Instant start = Instant.now().plusSeconds(3600);
     Instant end = Instant.now().plusSeconds(7200);
     User creator = new User();
     creator.setId(1L);
     creator.setUsername("admin");
     creator.setRole(Role.SUPER_ADMIN);

     Event existing = new Event();
     existing.setId(101L);
     existing.setStatus(EventStatus.DRAFT);
     existing.setCreatedBy(creator);
     existing.setTitle("Old Title");
     existing.setDescription("Old Desc");
     existing.setLocation("Old Loc");
     existing.setStartAt(start);
     existing.setEndAt(end);

     org.mockito.Mockito.when(repo.findById(101L)).thenReturn(Optional.of(existing));
     org.mockito.Mockito.when(users.findByUsername("admin")).thenReturn(Optional.of(creator));
     org.mockito.Mockito.when(targeting.resolve(ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any(), ArgumentMatchers.any()))
             .thenReturn(new TargetingService.Target(TargetType.GLOBAL, null, null, null, null, null, null));

     EventService.Request req = new EventService.Request("New Title", "New Desc", "New Loc", start, end, TargetType.GLOBAL, null, null, null, null, null, null);
     EventService.EventDto updated = service.update(101L, req, "admin");

     assertThat(updated.title()).isEqualTo("New Title");
     assertThat(updated.description()).isEqualTo("New Desc");
     assertThat(updated.status()).isEqualTo(EventStatus.DRAFT);
 }

 @Test void cannotUpdatePublishedEvent() {
     Instant start = Instant.now().plusSeconds(3600);
     Instant end = Instant.now().plusSeconds(7200);
     User creator = new User();
     creator.setId(1L);
     creator.setUsername("admin");
     creator.setRole(Role.SUPER_ADMIN);

     Event published = new Event();
     published.setId(102L);
     published.setStatus(EventStatus.PUBLISHED);
     published.setCreatedBy(creator);

     org.mockito.Mockito.when(repo.findById(102L)).thenReturn(Optional.of(published));
     org.mockito.Mockito.when(users.findByUsername("admin")).thenReturn(Optional.of(creator));

     EventService.Request req = new EventService.Request("New Title", "New Desc", "New Loc", start, end, TargetType.GLOBAL, null, null, null, null, null, null);
     assertThatThrownBy(() -> service.update(102L, req, "admin"))
             .isInstanceOf(ResponseStatusException.class)
             .hasMessageContaining("Only draft events may be edited");
 }

 @Test void publicFeedExcludesDrafts() {
     org.mockito.Mockito.when(repo.publicGlobal(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class)))
             .thenReturn(org.springframework.data.domain.Page.empty());

     com.notifyhub.common.PageResponse<EventService.EventDto> feed = service.publicFeed(0, 20);
     assertThat(feed.content()).isEmpty();
     org.mockito.Mockito.verify(repo).publicGlobal(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class));
 }
}
