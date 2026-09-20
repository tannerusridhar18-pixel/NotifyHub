package com.notifyhub.query;

import com.notifyhub.common.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/queries")
public class QueryController {
    private final QueryService service;

    public QueryController(QueryService s) {
        this.service = s;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> submit(@Valid @RequestBody QueryService.QueryRequest r) {
        service.submit(r);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Query submitted successfully."));
    }

    @PostMapping("/student")
    public ResponseEntity<ApiResponse<QueryService.QueryDto>> submitStudent(Authentication authentication, @Valid @RequestBody QueryService.StudentQueryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.submitStudent(request, authentication.getName())));
    }

    @PostMapping("/faculty")
    public ResponseEntity<ApiResponse<QueryService.QueryDto>> submitFaculty(Authentication authentication, @Valid @RequestBody QueryService.FacultyQueryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.submitFaculty(request, authentication.getName())));
    }

    @GetMapping("/faculty/inbox")
    public ResponseEntity<ApiResponse<PageResponse<QueryService.QueryDto>>> facultyInbox(
            Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) QueryStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.facultyInbox(authentication.getName(), page, size, status)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<QueryService.QueryDto>>> myQueries(
            Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.listMyQueries(authentication.getName(), page, size)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<QueryService.QueryDto>>> list(
            Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) QueryStatus status,
            @RequestParam(required = false) String askerType,
            @RequestParam(required = false) String targetType
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.scopedList(authentication.getName(), page, size, status, askerType, targetType)));
    }

    @PostMapping("/{id}/answer")
    public ResponseEntity<ApiResponse<QueryService.QueryDto>> answer(@PathVariable Long id, @Valid @RequestBody QueryService.AnswerRequest r) {
        return ResponseEntity.ok(ApiResponse.ok(service.answer(id, r.response())));
    }

    @PatchMapping("/{id}/answer")
    public ResponseEntity<ApiResponse<QueryService.QueryDto>> answerScoped(Authentication authentication, @PathVariable Long id, @Valid @RequestBody QueryService.AnswerRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.answerScoped(id, request.response(), authentication.getName())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Query deleted."));
    }
}
