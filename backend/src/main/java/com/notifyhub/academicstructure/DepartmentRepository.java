package com.notifyhub.academicstructure;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
	boolean existsByNameIgnoreCase(String name);
}
