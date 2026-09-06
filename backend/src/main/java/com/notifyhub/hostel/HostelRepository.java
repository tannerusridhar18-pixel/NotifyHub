package com.notifyhub.hostel;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HostelRepository extends JpaRepository<Hostel, Long> {
	boolean existsByNameIgnoreCase(String name);
}
