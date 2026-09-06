package com.notifyhub.hostel;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rooms", uniqueConstraints = @UniqueConstraint(name = "ux_rooms_block_number", columnNames = {"block_id", "room_number"}))
public class Room {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "block_id", nullable = false) private HostelBlock block;
    @Column(name = "room_number", nullable = false, length = 40) private String roomNumber;
    @Column private Integer floor;
    @Column(nullable = false) private int capacity;
    @Column(name = "current_occupancy", nullable = false) private int currentOccupancy;
    @Column(nullable = false) private boolean active = true;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @PrePersist void prePersist() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; } public HostelBlock getBlock() { return block; } public String getRoomNumber() { return roomNumber; } public Integer getFloor() { return floor; } public int getCapacity() { return capacity; } public int getCurrentOccupancy() { return currentOccupancy; } public boolean isActive() { return active; }
    public void setBlock(HostelBlock value) { block = value; } public void setRoomNumber(String value) { roomNumber = value; } public void setFloor(Integer value) { floor = value; } public void setCapacity(int value) { capacity = value; } public void setCurrentOccupancy(int value) { currentOccupancy = value; } public void setActive(boolean value) { active = value; }
}
