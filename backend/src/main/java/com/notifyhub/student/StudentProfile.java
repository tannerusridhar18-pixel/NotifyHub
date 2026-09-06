package com.notifyhub.student;

import com.notifyhub.academicstructure.Branch;
import com.notifyhub.academicstructure.Department;
import com.notifyhub.academicstructure.Section;
import com.notifyhub.auth.User;
import com.notifyhub.hostel.Hostel;
import com.notifyhub.hostel.HostelBlock;
import com.notifyhub.hostel.Room;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "student_profiles", uniqueConstraints = {
        @UniqueConstraint(name = "ux_student_profiles_user", columnNames = "user_id"),
        @UniqueConstraint(name = "ux_student_profiles_student_id", columnNames = "student_id")
})
public class StudentProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "student_id", nullable = false, length = 80) private String studentId;
    @Column(nullable = false, length = 160) private String name;
    @Column(length = 40) private String phone;
    @Column(name = "personal_email", length = 190) private String personalEmail;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "department_id", nullable = false) private Department department;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "branch_id", nullable = false) private Branch branch;
    @Column(nullable = false) private int year;
    @Column(nullable = false) private int semester;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "section_id", nullable = false) private Section section;
    @Column(length = 40) private String batch;
    @Column(name = "is_hosteller", nullable = false) private boolean hosteller;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "hostel_id") private Hostel hostel;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "block_id") private HostelBlock block;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "room_id") private Room room;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;

    @PrePersist void prePersist() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getStudentId() { return studentId; }
    public String getName() { return name; }
    public Department getDepartment() { return department; }
    public Branch getBranch() { return branch; }
    public int getYear() { return year; }
    public int getSemester() { return semester; }
    public Section getSection() { return section; }
    public boolean isHosteller() { return hosteller; }
    public String getPhone() { return phone; }
    public String getPersonalEmail() { return personalEmail; }
    public String getBatch() { return batch; }
    public Hostel getHostel() { return hostel; }
    public HostelBlock getBlock() { return block; }
    public Room getRoom() { return room; }
    public void setUser(User user) { this.user = user; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public void setName(String name) { this.name = name; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setPersonalEmail(String personalEmail) { this.personalEmail = personalEmail; }
    public void setDepartment(Department department) { this.department = department; }
    public void setBranch(Branch branch) { this.branch = branch; }
    public void setYear(int year) { this.year = year; }
    public void setSemester(int semester) { this.semester = semester; }
    public void setSection(Section section) { this.section = section; }
    public void setBatch(String batch) { this.batch = batch; }
    public void setHosteller(boolean hosteller) { this.hosteller = hosteller; }
    public void setHostel(Hostel hostel) { this.hostel = hostel; }
    public void setBlock(HostelBlock block) { this.block = block; }
    public void setRoom(Room room) { this.room = room; }
}
