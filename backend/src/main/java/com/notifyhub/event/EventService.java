package com.notifyhub.event;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.auth.*;
import com.notifyhub.common.PageResponse;
import com.notifyhub.rbac.AuditJson;
import com.notifyhub.rbac.AuditLog;
import com.notifyhub.rbac.AuditLogRepository;
import com.notifyhub.targeting.TargetType;
import com.notifyhub.targeting.TargetingService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class EventService {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final EventRepository repo;
    private final UserRepository users;
    private final TargetingService targeting;
    private final EventRegistrationRepository registrations;
    private final com.notifyhub.student.StudentProfileRepository studentProfiles;
    private final AuditLogRepository audit;

    public EventService(EventRepository repo, UserRepository users, TargetingService targeting,
                        EventRegistrationRepository registrations,
                        com.notifyhub.student.StudentProfileRepository studentProfiles,
                        AuditLogRepository audit) {
        this.repo = repo;
        this.users = users;
        this.targeting = targeting;
        this.registrations = registrations;
        this.studentProfiles = studentProfiles;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> publicFeed(int page, int size) {
        return PageResponse.from(repo.publicGlobal(PageRequest.of(page, size, Sort.by("startAt").ascending())).map(EventDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> upcoming(int page, int size) {
        return PageResponse.from(repo.upcomingGlobal(PageRequest.of(page, size)).map(EventDto::from));
    }

    /** Upcoming events the signed-in user is actually allowed to see. */
    @Transactional(readOnly = true)
    public PageResponse<EventDto> upcoming(String username, int page, int size) {
        User u = user(username);
        List<Event> all = repo.upcoming(org.springframework.data.domain.Pageable.unpaged()).getContent().stream()
                .filter(e -> u.getEffectiveLevel() == 0 || targeting.matchesEvent(e, u))
                .toList();
        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        List<EventDto> paged = all.subList(start, end).stream().map(EventDto::from).toList();
        return PageResponse.from(new PageImpl<>(paged, PageRequest.of(page, size), all.size()));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> visible(String username, int page, int size) {
        User user = user(username);
        if (user.getEffectiveLevel() == 0) return manage(page, size);

        List<Event> allPublished = repo.findAll(Sort.by("startAt").ascending()).stream()
                .filter(e -> e.getStatus() == EventStatus.PUBLISHED && targeting.matchesEvent(e, user))
                .toList();

        int start = Math.min(page * size, allPublished.size());
        int end = Math.min(start + size, allPublished.size());
        List<EventDto> paged = allPublished.subList(start, end).stream().map(EventDto::from).toList();
        Page<EventDto> pageResult = new PageImpl<>(paged, PageRequest.of(page, size), allPublished.size());
        return PageResponse.from(pageResult);
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> myPosts(String username, int page, int size) {
        User user = user(username);
        Page<Event> paged = repo.findByCreatedById(user.getId(), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(paged.map(EventDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> manage(int page, int size) {
        return PageResponse.from(repo.findAll(PageRequest.of(page, size, Sort.by("startAt").ascending())).map(EventDto::from));
    }

    public EventDto create(Request request, String username) {
        User sender = user(username);
        List<String> targetList = parseTargets(request.recipientTargets());
        targeting.validateSenderPermissions(sender, request.recipientType(), targetList, request.departmentId(), request.targetType(), request.branchId(), request.sectionId());

        Event event = new Event();
        apply(event, request);
        event.setCreatedBy(sender);
        Event saved = repo.save(event);
        audit.save(new AuditLog(sender, "EVENT_CREATE", "EVENT", String.valueOf(saved.getId()), AuditJson.title(saved.getTitle())));
        return EventDto.from(saved);
    }

    @Transactional(readOnly = true)
    public EventDto getForViewer(Long id, String username) {
        Event event = get(id);
        User viewer = username == null ? null : user(username);
        if (event.getStatus() != EventStatus.PUBLISHED) {
            if (viewer == null || (viewer.getEffectiveLevel() != 0 && !viewer.getId().equals(event.getCreatedBy().getId())))
                throw notFound();
        } else if (viewer == null) {
            if (event.getTargetType() != TargetType.GLOBAL && !"all".equalsIgnoreCase(event.getRecipientType()) && !"all_campus".equalsIgnoreCase(event.getRecipientType()))
                throw notFound();
        } else if (viewer.getEffectiveLevel() != 0 && !targeting.matchesEvent(event, viewer) && !viewer.getId().equals(event.getCreatedBy().getId())) {
            throw notFound();
        }
        return EventDto.from(event);
    }

    public EventDto update(Long id, Request request, String username) {
        Event event = get(id);
        if (event.getStatus() != EventStatus.DRAFT) throw conflict("Only draft events may be edited.");
        User sender = user(username);
        if (sender.getEffectiveLevel() > 0 && !sender.getId().equals(event.getCreatedBy().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only edit events you authored.");
        }
        List<String> targetList = parseTargets(request.recipientTargets());
        targeting.validateSenderPermissions(sender, request.recipientType(), targetList, request.departmentId(), request.targetType(), request.branchId(), request.sectionId());

        apply(event, request);
        audit.save(new AuditLog(sender, "EVENT_EDIT", "EVENT", String.valueOf(event.getId()), AuditJson.title(event.getTitle())));
        return EventDto.from(event);
    }

    public EventDto update(Long id, Request request) {
        Event event = get(id);
        if (event.getStatus() != EventStatus.DRAFT) throw conflict("Only draft events may be edited.");
        apply(event, request);
        return EventDto.from(event);
    }

    public EventDto publish(Long id) {
        Event event = get(id);
        if (event.getStatus() != EventStatus.DRAFT) throw conflict("Only draft events may be published.");
        event.setStatus(EventStatus.PUBLISHED);
        event.setPublishedAt(Instant.now());
        audit.save(new AuditLog(event.getCreatedBy(), "EVENT_PUBLISH", "EVENT", String.valueOf(event.getId()), "{}"));
        return EventDto.from(event);
    }

    public EventDto unpublish(Long id) {
        Event event = get(id);
        if (event.getStatus() != EventStatus.PUBLISHED) throw conflict("Only published events may be unpublished.");
        event.setStatus(EventStatus.DRAFT);
        event.setPublishedAt(null);
        audit.save(new AuditLog(event.getCreatedBy(), "EVENT_UNPUBLISH", "EVENT", String.valueOf(event.getId()), "{}"));
        return EventDto.from(event);
    }

    public EventDto cancel(Long id) {
        Event event = get(id);
        if (event.getStatus() == EventStatus.CANCELLED) throw conflict("Event is already cancelled.");
        event.setStatus(EventStatus.CANCELLED);
        audit.save(new AuditLog(event.getCreatedBy(), "EVENT_CANCEL", "EVENT", String.valueOf(event.getId()), "{}"));
        return EventDto.from(event);
    }

    public void delete(Long id) {
        Event event = get(id);
        if (event.getStatus() == EventStatus.PUBLISHED) throw conflict("Unpublish or cancel this event before deleting it.");
        audit.save(new AuditLog(event.getCreatedBy(), "EVENT_DELETE", "EVENT", String.valueOf(event.getId()), "{}"));
        repo.delete(event);
    }

    public RegistrationDto register(Long id, String username) {
        Event event = get(id);
        User student = user(username);
        if (event.getStatus() != EventStatus.PUBLISHED || !targeting.matchesEvent(event, student))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not eligible for this event.");
        if (!event.isRegistrationEnabled())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration is not enabled.");
        if (event.getRegistrationDeadline() != null && !event.getRegistrationDeadline().isAfter(Instant.now()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration deadline has passed.");
        if (registrations.existsByEventIdAndStudentId(id, student.getId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already registered.");

        EventRegistration r = new EventRegistration();
        r.setEvent(event);
        r.setStudent(student);
        EventRegistration saved = registrations.save(r);
        audit.save(new AuditLog(student, "EVENT_REGISTER", "EVENT", String.valueOf(event.getId()), "{\"eventId\":" + event.getId() + "}"));
        return toRegistrationDto(saved);
    }

    @Transactional(readOnly = true)
    public List<StudentRegistrationView> myRegistrations(String username) {
        User student = user(username);
        return registrations.findByStudentIdOrderByRegisteredAtDesc(student.getId()).stream().map(r -> {
            Event e = r.getEvent();
            return new StudentRegistrationView(
                    r.getId(),
                    e.getId(),
                    e.getTitle(),
                    e.getDescription(),
                    e.getLocation(),
                    e.getStartAt(),
                    e.getEndAt(),
                    e.getStatus(),
                    r.getRegisteredAt()
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> registrations(Long id, String username) {
        Event event = get(id);
        User actor = user(username);
        if ("STUDENT".equalsIgnoreCase(actor.getEffectiveRoleName()) || actor.getRole() == Role.STUDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view these registrations.");
        }
        if (!actor.hasAdminAccess()) {
            Long actorDeptId = actor.getDepartmentEntity() != null ? actor.getDepartmentEntity().getId() : null;
            Long eventDeptId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId()
                    : (event.getCreatedBy().getDepartmentEntity() != null ? event.getCreatedBy().getDepartmentEntity().getId() : null);
            boolean isCreator = event.getCreatedBy().getId().equals(actor.getId());
            boolean isSameDept = actorDeptId != null && actorDeptId.equals(eventDeptId);
            if (!isCreator && !isSameDept) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view these registrations.");
            }
        }
        return registrations.findByEventIdOrderByRegisteredAtAsc(id).stream().map(this::toRegistrationDto).toList();
    }

    private RegistrationDto toRegistrationDto(EventRegistration r) {
        var u = r.getStudent();
        var profile = studentProfiles.findByUserId(u.getId()).orElse(null);
        String stuId = profile != null && profile.getStudentId() != null ? profile.getStudentId() : String.valueOf(u.getId());
        String deptName = u.getDepartment();
        Integer year = null;
        String sectionName = null;
        if (profile != null) {
            if (profile.getDepartment() != null) deptName = profile.getDepartment().getName();
            year = profile.getYear();
            if (profile.getSection() != null) sectionName = profile.getSection().getName();
        }
        return new RegistrationDto(r.getId(), stuId, u.getEmail(), profile != null ? profile.getName() : u.getUsername(), deptName, year, sectionName, r.getRegisteredAt());
    }

    private void apply(Event event, Request request) {
        if (!request.endAt().isAfter(request.startAt())) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Event end time must be after start time.");
        event.setTitle(request.title());
        event.setDescription(request.description());
        event.setLocation(request.location());
        event.setStartAt(request.startAt());
        event.setEndAt(request.endAt());
        TargetType tt = request.targetType() != null ? request.targetType() : TargetType.GLOBAL;
        var target = targeting.resolve(tt, request.departmentId(), request.branchId(), request.sectionId(), request.hostelId(), request.userEmail(), request.role());
        event.setTargetType(target.type());
        event.setTargetDepartment(target.department());
        event.setTargetBranch(target.branch());
        event.setTargetSection(target.section());
        event.setTargetHostel(target.hostel());
        event.setTargetUser(target.user());
        event.setTargetRole(target.role());
        event.setRecipientType(request.recipientType() != null ? request.recipientType() : (request.targetType() != null ? request.targetType().name().toLowerCase() : "all"));
        event.setRecipientTargets(request.recipientTargets());
        event.setPhotoUrl(request.photoUrl());
        event.setExternalLink(request.externalLink());
        event.setRegistrationEnabled(request.registrationEnabled());
        event.setRegistrationDeadline(request.registrationDeadline());
    }

    private List<String> parseTargets(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            List<String> s = new ArrayList<>();
            s.add(json.trim());
            return s;
        }
    }

    /** Same rule as update(): level-0 admins manage anything; everyone else only what they authored. */
    private void assertCanManage(Long id, String username) {
        Event event = get(id);
        User actor = user(username);
        Long ownerId = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;
        if (!actor.hasAdminAccess() && !actor.getId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage events you authored.");
        }
    }
    public EventDto publish(Long id, String username) { assertCanManage(id, username); return publish(id); }
    public EventDto unpublish(Long id, String username) { assertCanManage(id, username); return unpublish(id); }
    public EventDto cancel(Long id, String username) { assertCanManage(id, username); return cancel(id); }
    public void delete(Long id, String username) { assertCanManage(id, username); delete(id); }

    private Event get(Long id) { return repo.findById(id).orElseThrow(this::notFound); }
    private User user(String username) { return users.findByUsername(username).orElseGet(() -> users.findByEmailIgnoreCase(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized."))); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found."); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }

    public record Request(
            @NotBlank @Size(max = 180) String title,
            @NotBlank @Size(max = 10000) String description,
            @NotBlank @Size(max = 180) String location,
            @NotNull Instant startAt,
            @NotNull Instant endAt,
            TargetType targetType,
            Long departmentId,
            Long branchId,
            Long sectionId,
            Long hostelId,
            String userEmail,
            Role role,
            String recipientType,
            String recipientTargets,
            @Size(max=2048) String photoUrl,
            @Size(max=2048) String externalLink,
            boolean registrationEnabled,
            Instant registrationDeadline
    ) {
        public Request(String title, String description, String location, Instant startAt, Instant endAt, TargetType targetType, Long departmentId, Long branchId, Long sectionId, Long hostelId, String userEmail, Role role) {
            this(title, description, location, startAt, endAt, targetType, departmentId, branchId, sectionId, hostelId, userEmail, role, targetType != null ? targetType.name().toLowerCase() : "all", null, null, null, false, null);
        }
    }

    public record EventDto(
            Long id,
            String title,
            String description,
            String location,
            Instant startAt,
            Instant endAt,
            EventStatus status,
            TargetType targetType,
            Long departmentId,
            Long branchId,
            Long sectionId,
            Long hostelId,
            String userEmail,
            Role role,
            String recipientType,
            String recipientTargets,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            Long authorId,
            String authorRole,
            String photoUrl,
            String externalLink,
            boolean registrationEnabled,
            Instant registrationDeadline
    ) {
        static EventDto from(Event event) {
            return new EventDto(
                    event.getId(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getLocation(),
                    event.getStartAt(),
                    event.getEndAt(),
                    event.getStatus(),
                    event.getTargetType(),
                    event.getTargetDepartment() == null ? null : event.getTargetDepartment().getId(),
                    event.getTargetBranch() == null ? null : event.getTargetBranch().getId(),
                    event.getTargetSection() == null ? null : event.getTargetSection().getId(),
                    event.getTargetHostel() == null ? null : event.getTargetHostel().getId(),
                    event.getTargetUser() == null ? null : event.getTargetUser().getEmail(),
                    event.getTargetRole(),
                    event.getRecipientType(),
                    event.getRecipientTargets(),
                    event.getPublishedAt(),
                    event.getCreatedAt(),
                    event.getUpdatedAt(),
                    event.getCreatedBy().getId(),
                    event.getCreatedBy().getEffectiveRoleName(),
                    event.getPhotoUrl(),
                    event.getExternalLink(),
                    event.isRegistrationEnabled(),
                    event.getRegistrationDeadline()
            );
        }
    }
    public record RegistrationDto(Long id, String studentId, String studentEmail, String studentName, String department, Integer year, String section, Instant registeredAt) {
      static RegistrationDto from(EventRegistration r) { var u=r.getStudent(); return new RegistrationDto(r.getId(),String.valueOf(u.getId()),u.getEmail(),u.getUsername(),u.getDepartment(),null,null,r.getRegisteredAt()); }
    }
    public record StudentRegistrationView(Long registrationId, Long eventId, String title, String description, String location, Instant startAt, Instant endAt, EventStatus status, Instant registeredAt) {}
}
