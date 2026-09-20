package com.notifyhub.faculty;

import com.notifyhub.academicstructure.Department;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "faculty_department_mappings", uniqueConstraints = {
        @UniqueConstraint(name = "ux_faculty_dept_mapping", columnNames = {"faculty_id", "department_id"})
}, indexes = {
        @Index(name = "ix_faculty_dept_department", columnList = "department_id"),
        @Index(name = "ix_faculty_dept_relationship", columnList = "relationship")
})
public class FacultyDepartmentMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faculty_id", nullable = false)
    private FacultyProfile faculty;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FacultyDepartmentRelationship relationship = FacultyDepartmentRelationship.HOME;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public FacultyDepartmentMapping() {}

    public FacultyDepartmentMapping(FacultyProfile faculty, Department department, FacultyDepartmentRelationship relationship) {
        this.faculty = faculty;
        this.department = department;
        this.relationship = relationship;
    }

    public Long getId() { return id; }
    public FacultyProfile getFaculty() { return faculty; }
    public Department getDepartment() { return department; }
    public FacultyDepartmentRelationship getRelationship() { return relationship; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setId(Long id) { this.id = id; }
    public void setFaculty(FacultyProfile faculty) { this.faculty = faculty; }
    public void setDepartment(Department department) { this.department = department; }
    public void setRelationship(FacultyDepartmentRelationship relationship) { this.relationship = relationship; }
}
