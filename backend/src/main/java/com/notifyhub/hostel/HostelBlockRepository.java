package com.notifyhub.hostel;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HostelBlockRepository extends JpaRepository<HostelBlock, Long> {
	boolean existsByHostelIdAndNameIgnoreCase(Long hostelId, String name);
}
