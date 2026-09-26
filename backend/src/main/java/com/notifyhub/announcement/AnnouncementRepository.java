package com.notifyhub.announcement;

import com.notifyhub.auth.Role;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    @Query("select a from Announcement a where a.status = 'PUBLISHED' and (a.targetType = 'GLOBAL' or (a.targetType = 'ROLE' and a.targetRole = :role) or (a.targetType = 'DEPARTMENT' and a.targetDepartment.id = :departmentId) or (a.targetType = 'BRANCH' and a.targetBranch.id = :branchId) or (a.targetType = 'SECTION' and a.targetSection.id = :sectionId) or (a.targetType = 'HOSTEL' and a.targetHostel.id = :hostelId) or (a.targetType = 'USER' and a.targetUser.id = :userId))")
    Page<Announcement> visible(Role role, Long departmentId, Long branchId, Long sectionId, Long hostelId, Long userId, Pageable pageable);

    @Query("select a from Announcement a where a.status = 'PUBLISHED' and a.targetType = 'GLOBAL' and (a.recipientType is null or lower(a.recipientType) in ('all', 'all_campus', 'global'))")
    Page<Announcement> publicGlobal(Pageable pageable);

    @Query("select a from Announcement a where a.status = 'PUBLISHED' and a.urgent = true and a.targetType = 'GLOBAL' and (a.recipientType is null or lower(a.recipientType) in ('all', 'all_campus', 'global')) order by a.publishedAt desc")
    Page<Announcement> urgentGlobal(Pageable pageable);

    @Query("select a from Announcement a where a.status = 'PUBLISHED' and a.urgent = true order by a.publishedAt desc")
    Page<Announcement> urgent(Pageable pageable);

    Page<Announcement> findByCreatedById(Long createdById, Pageable pageable);

    @Query("select a from Announcement a where a.targetDepartment.id = :deptId or (a.targetDepartment is null and a.createdBy.departmentEntity.id = :deptId) order by a.createdAt desc")
    Page<Announcement> findByDepartment(Long deptId, Pageable pageable);
}
