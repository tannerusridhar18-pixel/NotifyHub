package com.notifyhub.event;

import com.notifyhub.common.ApiResponse;
import com.notifyhub.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.*;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {
    private final EventService service;
    public EventController(EventService service) { this.service = service; }
    private static boolean authenticated(Authentication a) { return a != null && a.isAuthenticated() && !(a instanceof AnonymousAuthenticationToken); }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> list(Authentication a, @RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.ok(!authenticated(a) ? service.publicFeed(page, size) : service.visible(a.getName(), page, size)));
    }
    @GetMapping("/my-posts")
    public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> myPosts(Authentication a, @RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.myPosts(a.getName(), page, size)));
    }
    @GetMapping("/my-registrations")
    public ResponseEntity<ApiResponse<List<EventService.StudentRegistrationView>>> myRegistrations(Authentication a) {
        return ResponseEntity.ok(ApiResponse.ok(service.myRegistrations(a.getName())));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventService.EventDto>> get(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.getForViewer(id, authenticated(a) ? a.getName() : null))); }
    @GetMapping("/upcoming") public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> upcoming(Authentication a, @RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return ResponseEntity.ok(ApiResponse.ok(!authenticated(a) ? service.upcoming(page, size) : service.upcoming(a.getName(), page, size))); }
    @GetMapping("/management") public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> manage(@RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return ResponseEntity.ok(ApiResponse.ok(service.manage(page, size))); }
    @PostMapping public ResponseEntity<ApiResponse<EventService.EventDto>> create(@Valid @RequestBody EventService.Request request, Authentication a) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(request, a.getName()))); }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<EventService.EventDto>> update(@PathVariable Long id, @Valid @RequestBody EventService.Request request, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.update(id, request, a.getName()))); }
    @PostMapping("/{id}/publish") public ResponseEntity<ApiResponse<EventService.EventDto>> publish(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.publish(id, a.getName()))); }
    @PostMapping("/{id}/unpublish") public ResponseEntity<ApiResponse<EventService.EventDto>> unpublish(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.unpublish(id, a.getName()))); }
    @PostMapping("/{id}/cancel") public ResponseEntity<ApiResponse<EventService.EventDto>> cancel(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.cancel(id, a.getName()))); }
    @PostMapping("/{id}/archive") public ResponseEntity<ApiResponse<EventService.EventDto>> archive(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.archive(id, a.getName()))); }
    @PostMapping("/{id}/unarchive") public ResponseEntity<ApiResponse<EventService.EventDto>> unarchive(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.unarchive(id, a.getName()))); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id, Authentication a) { service.delete(id, a.getName()); return ResponseEntity.noContent().build(); }
    @PostMapping("/{id}/register") public ResponseEntity<ApiResponse<EventService.RegistrationDto>> register(@PathVariable Long id, Authentication authentication) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.register(id, authentication.getName()))); }
    @GetMapping("/{id}/registrations") public ResponseEntity<ApiResponse<List<EventService.RegistrationDto>>> registrations(@PathVariable Long id, Authentication authentication) { return ResponseEntity.ok(ApiResponse.ok(service.registrations(id, authentication.getName()))); }
    @GetMapping(value="/{id}/registrations/export", produces="text/csv") public ResponseEntity<byte[]> export(@PathVariable Long id, Authentication authentication) {
        StringBuilder csv = new StringBuilder("student_id,name,email,department,year,section,registered_at\n");
        for (var r : service.registrations(id, authentication.getName())) {
            csv.append(csv(r.studentId())).append(',')
               .append(csv(r.studentName())).append(',')
               .append(csv(r.studentEmail())).append(',')
               .append(csv(r.department())).append(',')
               .append(r.year() == null ? "" : r.year()).append(',')
               .append(csv(r.section())).append(',')
               .append(r.registeredAt()).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=event-" + id + "-registrations.csv")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }
    private static String csv(String value) {
        if (value == null) return "";
        // neutralise spreadsheet formulas (=, +, -, @) in user-supplied text
        String safe = (!value.isEmpty() && "=+-@\t\r".indexOf(value.charAt(0)) >= 0) ? "'" + value : value;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
}
