package com.notifyhub.event;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
public interface EventRepository extends JpaRepository<Event,Long>{ Page<Event> findByStartAtGreaterThanEqual(Instant from,Pageable pageable); Page<Event> findByDepartmentIgnoreCase(String department,Pageable pageable); Page<Event> findByDepartmentIgnoreCaseAndStartAtGreaterThanEqual(String department,Instant from,Pageable pageable); }
