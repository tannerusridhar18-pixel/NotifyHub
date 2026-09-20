package com.notifyhub.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {
    boolean existsByEventIdAndStudentId(Long eventId, Long studentId);
    List<EventRegistration> findByEventIdOrderByRegisteredAtAsc(Long eventId);
    List<EventRegistration> findByStudentIdOrderByRegisteredAtDesc(Long studentId);
    void deleteByEventIdAndStudentId(Long eventId, Long studentId);
}
