package com.notifyhub.faculty;

import com.notifyhub.academicstructure.Department;
import com.notifyhub.auth.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "faculty_profiles", uniqueConstraints = {
        @UniqueConstraint(name = "ux_faculty_profiles_user", columnNames = "user_id"),
        @UniqueConstraint(name = "ux_faculty_profiles_faculty_id", columnNames = "faculty_id")
})
public class FacultyProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "faculty_id", nullable = false, length = 80) private String facultyId;
    @Column(nullable = false, length = 160) private String name;
    @Column(length = 40) private String phone;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "department_id") private Department department;
    @Column(length = 160) private String designation;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    @OneToMany(mappedBy = "faculty", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private java.util.List<FacultyDepartmentMapping> departmentMappings = new java.util.ArrayList<>();

    @PrePersist void prePersist() {
        if (facultyId == null && user != null) facultyId = "FAC-" + user.getId();
        if (name == null && user != null) name = user.getUsername();
        createdAt = Instant.now();
        updatedAt = createdAt;
    }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getFacultyId() { return facultyId; }
    public String getName() { return name; }
    public Department getDepartment() { return department; }
    public String getPhone() { return phone; }
    public String getDesignation() { return designation; }
    public java.util.List<FacultyDepartmentMapping> getDepartmentMappings() { return departmentMappings; }
    public void setUser(User user) { this.user = user; }
    public void setFacultyId(String facultyId) { this.facultyId = facultyId; }
    public void setName(String name) { this.name = name; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setDepartment(Department department) { this.department = department; }
    public void setDesignation(String designation) { this.designation = designation; }
    public void setDepartmentMappings(java.util.List<FacultyDepartmentMapping> departmentMappings) { this.departmentMappings = departmentMappings; }
}
