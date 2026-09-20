package com.notifyhub.event;
import com.notifyhub.auth.User;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="event_registrations", uniqueConstraints=@UniqueConstraint(name="ux_event_registration_student",columnNames={"event_id","student_id"}))
public class EventRegistration {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="event_id",nullable=false) private Event event;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="student_id",nullable=false) private User student;
 @Column(name="registered_at",nullable=false) private Instant registeredAt;
 @PrePersist void pre(){if(registeredAt==null)registeredAt=Instant.now();}
 public Long getId(){return id;} public Event getEvent(){return event;} public User getStudent(){return student;} public Instant getRegisteredAt(){return registeredAt;} public void setEvent(Event v){event=v;} public void setStudent(User v){student=v;}
}
