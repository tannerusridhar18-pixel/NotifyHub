package com.notifyhub.users;

import com.notifyhub.auth.AccountStatus;
import com.notifyhub.auth.Role;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import com.notifyhub.faculty.FacultyProfile;
import com.notifyhub.faculty.FacultyProfileRepository;
//import com.notifyhub.security.NotifyHubPrincipal;
import com.notifyhub.student.StudentProfile;
import com.notifyhub.student.StudentProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class IdentityService {
    private final UserRepository users;
    private final StudentProfileRepository students;
    private final FacultyProfileRepository faculty;

    public IdentityService(UserRepository users, StudentProfileRepository students, FacultyProfileRepository faculty) {
        this.users = users; this.students = students; this.faculty = faculty;
    }

    @Transactional(readOnly = true)
    public CurrentUser current(String username) {
        User user = user(username);
        StudentProfile student = user.getRole() == Role.STUDENT ? students.findByUserId(user.getId()).orElse(null) : null;
        FacultyProfile teacher = user.getRole() == Role.FACULTY ? faculty.findByUserId(user.getId()).orElse(null) : null;
        return CurrentUser.from(user, student, teacher);
    }

    @Transactional
    public void setStatus(UUID publicId, AccountStatus status) {
        if (status == AccountStatus.INVITED) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid account status transition.");
        User user = users.findByPublicId(publicId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.setAccountStatus(status); users.save(user);
    }

    @Transactional
    public void setRole(UUID publicId, Role role) {
        User user = users.findByPublicId(publicId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (role == Role.STUDENT && students.findByUserId(user.getId()).isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Student profile is required before assigning STUDENT.");
        if (role == Role.FACULTY && faculty.findByUserId(user.getId()).isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Faculty profile is required before assigning FACULTY.");
        user.setRole(role); users.save(user);
    }

    public User user(String username) { return users.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.")); }

    public record CurrentUser(String publicId, String email, String role, String accountStatus, StudentView student, FacultyView faculty) {
        static CurrentUser from(User user, StudentProfile student, FacultyProfile faculty) {
            StudentView studentView = student == null ? null : new StudentView(student.getStudentId(), student.getName(), student.getDepartment().getId(), student.getBranch().getId(), student.getSection().getId(), student.getYear(), student.getSemester(), student.isHosteller(), student.getPhone(), student.getPersonalEmail());
            FacultyView facultyView = faculty == null ? null : new FacultyView(faculty.getFacultyId(), faculty.getName(), faculty.getDepartment().getId(), faculty.getPhone(), faculty.getDesignation());
            return new CurrentUser(user.getPublicId().toString(), user.getEmail(), user.getRole().name(), user.getAccountStatus().name(), studentView, facultyView);
        }
    }
    public record StudentView(String studentId, String name, Long departmentId, Long branchId, Long sectionId, int year, int semester, boolean hosteller, String phone, String personalEmail) { }
    public record FacultyView(String facultyId, String name, Long departmentId, String phone, String designation) { }
}
