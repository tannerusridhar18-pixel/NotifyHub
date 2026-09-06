package com.notifyhub.academicstructure;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "branches", uniqueConstraints = @UniqueConstraint(name = "ux_branches_department_name", columnNames = {"department_id", "name"}))
public class Branch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "department_id", nullable = false) private Department department;
    @Column(nullable = false, length = 120) private String name;
    @Column(name = "course_note", length = 255) private String courseNote;
    @Column(name = "max_year", nullable = false) private int maxYear = 4;
    @Column(nullable = false) private boolean active = true;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    @PrePersist void prePersist() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public Department getDepartment() { return department; }
    public String getName() { return name; }
    public String getCourseNote() { return courseNote; }
    public int getMaxYear() { return maxYear; }
    public boolean isActive() { return active; }
    public void setDepartment(Department department) { this.department = department; }
    public void setName(String name) { this.name = name; }
    public void setCourseNote(String courseNote) { this.courseNote = courseNote; }
    public void setMaxYear(int maxYear) { this.maxYear = maxYear; }
    public void setActive(boolean active) { this.active = active; }
}
