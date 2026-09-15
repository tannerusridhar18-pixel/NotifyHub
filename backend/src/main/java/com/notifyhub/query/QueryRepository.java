package com.notifyhub.query;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QueryRepository extends JpaRepository<CampusQuery,Long>{
    Page<CampusQuery> findByStatus(QueryStatus status, Pageable pageable);
    Page<CampusQuery> findByEmailIgnoreCase(String email, Pageable pageable);
    long deleteByStatusAndAnsweredAtBefore(QueryStatus status, java.time.Instant cutoff);
}
