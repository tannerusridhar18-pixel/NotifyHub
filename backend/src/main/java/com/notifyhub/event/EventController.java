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
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventService.EventDto>> get(@PathVariable Long id, Authentication a) { return ResponseEntity.ok(ApiResponse.ok(service.getForViewer(id, authenticated(a) ? a.getName() : null))); }
    @GetMapping("/upcoming") public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> upcoming(@RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return ResponseEntity.ok(ApiResponse.ok(service.upcoming(page, size))); }
    @GetMapping("/management") public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> manage(@RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return ResponseEntity.ok(ApiResponse.ok(service.manage(page, size))); }
    @PostMapping public ResponseEntity<ApiResponse<EventService.EventDto>> create(@Valid @RequestBody EventService.Request request, Authentication a) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(request, a.getName()))); }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<EventService.EventDto>> update(@PathVariable Long id, @Valid @RequestBody EventService.Request request) { return ResponseEntity.ok(ApiResponse.ok(service.update(id, request))); }
    @PostMapping("/{id}/publish") public ResponseEntity<ApiResponse<EventService.EventDto>> publish(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.publish(id))); }
    @PostMapping("/{id}/unpublish") public ResponseEntity<ApiResponse<EventService.EventDto>> unpublish(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.unpublish(id))); }
    @PostMapping("/{id}/cancel") public ResponseEntity<ApiResponse<EventService.EventDto>> cancel(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.cancel(id))); }
    @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.ok(ApiResponse.message("Event deleted.")); }
}
