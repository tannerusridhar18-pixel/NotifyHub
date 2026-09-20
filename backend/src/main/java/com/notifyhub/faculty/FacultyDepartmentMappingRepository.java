package com.notifyhub.faculty;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacultyDepartmentMappingRepository extends JpaRepository<FacultyDepartmentMapping, Long> {
    List<FacultyDepartmentMapping> findByFacultyId(Long facultyId);
    List<FacultyDepartmentMapping> findByFacultyUserId(Long userId);
    List<FacultyDepartmentMapping> findByDepartmentId(Long departmentId);
    Optional<FacultyDepartmentMapping> findByFacultyIdAndDepartmentId(Long facultyId, Long departmentId);
    Optional<FacultyDepartmentMapping> findByFacultyUserIdAndDepartmentId(Long userId, Long departmentId);
    Optional<FacultyDepartmentMapping> findByFacultyIdAndRelationship(Long facultyId, FacultyDepartmentRelationship relationship);
    Optional<FacultyDepartmentMapping> findByFacultyUserIdAndRelationship(Long userId, FacultyDepartmentRelationship relationship);
    boolean existsByFacultyUserIdAndDepartmentId(Long userId, Long departmentId);
    void deleteByFacultyIdAndDepartmentId(Long facultyId, Long departmentId);
}
