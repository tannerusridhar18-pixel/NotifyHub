package com.notifyhub.announcement;

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
@RequestMapping("/api/v1/announcements")
public class AnnouncementController {
    private final AnnouncementService service;
    public AnnouncementController(AnnouncementService service) { this.service = service; }
    private static boolean authenticated(Authentication a) { return a != null && a.isAuthenticated() && !(a instanceof AnonymousAuthenticationToken); }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AnnouncementService.AnnouncementDto>>> list(Authentication a, @RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(ApiResponse.ok(!authenticated(a) ? service.publicFeed(page, size) : service.visible(a.getName(), page, size)));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> get(@PathVariable Long id, Authentication a) {
        return ResponseEntity.ok(ApiResponse.ok(service.getForViewer(id, authenticated(a) ? a.getName() : null)));
    }
    @GetMapping("/urgent") public ResponseEntity<ApiResponse<PageResponse<AnnouncementService.AnnouncementDto>>> urgent(@RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return ResponseEntity.ok(ApiResponse.ok(service.urgent(page, size))); }
    @GetMapping("/management") public ResponseEntity<ApiResponse<PageResponse<AnnouncementService.AnnouncementDto>>> manage(@RequestParam(defaultValue="0") @Min(0) int page, @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return ResponseEntity.ok(ApiResponse.ok(service.manage(page, size))); }
    @PostMapping public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> create(@Valid @RequestBody AnnouncementService.Request request, Authentication a) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(request, a.getName()))); }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> update(@PathVariable Long id, @Valid @RequestBody AnnouncementService.Request request) { return ResponseEntity.ok(ApiResponse.ok(service.update(id, request))); }
    @PostMapping("/{id}/publish") public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> publish(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.publish(id))); }
    @PostMapping("/{id}/unpublish") public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> unpublish(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.unpublish(id))); }
    @PostMapping("/{id}/archive") public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> archive(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.archive(id))); }
    @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.ok(ApiResponse.message("Announcement deleted.")); }
}
