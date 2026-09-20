package com.notifyhub.query;

import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.common.PageResponse;
import com.notifyhub.faculty.FacultyDepartmentMapping;
import com.notifyhub.faculty.FacultyDepartmentService;
import com.notifyhub.rbac.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class QueryService {
    private final QueryRepository repo;
    private final UserRepository users;
    private final RbacAuthorizationService rbac;
    private final FacultyDepartmentService facultyDepartmentService;
    private final AuditLogRepository audit;

    public QueryService(QueryRepository r, UserRepository u, RbacAuthorizationService rbac,
                        FacultyDepartmentService facultyDepartmentService,
                        AuditLogRepository audit) {
        this.repo = r;
        this.users = u;
        this.rbac = rbac;
        this.facultyDepartmentService = facultyDepartmentService;
        this.audit = audit;
    }

    public void submit(QueryRequest r) {
        CampusQuery q = new CampusQuery();
        q.setName(r.name());
        q.setEmail(r.email());
        q.setDepartment(r.department());
        q.setSubject(r.subject());
        q.setMessage(r.message());
        q.setAskerType("PUBLIC");
        repo.save(q);
    }

    public QueryDto submitStudent(StudentQueryRequest request, String username) {
        User student = user(username);
        if (student.getDepartmentEntity() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your student account has no assigned department.");
        }
        Long studentDeptId = student.getDepartmentEntity().getId();

        User targetFaculty = null;
        String targetType = request.targetType() != null && !request.targetType().isBlank() ? request.targetType().trim().toUpperCase() : "DEPARTMENT_ADMIN";

        if ("FACULTY".equalsIgnoreCase(targetType)) {
            if (request.targetFacultyId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A specific faculty member must be selected when targetType is FACULTY.");
            }
            targetFaculty = users.findById(request.targetFacultyId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target faculty user not found."));

            // Enforce scope validation: faculty must be actively mapped (HOME or SUB) to student's department
            boolean facultyInDept = facultyDepartmentService.isFacultyInDepartment(targetFaculty.getId(), studentDeptId);
            if (!facultyInDept) {
                Long fDeptId = targetFaculty.getDepartmentEntity() != null ? targetFaculty.getDepartmentEntity().getId() : null;
                if (!Objects.equals(studentDeptId, fDeptId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The selected faculty member does not teach or belong to your department.");
                }
            }
        } else {
            targetType = "DEPARTMENT_ADMIN";
        }

        CampusQuery q = new CampusQuery();
        q.setStudent(student);
        q.setAsker(student);
        q.setAskerType("STUDENT");
        q.setDepartmentEntity(student.getDepartmentEntity());
        q.setDepartment(student.getDepartmentEntity().getName());
        q.setName(student.getUsername());
        q.setEmail(student.getEmail());
        q.setSubject(request.subject() != null && !request.subject().isBlank() ? request.subject() : "Student Query");
        q.setQuestion(request.question());
        q.setMessage(request.question());
        q.setTargetType(targetType);
        q.setTargetFaculty(targetFaculty);

        CampusQuery saved = repo.save(q);
        audit.save(new AuditLog(student, "QUERY_CREATE", "QUERY", String.valueOf(saved.getId()), "{\"targetType\":\"" + targetType + "\"}"));
        return QueryDto.from(saved);
    }

    public QueryDto submitFaculty(FacultyQueryRequest request, String username) {
        User facultyUser = user(username);
        FacultyDepartmentMapping homeMapping = facultyDepartmentService.getHomeDepartment(facultyUser.getId()).orElse(null);
        var dept = homeMapping != null ? homeMapping.getDepartment() : facultyUser.getDepartmentEntity();

        if (dept == null) {
            List<FacultyDepartmentMapping> anyMappings = facultyDepartmentService.getMappingsForUser(facultyUser.getId());
            if (!anyMappings.isEmpty()) {
                dept = anyMappings.get(0).getDepartment();
            }
        }

        if (dept == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your faculty profile has no assigned department.");
        }

        CampusQuery q = new CampusQuery();
        q.setAsker(facultyUser);
        q.setAskerType("FACULTY");
        q.setDepartmentEntity(dept);
        q.setDepartment(dept.getName());
        q.setName(facultyUser.getUsername());
        q.setEmail(facultyUser.getEmail());
        q.setSubject(request.subject() != null && !request.subject().isBlank() ? request.subject() : "Faculty Inquiry to Admin");
        q.setQuestion(request.message());
        q.setMessage(request.message());
        q.setTargetType("DEPARTMENT_ADMIN");

        CampusQuery saved = repo.save(q);
        audit.save(new AuditLog(facultyUser, "QUERY_CREATE", "QUERY", String.valueOf(saved.getId()), "{\"askerType\":\"FACULTY\"}"));
        return QueryDto.from(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<QueryDto> facultyInbox(String username, int page, int size, QueryStatus status) {
        User facultyUser = user(username);
        Pageable p = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CampusQuery> result = status == null
                ? repo.findByTargetFacultyId(facultyUser.getId(), p)
                : repo.findByTargetFacultyIdAndStatus(facultyUser.getId(), status, p);
        return PageResponse.from(result.map(QueryDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<QueryDto> scopedList(String username, int page, int size, QueryStatus status, String askerType, String targetType) {
        User actor = user(username);
        Pageable p = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (isAdmin(actor)) {
            return pageOf(p, askerType, targetType, pg -> status == null ? repo.findAll(pg) : repo.findByStatus(status, pg));
        }

        if (actor.getRole() == com.notifyhub.auth.Role.STUDENT) {
            return PageResponse.from(repo.findByStudentId(actor.getId(), p).map(QueryDto::from));
        }

        if (actor.getRole() == com.notifyhub.auth.Role.FACULTY) {
            // If faculty calls general list without faculty inbox, return queries assigned to them
            Page<CampusQuery> assigned = status == null
                    ? repo.findByTargetFacultyId(actor.getId(), p)
                    : repo.findByTargetFacultyIdAndStatus(actor.getId(), status, p);
            return PageResponse.from(assigned.map(QueryDto::from));
        }

        // Department Admin or HOD lookup
        var assignment = rbac.activeAssignment(actor, PermissionKey.QUERY_VIEW).orElse(null);
        Long deptId = assignment != null && assignment.getScopeType() == ScopeType.DEPARTMENT
                ? assignment.getScopeId()
                : (actor.getDepartmentEntity() != null ? actor.getDepartmentEntity().getId() : null);

        if (deptId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing department query permission.");
        }

        return pageOf(p, askerType, targetType, pg -> status == null
                ? repo.findByDepartmentEntityId(deptId, pg)
                : repo.findByDepartmentEntityIdAndStatus(deptId, status, pg));
    }

    private boolean isAdmin(User actor) { return rbac.isSuperAdmin(actor) || actor.hasAdminAccess(); }

    /** Pages in the database; only falls back to in-memory filtering (over the full list) when filters are used. */
    private PageResponse<QueryDto> pageOf(Pageable p, String askerType, String targetType,
                                          java.util.function.Function<Pageable, Page<CampusQuery>> loader) {
        boolean noFilters = (askerType == null || askerType.isBlank()) && (targetType == null || targetType.isBlank());
        if (noFilters) return PageResponse.from(loader.apply(p).map(QueryDto::from));
        List<CampusQuery> all = loader.apply(Pageable.unpaged(p.getSort())).getContent();
        return filterAndPage(all, p, askerType, targetType);
    }

    private PageResponse<QueryDto> filterAndPage(List<CampusQuery> list, Pageable p, String askerType, String targetType) {
        List<QueryDto> filtered = list.stream()
                .filter(q -> askerType == null || askerType.isBlank() || askerType.equalsIgnoreCase(q.getAskerType()))
                .filter(q -> targetType == null || targetType.isBlank() || targetType.equalsIgnoreCase(q.getTargetType()))
                .map(QueryDto::from)
                .toList();

        int start = Math.min((int) p.getOffset(), filtered.size());
        int end = Math.min(start + p.getPageSize(), filtered.size());
        return PageResponse.from(new PageImpl<>(filtered.subList(start, end), p, filtered.size()));
    }

    @Transactional(readOnly = true)
    public PageResponse<QueryDto> list(int page, int size, QueryStatus status) {
        Pageable p = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CampusQuery> x = status == null ? repo.findAll(p) : repo.findByStatus(status, p);
        return PageResponse.from(x.map(QueryDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<QueryDto> listMyQueries(String username, int page, int size) {
        User user = user(username);
        Pageable p = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CampusQuery> x = repo.findByAskerId(user.getId(), p);
        if (x.isEmpty()) {
            x = repo.findByEmailIgnoreCase(user.getEmail(), p);
        }
        return PageResponse.from(x.map(QueryDto::from));
    }

    public QueryDto answer(Long id, String response) {
        CampusQuery q = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Query not found."));
        q.setAdminResponse(response);
        q.setAnswer(response);
        q.setStatus(QueryStatus.ANSWERED);
        q.setAnsweredAt(Instant.now());
        return QueryDto.from(repo.save(q));
    }

    public QueryDto answerScoped(Long id, String response, String username) {
        User actor = user(username);
        CampusQuery q = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Query not found."));

        if (!isAdmin(actor)) {
            boolean isAssignedFaculty = q.getTargetFaculty() != null && q.getTargetFaculty().getId().equals(actor.getId());
            if (!isAssignedFaculty) {
                var assignment = rbac.activeAssignment(actor, PermissionKey.QUERY_ANSWER).orElse(null);
                Long deptId = assignment != null && assignment.getScopeType() == ScopeType.DEPARTMENT
                        ? assignment.getScopeId()
                        : (actor.getDepartmentEntity() != null ? actor.getDepartmentEntity().getId() : null);

                if (deptId == null || q.getDepartmentEntity() == null || !deptId.equals(q.getDepartmentEntity().getId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to answer this query.");
                }
            }
        }

        q.setAnswer(response);
        q.setAdminResponse(response);
        q.setAnsweredBy(actor);
        q.setStatus(QueryStatus.ANSWERED);
        q.setAnsweredAt(Instant.now());
        CampusQuery saved = repo.save(q);
        audit.save(new AuditLog(actor, "QUERY_ANSWER", "QUERY", String.valueOf(saved.getId()), "{\"queryId\":" + saved.getId() + "}"));
        return QueryDto.from(saved);
    }

    private User user(String username) {
        return users.findByUsername(username).or(() -> users.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required."));
    }

    public void delete(Long id) {
        CampusQuery q = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Query not found."));
        if (q.getStatus() != QueryStatus.ANSWERED) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only answered queries may be deleted.");
        repo.delete(q);
    }

    public record QueryRequest(
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=120) String name,
            @jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=190) String email,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=100) String department,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=180) String subject,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8000) String message
    ) {}

    public record StudentQueryRequest(
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8000) String question,
            String subject,
            String targetType,
            Long targetFacultyId
    ) {
        public StudentQueryRequest(String question) {
            this(question, null, "DEPARTMENT_ADMIN", null);
        }
    }

    public record FacultyQueryRequest(
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=180) String subject,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8000) String message
    ) {}

    public record AnswerRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8000) String response) {}

    public record QueryDto(
            Long id,
            String name,
            String email,
            String department,
            String subject,
            String message,
            QueryStatus status,
            String adminResponse,
            Instant createdAt,
            Instant answeredAt,
            Long studentId,
            Long departmentId,
            String question,
            String answer,
            String targetType,
            Long targetFacultyId,
            String targetFacultyName,
            String askerType,
            Long askerId
    ) {
        static QueryDto from(CampusQuery q) {
            return new QueryDto(
                    q.getId(),
                    q.getName(),
                    q.getEmail(),
                    q.getDepartment(),
                    q.getSubject(),
                    q.getMessage(),
                    q.getStatus(),
                    q.getAdminResponse(),
                    q.getCreatedAt(),
                    q.getAnsweredAt(),
                    q.getStudent() == null ? null : q.getStudent().getId(),
                    q.getDepartmentEntity() == null ? null : q.getDepartmentEntity().getId(),
                    q.getQuestion(),
                    q.getAnswer(),
                    q.getTargetType(),
                    q.getTargetFaculty() == null ? null : q.getTargetFaculty().getId(),
                    q.getTargetFaculty() == null ? null : q.getTargetFaculty().getUsername(),
                    q.getAskerType(),
                    q.getAsker() == null ? null : q.getAsker().getId()
            );
        }
    }
}
