package com.notifyhub.academicstructure;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {
	boolean existsByDepartmentIdAndNameIgnoreCase(Long departmentId, String name);
}
