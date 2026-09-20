package com.notifyhub.academicstructure;

import com.notifyhub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class DepartmentLeadershipController {
    private final DepartmentLeadershipService leadershipService;

    public DepartmentLeadershipController(DepartmentLeadershipService leadershipService) {
        this.leadershipService = leadershipService;
    }

    @PostMapping("/students/batch-promote")
    public ResponseEntity<ApiResponse<DepartmentLeadershipService.BatchPromoteResult>> batchPromote(
            Authentication authentication,
            @Valid @RequestBody BatchPromoteRequest request
    ) {
        var result = leadershipService.batchPromoteStudents(
                request.departmentId(),
                request.fromYear(),
                request.toYear(),
                authentication.getName()
        );
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/departments/{id}/assign-hod")
    public ResponseEntity<ApiResponse<Void>> assignHod(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody AssignHodRequest request
    ) {
        leadershipService.assignHod(id, request.userId(), authentication.getName());
        return ResponseEntity.ok(ApiResponse.message("HOD assigned successfully."));
    }

    @PatchMapping("/students/{id}/section")
    public ResponseEntity<ApiResponse<Void>> reassignSection(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody ReassignSectionRequest request
    ) {
        leadershipService.reassignStudentSection(id, request.sectionId(), authentication.getName());
        return ResponseEntity.ok(ApiResponse.message("Student section updated successfully."));
    }

    @GetMapping("/departments/{id}/analytics")
    public ResponseEntity<ApiResponse<DepartmentLeadershipService.DepartmentAnalyticsDto>> departmentAnalytics(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(leadershipService.getDepartmentAnalytics(id, authentication.getName())));
    }

    @GetMapping("/campus/overview")
    public ResponseEntity<ApiResponse<List<DepartmentLeadershipService.DepartmentOverviewDto>>> campusOverview(
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(leadershipService.getCampusOverview(authentication.getName())));
    }

    public record BatchPromoteRequest(@NotNull Long departmentId, @NotNull Integer fromYear, @NotNull Integer toYear) {}
    public record AssignHodRequest(@NotNull Long userId) {}
    public record ReassignSectionRequest(@NotNull Long sectionId) {}
}
