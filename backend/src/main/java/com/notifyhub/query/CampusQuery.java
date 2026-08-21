package com.notifyhub.query;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="queries", indexes={@Index(name="ix_query_status", columnList="status"), @Index(name="ix_query_email", columnList="email"), @Index(name="ix_query_created", columnList="created_at")})
public class CampusQuery {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, length=120) private String name;
    @Column(nullable=false, length=190) private String email;
    @Column(nullable=false, length=100) private String department;
    @Column(nullable=false, length=180) private String subject;
    @Column(nullable=false, columnDefinition="TEXT") private String message;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private QueryStatus status=QueryStatus.OPEN;
    @Column(name="admin_response", columnDefinition="TEXT") private String adminResponse;
    @Column(nullable=false, updatable=false) private Instant createdAt;
    @Column private Instant answeredAt;
    @PrePersist void pre(){createdAt=Instant.now();}
    public Long getId(){return id;} public String getName(){return name;} public String getEmail(){return email;} public String getDepartment(){return department;} public String getSubject(){return subject;} public String getMessage(){return message;} public QueryStatus getStatus(){return status;} public String getAdminResponse(){return adminResponse;} public Instant getCreatedAt(){return createdAt;} public Instant getAnsweredAt(){return answeredAt;}
    public void setName(String v){name=v;} public void setEmail(String v){email=v;} public void setDepartment(String v){department=v;} public void setSubject(String v){subject=v;} public void setMessage(String v){message=v;} public void setStatus(QueryStatus v){status=v;} public void setAdminResponse(String v){adminResponse=v;} public void setAnsweredAt(Instant v){answeredAt=v;}
}
