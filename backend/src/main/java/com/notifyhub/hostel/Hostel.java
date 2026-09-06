package com.notifyhub.hostel;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "hostels")
public class Hostel {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 120, unique = true) private String name;
    @Column(length = 40) private String type;
    @Column(name = "total_capacity") private Integer totalCapacity;
    @Column(nullable = false) private boolean active = true;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @PrePersist void prePersist() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; } public String getName() { return name; } public String getType() { return type; } public Integer getTotalCapacity() { return totalCapacity; } public boolean isActive() { return active; }
    public void setName(String value) { name = value; } public void setType(String value) { type = value; } public void setTotalCapacity(Integer value) { totalCapacity = value; } public void setActive(boolean value) { active = value; }
}
