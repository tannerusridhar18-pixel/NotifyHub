package com.notifyhub.academicstructure;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SectionRepository extends JpaRepository<Section, Long> {
	boolean existsByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(Long departmentId, Long branchId, int academicYear, String name);
	boolean existsByBranchIdAndAcademicYearGreaterThan(Long branchId, int academicYear);
}
