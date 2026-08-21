package com.notifyhub.announcement;

import com.notifyhub.common.*; import jakarta.validation.Valid; import jakarta.validation.constraints.Max; import jakarta.validation.constraints.Min; import org.springframework.http.*; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/announcements") public class AnnouncementController{
 private final AnnouncementService service; public AnnouncementController(AnnouncementService s){service=s;}
 @GetMapping public ResponseEntity<ApiResponse<PageResponse<AnnouncementService.AnnouncementDto>>> list(@RequestParam(defaultValue="0")@Min(0)int page,@RequestParam(defaultValue="12")@Min(1)@Max(50)int size,@RequestParam(required=false)String q,@RequestParam(required=false)String category,@RequestParam(required=false)String department){return ResponseEntity.ok(ApiResponse.ok(service.list(page,size,q,category,department,false)));}
 @GetMapping("/urgent") public ResponseEntity<ApiResponse<PageResponse<AnnouncementService.AnnouncementDto>>> urgent(@RequestParam(defaultValue="0")@Min(0)int page,@RequestParam(defaultValue="12")@Min(1)@Max(50)int size){return ResponseEntity.ok(ApiResponse.ok(service.list(page,size,null,null,null,true)));}
 @PostMapping public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> create(@Valid@RequestBody AnnouncementService.AnnouncementRequest r,Authentication a){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(r,a.getName())));}
 @PutMapping("/{id}") public ResponseEntity<ApiResponse<AnnouncementService.AnnouncementDto>> update(@PathVariable Long id,@Valid@RequestBody AnnouncementService.AnnouncementRequest r){return ResponseEntity.ok(ApiResponse.ok(service.update(id,r)));}
 @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id){service.delete(id);return ResponseEntity.ok(ApiResponse.message("Announcement deleted."));}
}
