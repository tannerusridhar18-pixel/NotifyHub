package com.notifyhub.announcement;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AnnouncementRepository extends JpaRepository<Announcement,Long>{
 Page<Announcement> findByUrgentTrue(Pageable pageable);
 Page<Announcement> findByCategoryIgnoreCase(String category, Pageable pageable);
 Page<Announcement> findByDepartmentIgnoreCase(String department, Pageable pageable);
 Page<Announcement> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(String title,String content,Pageable pageable);
 Page<Announcement> findByCategoryIgnoreCaseAndDepartmentIgnoreCase(String category,String department,Pageable pageable);
}
