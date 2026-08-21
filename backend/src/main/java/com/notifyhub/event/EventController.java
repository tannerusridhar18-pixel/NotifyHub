package com.notifyhub.event;
import com.notifyhub.common.*; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import org.springframework.http.*; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/events") public class EventController{
 private final EventService service;public EventController(EventService s){service=s;}
 @GetMapping public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> list(@RequestParam(defaultValue="0")@Min(0)int page,@RequestParam(defaultValue="12")@Min(1)@Max(50)int size,@RequestParam(required=false)String department){return ResponseEntity.ok(ApiResponse.ok(service.list(page,size,department,false)));}
 @GetMapping("/upcoming") public ResponseEntity<ApiResponse<PageResponse<EventService.EventDto>>> upcoming(@RequestParam(defaultValue="0")@Min(0)int page,@RequestParam(defaultValue="12")@Min(1)@Max(50)int size,@RequestParam(required=false)String department){return ResponseEntity.ok(ApiResponse.ok(service.list(page,size,department,true)));}
 @PostMapping public ResponseEntity<ApiResponse<EventService.EventDto>> create(@Valid@RequestBody EventService.EventRequest r,Authentication a){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(r,a.getName())));}
 @PutMapping("/{id}") public ResponseEntity<ApiResponse<EventService.EventDto>> update(@PathVariable Long id,@Valid@RequestBody EventService.EventRequest r){return ResponseEntity.ok(ApiResponse.ok(service.update(id,r)));}
 @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id){service.delete(id);return ResponseEntity.ok(ApiResponse.message("Event deleted."));}
}
