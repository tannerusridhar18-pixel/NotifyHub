package com.notifyhub.event;

import com.notifyhub.auth.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="events", indexes={@Index(name="ix_event_department", columnList="department"), @Index(name="ix_event_start", columnList="start_at")})
public class Event {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, length=180) private String title;
    @Column(nullable=false, columnDefinition="TEXT") private String description;
    @Column(nullable=false, length=100) private String department;
    @Column(nullable=false, length=180) private String venue;
    @Column(name="start_at", nullable=false) private Instant startAt;
    @Column(name="end_at", nullable=false) private Instant endAt;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="created_by", nullable=false) private User createdBy;
    public Long getId(){return id;} public String getTitle(){return title;} public String getDescription(){return description;} public String getDepartment(){return department;} public String getVenue(){return venue;} public Instant getStartAt(){return startAt;} public Instant getEndAt(){return endAt;}
    public void setTitle(String v){title=v;} public void setDescription(String v){description=v;} public void setDepartment(String v){department=v;} public void setVenue(String v){venue=v;} public void setStartAt(Instant v){startAt=v;} public void setEndAt(Instant v){endAt=v;} public void setCreatedBy(User v){createdBy=v;}
}
