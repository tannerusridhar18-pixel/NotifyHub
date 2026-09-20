package com.notifyhub.student;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByUserId(Long userId);
    List<StudentProfile> findByDepartmentId(Long departmentId);
    List<StudentProfile> findByDepartmentIdAndYear(Long departmentId, int year);
    List<StudentProfile> findByBranchId(Long branchId);
    List<StudentProfile> findBySectionId(Long sectionId);
    List<StudentProfile> findByHostelId(Long hostelId);
    long countByDepartmentId(Long departmentId);
}
