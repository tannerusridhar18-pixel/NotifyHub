package com.notifyhub.hostel;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "hostel_blocks", uniqueConstraints = @UniqueConstraint(name = "ux_hostel_blocks_hostel_name", columnNames = {"hostel_id", "name"}))
public class HostelBlock {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "hostel_id", nullable = false) private Hostel hostel;
    @Column(nullable = false, length = 120) private String name;
    @Column private Integer capacity;
    @Column(nullable = false) private boolean active = true;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @PrePersist void prePersist() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; } public Hostel getHostel() { return hostel; } public String getName() { return name; } public Integer getCapacity() { return capacity; } public boolean isActive() { return active; }
    public void setHostel(Hostel value) { hostel = value; } public void setName(String value) { name = value; } public void setCapacity(Integer value) { capacity = value; } public void setActive(boolean value) { active = value; }
}
