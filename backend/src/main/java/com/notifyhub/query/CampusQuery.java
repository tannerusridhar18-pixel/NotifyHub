package com.notifyhub.query;

import jakarta.persistence.*;
import com.notifyhub.auth.User;
import com.notifyhub.academicstructure.Department;
import java.time.Instant;

@Entity
@Table(name="queries", indexes={
    @Index(name="ix_query_status", columnList="status"),
    @Index(name="ix_query_email", columnList="email"),
    @Index(name="ix_query_created", columnList="created_at"),
    @Index(name="ix_queries_target_faculty", columnList="target_faculty_id"),
    @Index(name="ix_queries_asker", columnList="asker_id")
})
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

    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="student_id") private User student;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="department_id") private Department departmentEntity;
    @Column(columnDefinition="TEXT") private String question;
    @Column(columnDefinition="TEXT") private String answer;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="answered_by") private User answeredBy;

    @Column(name="target_type", nullable=false, length=30) private String targetType = "DEPARTMENT_ADMIN";
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="target_faculty_id") private User targetFaculty;
    @Column(name="asker_type", nullable=false, length=30) private String askerType = "STUDENT";
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="asker_id") private User asker;

    @PrePersist void pre(){createdAt=Instant.now();}

    public Long getId(){return id;}
    public String getName(){return name;}
    public String getEmail(){return email;}
    public String getDepartment(){return department;}
    public String getSubject(){return subject;}
    public String getMessage(){return message;}
    public QueryStatus getStatus(){return status;}
    public String getAdminResponse(){return adminResponse;}
    public Instant getCreatedAt(){return createdAt;}
    public Instant getAnsweredAt(){return answeredAt;}
    public User getStudent(){return student;}
    public Department getDepartmentEntity(){return departmentEntity;}
    public String getQuestion(){return question;}
    public String getAnswer(){return answer;}
    public User getAnsweredBy(){return answeredBy;}
    public String getTargetType(){return targetType;}
    public User getTargetFaculty(){return targetFaculty;}
    public String getAskerType(){return askerType;}
    public User getAsker(){return asker;}

    public void setName(String v){name=v;}
    public void setEmail(String v){email=v;}
    public void setDepartment(String v){department=v;}
    public void setSubject(String v){subject=v;}
    public void setMessage(String v){message=v;}
    public void setStatus(QueryStatus v){status=v;}
    public void setAdminResponse(String v){adminResponse=v;}
    public void setAnsweredAt(Instant v){answeredAt=v;}
    public void setStudent(User v){student=v;}
    public void setDepartmentEntity(Department v){departmentEntity=v;}
    public void setQuestion(String v){question=v;}
    public void setAnswer(String v){answer=v;}
    public void setAnsweredBy(User v){answeredBy=v;}
    public void setTargetType(String v){targetType=v;}
    public void setTargetFaculty(User v){targetFaculty=v;}
    public void setAskerType(String v){askerType=v;}
    public void setAsker(User v){asker=v;}
}
