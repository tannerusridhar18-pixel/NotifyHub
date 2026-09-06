package com.notifyhub.integration;

import com.notifyhub.academicstructure.*;
import com.notifyhub.auth.*;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import com.notifyhub.hostel.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class IdentityPersistenceTest {
    @Autowired UserRepository users;
    @Autowired DepartmentRepository departments;
    @Autowired BranchRepository branches;
    @Autowired SectionRepository sections;
    @Autowired StudentProfileRepository students;
    @Autowired HostelRepository hostels;
    @Autowired HostelBlockRepository blocks;
    @Autowired RoomRepository rooms;

    @Test
    void identityAndProfilePersistThroughMySqlSchema() {
        Department department = new Department(); department.setName("Phase 1 Test Department"); departments.saveAndFlush(department);
        Branch branch = new Branch(); branch.setDepartment(department); branch.setName("Phase 1 Test Program"); branches.saveAndFlush(branch);
        Section section = new Section(); section.setDepartment(department); section.setBranch(branch); section.setAcademicYear(2026); section.setName("A"); sections.saveAndFlush(section);

        User user = new User(); user.setUsername("phase1.student@example.edu"); user.setEmail("phase1.student@example.edu"); user.setPasswordHash("$2a$12$not-a-real-test-password-hash"); user.setRole(Role.STUDENT); user.setAccountStatus(AccountStatus.ACTIVE); users.saveAndFlush(user);
        StudentProfile profile = new StudentProfile(); profile.setUser(user); profile.setStudentId("PHASE1-001"); profile.setName("Phase One Student"); profile.setDepartment(department); profile.setBranch(branch); profile.setSection(section); profile.setYear(1); profile.setSemester(1); students.saveAndFlush(profile);

        User loaded = users.findByEmailIgnoreCase("phase1.student@example.edu").orElseThrow();
        StudentProfile loadedProfile = students.findByUserId(loaded.getId()).orElseThrow();
        assertThat(loaded.getPublicId()).isNotNull();
        assertThat(loaded.getRole()).isEqualTo(Role.STUDENT);
        assertThat(loadedProfile.getDepartment().getName()).isEqualTo("Phase 1 Test Department");
    }

    @Test
    void hostelStructureAndStudentRelationshipPersist() {
        Hostel hostel = new Hostel(); hostel.setName("Phase 2 Test Hostel"); hostel.setType("Boys"); hostels.saveAndFlush(hostel);
        HostelBlock block = new HostelBlock(); block.setHostel(hostel); block.setName("Block A"); block.setCapacity(100); blocks.saveAndFlush(block);
        Room room = new Room(); room.setBlock(block); room.setRoomNumber("A-101"); room.setFloor(1); room.setCapacity(4); rooms.saveAndFlush(room);

        User user = new User(); user.setUsername("phase2.hosteller@example.edu"); user.setEmail(user.getUsername()); user.setPasswordHash("test-hash"); user.setRole(Role.STUDENT); user.setAccountStatus(AccountStatus.ACTIVE); users.saveAndFlush(user);
        Department department = new Department(); department.setName("Phase 2 Test Department"); departments.saveAndFlush(department);
        Branch branch = new Branch(); branch.setDepartment(department); branch.setName("Phase 2 Test Program"); branches.saveAndFlush(branch);
        Section section = new Section(); section.setDepartment(department); section.setBranch(branch); section.setAcademicYear(2026); section.setName("A"); sections.saveAndFlush(section);
        StudentProfile profile = new StudentProfile(); profile.setUser(user); profile.setStudentId("PHASE2-001"); profile.setName("Hosteller"); profile.setDepartment(department); profile.setBranch(branch); profile.setSection(section); profile.setYear(1); profile.setSemester(1); profile.setHosteller(true); profile.setHostel(hostel); profile.setBlock(block); profile.setRoom(room); students.saveAndFlush(profile);

        StudentProfile loaded = students.findByUserId(user.getId()).orElseThrow();
        assertThat(loaded.getHostel().getName()).isEqualTo("Phase 2 Test Hostel");
        assertThat(loaded.getBlock().getName()).isEqualTo("Block A");
        assertThat(loaded.getRoom().getRoomNumber()).isEqualTo("A-101");
    }
}
