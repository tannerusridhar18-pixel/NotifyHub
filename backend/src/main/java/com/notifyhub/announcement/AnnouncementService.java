package com.notifyhub.announcement;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.auth.*;
import com.notifyhub.common.PageResponse;
import com.notifyhub.rbac.AuditJson;
import com.notifyhub.rbac.AuditLog;
import com.notifyhub.rbac.AuditLogRepository;
import com.notifyhub.targeting.*;
import jakarta.validation.constraints.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class AnnouncementService {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AnnouncementRepository repo;
    private final UserRepository users;
    private final TargetingService targeting;
    private final ApplicationEventPublisher events;
    private final AuditLogRepository audit;

    public AnnouncementService(AnnouncementRepository r, UserRepository u, TargetingService t, ApplicationEventPublisher e, AuditLogRepository audit) {
        this.repo = r;
        this.users = u;
        this.targeting = t;
        this.events = e;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnouncementDto> publicFeed(int page, int size) {
        return PageResponse.from(repo.publicGlobal(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt"))).map(AnnouncementDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnouncementDto> urgent(int page, int size) {
        return PageResponse.from(repo.urgentGlobal(PageRequest.of(page, size)).map(AnnouncementDto::from));
    }

    /** Urgent announcements the signed-in user is actually allowed to see. */
    @Transactional(readOnly = true)
    public PageResponse<AnnouncementDto> urgent(String username, int page, int size) {
        User u = user(username);
        List<Announcement> all = repo.urgent(org.springframework.data.domain.Pageable.unpaged()).getContent().stream()
                .filter(a -> u.getEffectiveLevel() == 0 || targeting.matches(a, u))
                .toList();
        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        List<AnnouncementDto> paged = all.subList(start, end).stream().map(AnnouncementDto::from).toList();
        return PageResponse.from(new PageImpl<>(paged, PageRequest.of(page, size), all.size()));
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnouncementDto> visible(String username, int page, int size) {
        User u = user(username);
        if (u.getEffectiveLevel() == 0) {
            return PageResponse.from(repo.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).map(AnnouncementDto::from));
        }
        List<Announcement> allPublished = repo.findAll(Sort.by(Sort.Direction.DESC, "publishedAt")).stream()
                .filter(a -> a.getStatus() == AnnouncementStatus.PUBLISHED && targeting.matches(a, u))
                .toList();

        int start = Math.min(page * size, allPublished.size());
        int end = Math.min(start + size, allPublished.size());
        List<AnnouncementDto> paged = allPublished.subList(start, end).stream().map(AnnouncementDto::from).toList();
        Page<AnnouncementDto> pageResult = new PageImpl<>(paged, PageRequest.of(page, size), allPublished.size());
        return PageResponse.from(pageResult);
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnouncementDto> myPosts(String username, int page, int size) {
        User u = user(username);
        boolean isSuperAdmin = u.getRole() == Role.SUPER_ADMIN
                || "SUPER_ADMIN".equalsIgnoreCase(u.getEffectiveRoleName())
                || (u.getRoleEntity() != null && u.getRoleEntity().isSuperadmin());
        if (isSuperAdmin) {
            Page<Announcement> paged = repo.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
            return PageResponse.from(paged.map(AnnouncementDto::from));
        }

        boolean isDeptAdmin = u.getRole() == Role.DEPARTMENT_ADMIN
                || "DEPARTMENT_ADMIN".equalsIgnoreCase(u.getEffectiveRoleName());
        if (isDeptAdmin && u.getDepartmentEntity() != null) {
            Page<Announcement> paged = repo.findByDepartment(u.getDepartmentEntity().getId(), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
            return PageResponse.from(paged.map(AnnouncementDto::from));
        }

        Page<Announcement> paged = repo.findByCreatedById(u.getId(), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(paged.map(AnnouncementDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<AnnouncementDto> manage(int page, int size) {
        return PageResponse.from(repo.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).map(AnnouncementDto::from));
    }

    public AnnouncementDto create(Request r, String username) {
        User sender = user(username);
        List<String> targetList = parseTargets(r.recipientTargets());
        targeting.validateSenderPermissions(sender, r.recipientType(), targetList, r.departmentId(), r.targetType(), r.branchId(), r.sectionId(), r.userEmail(), r.role());

        Announcement a = new Announcement();
        apply(a, r);
        a.setCreatedBy(sender);
        Announcement saved = repo.save(a);
        audit.save(new AuditLog(sender, "ANNOUNCEMENT_CREATE", "ANNOUNCEMENT", String.valueOf(saved.getId()), AuditJson.title(saved.getTitle())));
        return AnnouncementDto.from(saved);
    }

    @Transactional(readOnly = true)
    public AnnouncementDto getForViewer(Long id, String username) {
        Announcement a = get(id);
        User u = username == null ? null : user(username);
        if (a.getStatus() != AnnouncementStatus.PUBLISHED) {
            if (u == null || (u.getEffectiveLevel() != 0 && !u.getId().equals(a.getCreatedBy().getId())))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found.");
        } else if (u == null) {
            if (a.getTargetType() != TargetType.GLOBAL && !"all".equalsIgnoreCase(a.getRecipientType()) && !"all_campus".equalsIgnoreCase(a.getRecipientType()))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found.");
        } else if (u.getEffectiveLevel() != 0) {
            if (!targeting.matches(a, u) && !u.getId().equals(a.getCreatedBy().getId()))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found.");
        }
        return AnnouncementDto.from(a);
    }

    public AnnouncementDto update(Long id, Request r, String username) {
        assertCanManage(id, username);
        Announcement a = get(id);
        if (a.getStatus() != AnnouncementStatus.DRAFT && a.getStatus() != AnnouncementStatus.ARCHIVED) throw conflict("Only draft or archived announcements may be edited.");
        User sender = user(username);
        List<String> targetList = parseTargets(r.recipientTargets());
        targeting.validateSenderPermissions(sender, r.recipientType(), targetList, r.departmentId(), r.targetType(), r.branchId(), r.sectionId(), r.userEmail(), r.role());

        apply(a, r);
        audit.save(new AuditLog(sender, "ANNOUNCEMENT_EDIT", "ANNOUNCEMENT", String.valueOf(a.getId()), AuditJson.title(a.getTitle())));
        return AnnouncementDto.from(a);
    }

    public AnnouncementDto update(Long id, Request r) {
        Announcement a = get(id);
        if (a.getStatus() != AnnouncementStatus.DRAFT) throw conflict("Only draft announcements may be edited.");
        apply(a, r);
        return AnnouncementDto.from(a);
    }

    public AnnouncementDto publish(Long id) {
        Announcement a = get(id);
        if (a.getStatus() != AnnouncementStatus.DRAFT && a.getStatus() != AnnouncementStatus.ARCHIVED) throw conflict("Only draft or archived announcements may be published.");
        a.setStatus(AnnouncementStatus.PUBLISHED);
        a.setPublishedAt(Instant.now());
        events.publishEvent(new AnnouncementPublishedEvent(a.getId(), a.getTitle(), a.getContent(), a.isUrgent(), a.getTargetType(), a.getTargetDepartment() == null ? null : a.getTargetDepartment().getId(), a.getTargetBranch() == null ? null : a.getTargetBranch().getId(), a.getTargetSection() == null ? null : a.getTargetSection().getId(), a.getTargetHostel() == null ? null : a.getTargetHostel().getId(), a.getTargetUser() == null ? null : a.getTargetUser().getId(), a.getTargetRole()));
        audit.save(new AuditLog(a.getCreatedBy(), "ANNOUNCEMENT_PUBLISH", "ANNOUNCEMENT", String.valueOf(a.getId()), "{}"));
        return AnnouncementDto.from(a);
    }

    public AnnouncementDto unpublish(Long id) {
        Announcement a = get(id);
        if (a.getStatus() != AnnouncementStatus.PUBLISHED) throw conflict("Only published announcements may be unpublished.");
        a.setStatus(AnnouncementStatus.DRAFT);
        a.setPublishedAt(null);
        audit.save(new AuditLog(a.getCreatedBy(), "ANNOUNCEMENT_UNPUBLISH", "ANNOUNCEMENT", String.valueOf(a.getId()), "{}"));
        return AnnouncementDto.from(a);
    }

    public AnnouncementDto archive(Long id) {
        Announcement a = get(id);
        a.setStatus(AnnouncementStatus.ARCHIVED);
        audit.save(new AuditLog(a.getCreatedBy(), "ANNOUNCEMENT_ARCHIVE", "ANNOUNCEMENT", String.valueOf(a.getId()), "{}"));
        return AnnouncementDto.from(a);
    }

    public AnnouncementDto unarchive(Long id) {
        Announcement a = get(id);
        if (a.getStatus() != AnnouncementStatus.ARCHIVED) throw conflict("Only archived announcements can be unarchived.");
        a.setStatus(AnnouncementStatus.DRAFT);
        a.setPublishedAt(null);
        audit.save(new AuditLog(a.getCreatedBy(), "ANNOUNCEMENT_UNARCHIVE", "ANNOUNCEMENT", String.valueOf(a.getId()), "{}"));
        return AnnouncementDto.from(a);
    }

    public void delete(Long id) {
        Announcement a = get(id);
        if (a.getStatus() == AnnouncementStatus.PUBLISHED) throw conflict("Unpublish or archive this announcement before deleting it.");
        audit.save(new AuditLog(a.getCreatedBy(), "ANNOUNCEMENT_DELETE", "ANNOUNCEMENT", String.valueOf(a.getId()), "{}"));
        repo.delete(a);
    }

    private void apply(Announcement a, Request r) {
        a.setTitle(r.title());
        a.setContent(r.content());
        a.setUrgent(r.urgent());
        TargetType tt = r.targetType() != null ? r.targetType() : TargetType.GLOBAL;
        var t = targeting.resolve(tt, r.departmentId(), r.branchId(), r.sectionId(), r.hostelId(), r.userEmail(), r.role());
        a.setTargetType(t.type());
        a.setTargetDepartment(t.department());
        a.setTargetBranch(t.branch());
        a.setTargetSection(t.section());
        a.setTargetHostel(t.hostel());
        a.setTargetUser(t.user());
        a.setTargetRole(t.role());
        a.setRecipientType(r.recipientType() != null ? r.recipientType() : (r.targetType() != null ? r.targetType().name().toLowerCase() : "all"));
        a.setRecipientTargets(r.recipientTargets());
        a.setAttachmentUrl(r.attachmentUrl());
        a.setAttachmentName(r.attachmentName());
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

    /** Server-side ownership enforcement: author only; Dept Admin only within own department; SuperAdmin any. */
    private void assertCanManage(Long id, String username) {
        Announcement a = get(id);
        User actor = user(username);
        Long ownerId = a.getCreatedBy() != null ? a.getCreatedBy().getId() : null;

        boolean isSuperAdmin = actor.getRole() == Role.SUPER_ADMIN
                || "SUPER_ADMIN".equalsIgnoreCase(actor.getEffectiveRoleName())
                || (actor.getRoleEntity() != null && actor.getRoleEntity().isSuperadmin());
        if (isSuperAdmin) {
            return;
        }

        boolean isDeptAdmin = actor.getRole() == Role.DEPARTMENT_ADMIN
                || "DEPARTMENT_ADMIN".equalsIgnoreCase(actor.getEffectiveRoleName());
        if (isDeptAdmin) {
            Long actorDeptId = actor.getDepartmentEntity() != null ? actor.getDepartmentEntity().getId() : null;
            Long postDeptId = a.getTargetDepartment() != null ? a.getTargetDepartment().getId() :
                    (a.getCreatedBy() != null && a.getCreatedBy().getDepartmentEntity() != null ? a.getCreatedBy().getDepartmentEntity().getId() : null);
            if (actorDeptId != null && Objects.equals(actorDeptId, postDeptId)) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Department admins can only manage announcements within their department.");
        }

        if (ownerId == null || !actor.getId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage announcements you authored.");
        }
    }
    public AnnouncementDto publish(Long id, String username) { assertCanManage(id, username); return publish(id); }
    public AnnouncementDto unpublish(Long id, String username) { assertCanManage(id, username); return unpublish(id); }
    public AnnouncementDto archive(Long id, String username) { assertCanManage(id, username); return archive(id); }
    public AnnouncementDto unarchive(Long id, String username) { assertCanManage(id, username); return unarchive(id); }
    public void delete(Long id, String username) { assertCanManage(id, username); delete(id); }

    private Announcement get(Long id) { return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found.")); }
    private User user(String n) { return users.findByUsername(n).orElseGet(() -> users.findByEmailIgnoreCase(n).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized."))); }
    private ResponseStatusException conflict(String m) { return new ResponseStatusException(HttpStatus.CONFLICT, m); }

    public record Request(
            @NotBlank @Size(max = 180) String title,
            @NotBlank @Size(max = 10000) String content,
            boolean urgent,
            TargetType targetType,
            Long departmentId,
            Long branchId,
            Long sectionId,
            Long hostelId,
            String userEmail,
            Role role,
            String recipientType,
            String recipientTargets,
            String attachmentUrl,
            String attachmentName
    ) {
        public Request(String title, String content, boolean urgent, TargetType targetType, Long departmentId, Long branchId, Long sectionId, Long hostelId, String userEmail, Role role) {
            this(title, content, urgent, targetType, departmentId, branchId, sectionId, hostelId, userEmail, role, targetType != null ? targetType.name().toLowerCase() : "all", null, null, null);
        }
    }

    public record AnnouncementDto(
            Long id,
            String title,
            String content,
            boolean urgent,
            AnnouncementStatus status,
            TargetType targetType,
            Long departmentId,
            Long branchId,
            Long sectionId,
            Long hostelId,
            String userEmail,
            Role role,
            String recipientType,
            String recipientTargets,
            String attachmentUrl,
            String attachmentName,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            Long authorId,
            String authorRole
    ) {
        static AnnouncementDto from(Announcement a) {
            return new AnnouncementDto(
                    a.getId(),
                    a.getTitle(),
                    a.getContent(),
                    a.isUrgent(),
                    a.getStatus(),
                    a.getTargetType(),
                    a.getTargetDepartment() == null ? null : a.getTargetDepartment().getId(),
                    a.getTargetBranch() == null ? null : a.getTargetBranch().getId(),
                    a.getTargetSection() == null ? null : a.getTargetSection().getId(),
                    a.getTargetHostel() == null ? null : a.getTargetHostel().getId(),
                    a.getTargetUser() == null ? null : a.getTargetUser().getEmail(),
                    a.getTargetRole(),
                    a.getRecipientType(),
                    a.getRecipientTargets(),
                    a.getAttachmentUrl(),
                    a.getAttachmentName(),
                    a.getPublishedAt(),
                    a.getCreatedAt(),
                    a.getUpdatedAt(),
                    a.getCreatedBy().getId(),
                    a.getCreatedBy().getEffectiveRoleName()
            );
        }
    }
}
