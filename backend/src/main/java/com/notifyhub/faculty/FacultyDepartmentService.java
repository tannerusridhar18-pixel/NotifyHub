package com.notifyhub.faculty;

import com.notifyhub.academicstructure.Department;
import com.notifyhub.academicstructure.DepartmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class FacultyDepartmentService {
    private final FacultyDepartmentMappingRepository mappingRepo;
    private final FacultyProfileRepository facultyRepo;
    private final DepartmentRepository departmentRepo;

    public FacultyDepartmentService(FacultyDepartmentMappingRepository mappingRepo,
                                    FacultyProfileRepository facultyRepo,
                                    DepartmentRepository departmentRepo) {
        this.mappingRepo = mappingRepo;
        this.facultyRepo = facultyRepo;
        this.departmentRepo = departmentRepo;
    }

    @Transactional(readOnly = true)
    public List<FacultyDepartmentMapping> getMappingsForFaculty(Long facultyId) {
        return mappingRepo.findByFacultyId(facultyId);
    }

    @Transactional(readOnly = true)
    public List<FacultyDepartmentMapping> getMappingsForUser(Long userId) {
        return mappingRepo.findByFacultyUserId(userId);
    }

    @Transactional(readOnly = true)
    public Optional<FacultyDepartmentMapping> getHomeDepartment(Long userId) {
        return mappingRepo.findByFacultyUserIdAndRelationship(userId, FacultyDepartmentRelationship.HOME);
    }

    @Transactional(readOnly = true)
    public boolean isFacultyInDepartment(Long userId, Long departmentId) {
        if (userId == null || departmentId == null) return false;
        return mappingRepo.existsByFacultyUserIdAndDepartmentId(userId, departmentId);
    }

    @Transactional(readOnly = true)
    public List<Long> getDepartmentIdsForFaculty(Long userId) {
        return mappingRepo.findByFacultyUserId(userId).stream()
                .map(m -> m.getDepartment().getId())
                .toList();
    }

    /**
     * Assigns departments to a faculty member enforcing the invariant that exactly one HOME department exists.
     */
    public void configureDepartments(FacultyProfile profile, Long homeDeptId, List<Long> subDeptIds) {
        if (profile == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty profile required.");
        if (homeDeptId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty must have exactly one HOME department.");

        Department homeDept = departmentRepo.findById(homeDeptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "HOME department not found."));

        // Remove existing mappings
        List<FacultyDepartmentMapping> existing = mappingRepo.findByFacultyId(profile.getId());
        mappingRepo.deleteAll(existing);

        // Add HOME department
        FacultyDepartmentMapping homeMapping = new FacultyDepartmentMapping(profile, homeDept, FacultyDepartmentRelationship.HOME);
        mappingRepo.save(homeMapping);
        profile.setDepartment(homeDept);
        facultyRepo.save(profile);

        // Add SUB departments (excluding homeDeptId to prevent duplicates)
        if (subDeptIds != null) {
            for (Long subId : subDeptIds) {
                if (subId != null && !Objects.equals(subId, homeDeptId)) {
                    Department subDept = departmentRepo.findById(subId).orElse(null);
                    if (subDept != null && subDept.isActive()) {
                        FacultyDepartmentMapping subMapping = new FacultyDepartmentMapping(profile, subDept, FacultyDepartmentRelationship.SUB);
                        mappingRepo.save(subMapping);
                    }
                }
            }
        }
    }

    /**
     * Sets a new HOME department. If already mapped as SUB/GUEST, changes relationship to HOME.
     * Any previous HOME department is demoted to SUB.
     */
    public void setHomeDepartment(FacultyProfile profile, Long newHomeDeptId) {
        if (profile == null || newHomeDeptId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile and Department ID are required.");
        }
        Department newHome = departmentRepo.findById(newHomeDeptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found."));

        List<FacultyDepartmentMapping> currentMappings = mappingRepo.findByFacultyId(profile.getId());
        boolean matched = false;

        for (FacultyDepartmentMapping mapping : currentMappings) {
            if (Objects.equals(mapping.getDepartment().getId(), newHomeDeptId)) {
                mapping.setRelationship(FacultyDepartmentRelationship.HOME);
                mappingRepo.save(mapping);
                matched = true;
            } else if (mapping.getRelationship() == FacultyDepartmentRelationship.HOME) {
                mapping.setRelationship(FacultyDepartmentRelationship.SUB);
                mappingRepo.save(mapping);
            }
        }

        if (!matched) {
            FacultyDepartmentMapping newHomeMapping = new FacultyDepartmentMapping(profile, newHome, FacultyDepartmentRelationship.HOME);
            mappingRepo.save(newHomeMapping);
        }

        profile.setDepartment(newHome);
        facultyRepo.save(profile);
    }
}
