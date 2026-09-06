package com.notifyhub.structure;

import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hostels")
public class HostelStructureController {
    private final StructureService service;
    public HostelStructureController(StructureService service) { this.service = service; }

    @GetMapping public ApiResponse<List<StructureService.HostelView>> hostels() { return ApiResponse.ok(service.hostels()); }
    @PostMapping public ResponseEntity<ApiResponse<StructureService.HostelView>> createHostel(@Valid @RequestBody HostelRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createHostel(request.name(), request.type(), request.totalCapacity()))); }
    @PatchMapping("/{id}") public ApiResponse<StructureService.HostelView> updateHostel(@PathVariable Long id, @Valid @RequestBody HostelUpdate request) { return ApiResponse.ok(service.updateHostel(id, request.name(), request.type(), request.totalCapacity(), request.active())); }

    @GetMapping("/blocks") public ApiResponse<List<StructureService.BlockView>> blocks() { return ApiResponse.ok(service.blocks()); }
    @PostMapping("/blocks") public ResponseEntity<ApiResponse<StructureService.BlockView>> createBlock(@Valid @RequestBody BlockRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createBlock(request.hostelId(), request.name(), request.capacity()))); }
    @PatchMapping("/blocks/{id}") public ApiResponse<StructureService.BlockView> updateBlock(@PathVariable Long id, @Valid @RequestBody BlockUpdate request) { return ApiResponse.ok(service.updateBlock(id, request.hostelId(), request.name(), request.capacity(), request.active())); }

    @GetMapping("/rooms") public ApiResponse<List<StructureService.RoomView>> rooms() { return ApiResponse.ok(service.rooms()); }
    @PostMapping("/rooms") public ResponseEntity<ApiResponse<StructureService.RoomView>> createRoom(@Valid @RequestBody RoomRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createRoom(request.blockId(), request.roomNumber(), request.floor(), request.capacity()))); }
    @PatchMapping("/rooms/{id}") public ApiResponse<StructureService.RoomView> updateRoom(@PathVariable Long id, @Valid @RequestBody RoomUpdate request) { return ApiResponse.ok(service.updateRoom(id, request.blockId(), request.roomNumber(), request.floor(), request.capacity(), request.active())); }

    public record HostelRequest(@NotBlank @Size(max = 120) String name, @Size(max = 40) String type, @Min(0) Integer totalCapacity) { }
    public record HostelUpdate(@NotBlank @Size(max = 120) String name, @Size(max = 40) String type, @Min(0) Integer totalCapacity, Boolean active) { }
    public record BlockRequest(@NotNull Long hostelId, @NotBlank @Size(max = 120) String name, @Min(0) Integer capacity) { }
    public record BlockUpdate(@NotNull Long hostelId, @NotBlank @Size(max = 120) String name, @Min(0) Integer capacity, Boolean active) { }
    public record RoomRequest(@NotNull Long blockId, @NotBlank @Size(max = 40) String roomNumber, @Min(0) Integer floor, @Min(1) int capacity) { }
    public record RoomUpdate(@NotNull Long blockId, @NotBlank @Size(max = 40) String roomNumber, @Min(0) Integer floor, @Min(1) Integer capacity, Boolean active) { }
}
