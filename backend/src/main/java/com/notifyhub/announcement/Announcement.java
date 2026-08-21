package com.notifyhub.announcement;

import com.notifyhub.auth.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="announcements", indexes={@Index(name="ix_ann_category", columnList="category"), @Index(name="ix_ann_department", columnList="department"), @Index(name="ix_ann_urgent", columnList="urgent"), @Index(name="ix_ann_published_at", columnList="published_at")})
public class Announcement {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, length=180) private String title;
    @Column(nullable=false, length=80) private String category;
    @Column(nullable=false, length=100) private String department;
    @Column(nullable=false, columnDefinition="TEXT") private String content;
    @Column(nullable=false) private boolean urgent;
    @Column(nullable=false) private Instant publishedAt;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="created_by", nullable=false) private User createdBy;
    @PrePersist void pre(){ if(publishedAt==null) publishedAt=Instant.now(); }
    public Long getId(){return id;} public String getTitle(){return title;} public String getCategory(){return category;} public String getDepartment(){return department;} public String getContent(){return content;} public boolean isUrgent(){return urgent;} public Instant getPublishedAt(){return publishedAt;} public User getCreatedBy(){return createdBy;}
    public void setTitle(String v){title=v;} public void setCategory(String v){category=v;} public void setDepartment(String v){department=v;} public void setContent(String v){content=v;} public void setUrgent(boolean v){urgent=v;} public void setCreatedBy(User v){createdBy=v;}
}
