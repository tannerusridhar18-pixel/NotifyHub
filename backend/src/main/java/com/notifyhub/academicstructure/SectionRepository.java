package com.notifyhub.academicstructure;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, Long> {
	boolean existsByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(Long departmentId, Long branchId, int academicYear, String name);
	boolean existsByBranchIdAndAcademicYearGreaterThan(Long branchId, int academicYear);
	List<Section> findByDepartmentIdAndBranchIdAndAcademicYear(Long departmentId, Long branchId, int academicYear);
	List<Section> findByDepartmentId(Long departmentId);
	Optional<Section> findByDepartmentIdAndBranchIdAndAcademicYearAndNameIgnoreCase(Long departmentId, Long branchId, int academicYear, String name);
}
