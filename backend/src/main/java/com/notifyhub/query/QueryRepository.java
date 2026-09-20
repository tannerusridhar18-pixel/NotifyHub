package com.notifyhub.query;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QueryRepository extends JpaRepository<CampusQuery, Long> {
    Page<CampusQuery> findByStatus(QueryStatus status, Pageable pageable);
    Page<CampusQuery> findByEmailIgnoreCase(String email, Pageable pageable);
    Page<CampusQuery> findByStudentId(Long studentId, Pageable pageable);
    Page<CampusQuery> findByAskerId(Long askerId, Pageable pageable);
    Page<CampusQuery> findByDepartmentEntityId(Long departmentId, Pageable pageable);
    Page<CampusQuery> findByDepartmentEntityIdAndStatus(Long departmentId, QueryStatus status, Pageable pageable);
    Page<CampusQuery> findByTargetFacultyId(Long targetFacultyId, Pageable pageable);
    Page<CampusQuery> findByTargetFacultyIdAndStatus(Long targetFacultyId, QueryStatus status, Pageable pageable);
    long deleteByStatusAndAnsweredAtBefore(QueryStatus status, java.time.Instant cutoff);
}
