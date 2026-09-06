package com.notifyhub.academicstructure;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sections", uniqueConstraints = @UniqueConstraint(name = "ux_sections_scope", columnNames = {"department_id", "branch_id", "academic_year", "name"}))
public class Section {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "department_id", nullable = false) private Department department;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "branch_id", nullable = false) private Branch branch;
    @Column(name = "academic_year", nullable = false) private int academicYear;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false) private boolean active = true;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    @PrePersist void prePersist() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public Department getDepartment() { return department; }
    public Branch getBranch() { return branch; }
    public int getAcademicYear() { return academicYear; }
    public String getName() { return name; }
    public boolean isActive() { return active; }
    public void setDepartment(Department department) { this.department = department; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public void setAcademicYear(int academicYear) { this.academicYear = academicYear; }
    public void setName(String name) { this.name = name; }
    public void setActive(boolean active) { this.active = active; }
}
