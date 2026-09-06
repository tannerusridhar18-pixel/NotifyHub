package com.notifyhub.hostel;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {
	boolean existsByBlockIdAndRoomNumberIgnoreCase(Long blockId, String roomNumber);
}
