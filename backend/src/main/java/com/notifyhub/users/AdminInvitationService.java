package com.notifyhub.users;

import com.notifyhub.academicstructure.*;
import com.notifyhub.auth.*;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
import com.notifyhub.security.SecureTokenService;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import com.notifyhub.hostel.Hostel;
import com.notifyhub.hostel.HostelBlock;
import com.notifyhub.hostel.Room;
import com.notifyhub.hostel.HostelRepository;
import com.notifyhub.hostel.HostelBlockRepository;
import com.notifyhub.hostel.RoomRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AdminInvitationService {
    private final UserRepository users;
    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final SectionRepository sections;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;
    private final HostelRepository hostels;
    private final HostelBlockRepository blocks;
    private final RoomRepository rooms;
    private final InvitationRepository invitations;
    private final PasswordEncoder encoder;
    private final SecureTokenService secureTokens;
    private final long invitationHours;

    public AdminInvitationService(UserRepository users, DepartmentRepository departments, BranchRepository branches, SectionRepository sections,
                                  StudentProfileRepository students, FacultyProfileRepository faculty, HostelRepository hostels,
                                  HostelBlockRepository blocks, RoomRepository rooms, InvitationRepository invitations,
                                  PasswordEncoder encoder, SecureTokenService secureTokens,
                                  @Value("${notifyhub.invitation-hours:48}") long invitationHours) {
        this.users = users; this.departments = departments; this.branches = branches; this.sections = sections; this.students = students; this.faculty = faculty;
        this.hostels = hostels; this.blocks = blocks; this.rooms = rooms;
        this.invitations = invitations; this.encoder = encoder; this.secureTokens = secureTokens; this.invitationHours = invitationHours;
    }

    @Transactional
    public InvitationResult create(String adminUsername, InvitationRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists for this email.");
        ProfileRequest profile = request.profile();
        if (profile == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile details are required.");
        User user = new User(); user.setUsername(request.email()); user.setEmail(request.email()); user.setRole(request.role());
        user.setAccountStatus(AccountStatus.INVITED); user.setPasswordHash(encoder.encode(UUID.randomUUID().toString())); user.setMustChangePassword(true);
        users.save(user);
        if (request.role() == Role.STUDENT) createStudent(user, profile); else if (request.role() == Role.FACULTY) createFaculty(user, profile); else throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ADMIN invitations are not supported.");
        String rawToken = secureTokens.rawToken(); Invitation invitation = new Invitation(); invitation.setUser(user); invitation.setCreatedBy(admin(adminUsername));
        invitation.setTokenHash(secureTokens.hash(rawToken)); invitation.setExpiresAt(Instant.now().plus(invitationHours, ChronoUnit.HOURS)); invitations.save(invitation);
        return new InvitationResult(invitation.getId().toString(), user.getPublicId().toString(), user.getEmail(), user.getRole().name(), invitation.getExpiresAt(), rawToken);
    }

    private void createStudent(User user, ProfileRequest request) {
        if (request.studentId() == null || request.name() == null || request.departmentId() == null || request.branchId() == null || request.sectionId() == null || request.year() == null || request.semester() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student profile is incomplete.");
        Department department = department(request.departmentId()); Branch branch = branch(request.branchId()); Section section = section(request.sectionId());
        if (!branch.getDepartment().getId().equals(department.getId()) || !section.getDepartment().getId().equals(department.getId()) || !section.getBranch().getId().equals(branch.getId()) || request.year() < 1 || request.year() > branch.getMaxYear()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student academic scope is invalid.");
        boolean hosteller = request.hosteller() != null && request.hosteller();
        StudentProfile profile = new StudentProfile(); profile.setUser(user); profile.setStudentId(request.studentId()); profile.setName(request.name()); profile.setPhone(request.phone()); profile.setPersonalEmail(request.personalEmail()); profile.setDepartment(department); profile.setBranch(branch); profile.setSection(section); profile.setYear(request.year()); profile.setSemester(request.semester()); profile.setBatch(request.batch()); profile.setHosteller(hosteller);
        if (hosteller && request.hostelId() != null) {
            Hostel hostel = hostels.findById(request.hostelId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hostel not found."));
            HostelBlock block = request.blockId() == null ? null : blocks.findById(request.blockId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hostel block not found."));
            Room room = request.roomId() == null ? null : rooms.findById(request.roomId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room not found."));
            if (!hostel.isActive() || (block != null && (!block.isActive() || !block.getHostel().getId().equals(hostel.getId()))) || (room != null && (room.getBlock() == null || block == null || !room.getBlock().getId().equals(block.getId())))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hostel assignment is invalid.");
            profile.setHostel(hostel); profile.setBlock(block); profile.setRoom(room);
        } else if (!hosteller && (request.hostelId() != null || request.blockId() != null || request.roomId() != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day scholars cannot have hostel assignments.");
        }
        students.save(profile);
    }

    private void createFaculty(User user, ProfileRequest request) {
        if (request.facultyId() == null || request.name() == null || request.departmentId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty profile is incomplete.");
        FacultyProfile profile = new FacultyProfile(); profile.setUser(user); profile.setFacultyId(request.facultyId()); profile.setName(request.name()); profile.setPhone(request.phone()); profile.setDesignation(request.designation()); profile.setDepartment(department(request.departmentId())); faculty.save(profile);
    }

    private User admin(String username) { User user = users.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.")); if (user.getRole() != Role.ADMIN || !user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied."); return user; }
    private Department department(Long id) { return departments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found.")); }
    private Branch branch(Long id) { return branches.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch not found.")); }
    private Section section(Long id) { return sections.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section not found.")); }

    public record InvitationRequest(String email, Role role, ProfileRequest profile) { }
    public record ProfileRequest(String studentId, String facultyId, String name, String phone, String personalEmail, Long departmentId, Long branchId, Long sectionId, Integer year, Integer semester, String batch, Boolean hosteller, Long hostelId, Long blockId, Long roomId, String designation) { }
    public record InvitationResult(String invitationId, String userPublicId, String email, String role, Instant expiresAt, String invitationToken) { }
}
