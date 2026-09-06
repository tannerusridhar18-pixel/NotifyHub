package com.notifyhub.structure;

import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/academic-structure")
public class AcademicStructureController {
    private final StructureService service;
    public AcademicStructureController(StructureService service) { this.service = service; }

    @GetMapping("/departments") public ApiResponse<List<StructureService.DepartmentView>> departments() { return ApiResponse.ok(service.departments()); }
    @PostMapping("/departments") public ResponseEntity<ApiResponse<StructureService.DepartmentView>> createDepartment(@Valid @RequestBody DepartmentRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createDepartment(request.name()))); }
    @PatchMapping("/departments/{id}") public ApiResponse<StructureService.DepartmentView> updateDepartment(@PathVariable Long id, @Valid @RequestBody DepartmentUpdate request) { return ApiResponse.ok(service.updateDepartment(id, request.name(), request.active())); }
    @DeleteMapping("/departments/{id}") public ApiResponse<Void> deactivateDepartment(@PathVariable Long id) { service.deactivateDepartment(id); return ApiResponse.message("Department deactivated."); }

    @GetMapping("/branches") public ApiResponse<List<StructureService.BranchView>> branches() { return ApiResponse.ok(service.branches()); }
    @PostMapping("/branches") public ResponseEntity<ApiResponse<StructureService.BranchView>> createBranch(@Valid @RequestBody BranchRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createBranch(request.departmentId(), request.name(), request.courseNote(), request.maxYear()))); }
    @PatchMapping("/branches/{id}") public ApiResponse<StructureService.BranchView> updateBranch(@PathVariable Long id, @Valid @RequestBody BranchUpdate request) { return ApiResponse.ok(service.updateBranch(id, request.departmentId(), request.name(), request.courseNote(), request.maxYear(), request.active())); }

    @GetMapping("/sections") public ApiResponse<List<StructureService.SectionView>> sections() { return ApiResponse.ok(service.sections()); }
    @PostMapping("/sections") public ResponseEntity<ApiResponse<StructureService.SectionView>> createSection(@Valid @RequestBody SectionRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.createSection(request.departmentId(), request.branchId(), request.academicYear(), request.name()))); }
    @PatchMapping("/sections/{id}") public ApiResponse<StructureService.SectionView> updateSection(@PathVariable Long id, @Valid @RequestBody SectionUpdate request) { return ApiResponse.ok(service.updateSection(id, request.departmentId(), request.branchId(), request.academicYear(), request.name(), request.active())); }

    public record DepartmentRequest(@NotBlank @Size(max = 120) String name) { }
    public record DepartmentUpdate(@NotBlank @Size(max = 120) String name, Boolean active) { }
    public record BranchRequest(@NotNull Long departmentId, @NotBlank @Size(max = 120) String name, @Size(max = 255) String courseNote, @Min(1) int maxYear) { }
    public record BranchUpdate(@NotNull Long departmentId, @NotBlank @Size(max = 120) String name, @Size(max = 255) String courseNote, @Min(1) Integer maxYear, Boolean active) { }
    public record SectionRequest(@NotNull Long departmentId, @NotNull Long branchId, @Min(1) int academicYear, @NotBlank @Size(max = 80) String name) { }
    public record SectionUpdate(@NotNull Long departmentId, @NotNull Long branchId, @Min(1) int academicYear, @NotBlank @Size(max = 80) String name, Boolean active) { }
}
