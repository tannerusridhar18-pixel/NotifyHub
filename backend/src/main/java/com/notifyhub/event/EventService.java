package com.notifyhub.event;

import com.notifyhub.auth.*;
import com.notifyhub.common.PageResponse;
import com.notifyhub.targeting.TargetType;
import com.notifyhub.targeting.TargetingService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Objects;

@Service
@Transactional
public class EventService {
    private final EventRepository repo;
    private final UserRepository users;
    private final TargetingService targeting;

    public EventService(EventRepository repo, UserRepository users, TargetingService targeting) {
        this.repo = repo;
        this.users = users;
        this.targeting = targeting;
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> publicFeed(int page, int size) {
        return PageResponse.from(repo.publicGlobal(PageRequest.of(page, size, Sort.by("startAt").ascending())).map(EventDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> upcoming(int page, int size) {
        return PageResponse.from(repo.upcoming(PageRequest.of(page, size)).map(EventDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> visible(String username, int page, int size) {
        User user = user(username);
        if (user.getRole() == Role.ADMIN) return manage(page, size);
        var scope = targeting.scope(user);
        return PageResponse.from(repo.visible(scope.role(), scope.departmentId(), scope.branchId(), scope.sectionId(), scope.hostelId(), scope.userId(), PageRequest.of(page, size, Sort.by("startAt").ascending())).map(EventDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventDto> manage(int page, int size) {
        return PageResponse.from(repo.findAll(PageRequest.of(page, size, Sort.by("startAt").ascending())).map(EventDto::from));
    }

    public EventDto create(Request request, String username) {
        Event event = new Event();
        apply(event, request);
        event.setCreatedBy(user(username));
        return EventDto.from(repo.save(event));
    }

    @Transactional(readOnly = true)
    public EventDto getForViewer(Long id, String username) {
        Event event = get(id);
        User viewer = username == null ? null : user(username);
        if (event.getStatus() != EventStatus.PUBLISHED) {
            if (viewer == null || viewer.getRole() != Role.ADMIN) throw notFound();
        } else if (viewer == null) {
            if (event.getTargetType() != TargetType.GLOBAL) throw notFound();
        } else if (viewer.getRole() != Role.ADMIN && !matches(event, targeting.scope(viewer))) {
            throw notFound();
        }
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
        return EventDto.from(event);
    }

    public EventDto unpublish(Long id) {
        Event event = get(id);
        if (event.getStatus() != EventStatus.PUBLISHED) throw conflict("Only published events may be unpublished.");
        event.setStatus(EventStatus.DRAFT);
        event.setPublishedAt(null);
        return EventDto.from(event);
    }

    public EventDto cancel(Long id) {
        Event event = get(id);
        if (event.getStatus() == EventStatus.CANCELLED) throw conflict("Event is already cancelled.");
        event.setStatus(EventStatus.CANCELLED);
        return EventDto.from(event);
    }

    public void delete(Long id) {
        Event event = get(id);
        if (event.getStatus() == EventStatus.PUBLISHED) throw conflict("Unpublish or cancel this event before deleting it.");
        repo.delete(event);
    }

    private void apply(Event event, Request request) {
        if (!request.endAt().isAfter(request.startAt())) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Event end time must be after start time.");
        event.setTitle(request.title());
        event.setDescription(request.description());
        event.setLocation(request.location());
        event.setStartAt(request.startAt());
        event.setEndAt(request.endAt());
        var target = targeting.resolve(request.targetType(), request.departmentId(), request.branchId(), request.sectionId(), request.hostelId(), request.userEmail(), request.role());
        event.setTargetType(target.type());
        event.setTargetDepartment(target.department());
        event.setTargetBranch(target.branch());
        event.setTargetSection(target.section());
        event.setTargetHostel(target.hostel());
        event.setTargetUser(target.user());
        event.setTargetRole(target.role());
    }

    private boolean matches(Event event, TargetingService.Scope scope) {
        return event.getTargetType() == TargetType.GLOBAL
                || event.getTargetType() == TargetType.ROLE && event.getTargetRole() == scope.role()
                || event.getTargetType() == TargetType.DEPARTMENT && Objects.equals(event.getTargetDepartment().getId(), scope.departmentId())
                || event.getTargetType() == TargetType.BRANCH && Objects.equals(event.getTargetBranch().getId(), scope.branchId())
                || event.getTargetType() == TargetType.SECTION && Objects.equals(event.getTargetSection().getId(), scope.sectionId())
                || event.getTargetType() == TargetType.HOSTEL && Objects.equals(event.getTargetHostel().getId(), scope.hostelId())
                || event.getTargetType() == TargetType.USER && Objects.equals(event.getTargetUser().getId(), scope.userId());
    }

    private Event get(Long id) { return repo.findById(id).orElseThrow(this::notFound); }
    private User user(String username) { return users.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized.")); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found."); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }

    public record Request(@NotBlank @Size(max = 180) String title, @NotBlank @Size(max = 10000) String description, @NotBlank @Size(max = 180) String location, @NotNull Instant startAt, @NotNull Instant endAt, @NotNull TargetType targetType, Long departmentId, Long branchId, Long sectionId, Long hostelId, String userEmail, Role role) { }
    public record EventDto(Long id, String title, String description, String location, Instant startAt, Instant endAt, EventStatus status, TargetType targetType, Long departmentId, Long branchId, Long sectionId, Long hostelId, String userEmail, Role role, Instant publishedAt, Instant createdAt, Instant updatedAt, Long authorId) {
        static EventDto from(Event event) { return new EventDto(event.getId(), event.getTitle(), event.getDescription(), event.getLocation(), event.getStartAt(), event.getEndAt(), event.getStatus(), event.getTargetType(), event.getTargetDepartment() == null ? null : event.getTargetDepartment().getId(), event.getTargetBranch() == null ? null : event.getTargetBranch().getId(), event.getTargetSection() == null ? null : event.getTargetSection().getId(), event.getTargetHostel() == null ? null : event.getTargetHostel().getId(), event.getTargetUser() == null ? null : event.getTargetUser().getEmail(), event.getTargetRole(), event.getPublishedAt(), event.getCreatedAt(), event.getUpdatedAt(), event.getCreatedBy().getId()); }
    }
}
