package com.notifyhub.announcement;

import com.notifyhub.academicstructure.*;
import com.notifyhub.auth.*;
import com.notifyhub.hostel.Hostel;
import com.notifyhub.targeting.TargetType;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="announcements", indexes=@Index(name="ix_ann_visibility",columnList="status,target_type,published_at"))
public class Announcement {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=180) private String title;
    @Column(nullable=false,columnDefinition="TEXT") private String content;
    @Column(nullable=false) private boolean urgent;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private AnnouncementStatus status=AnnouncementStatus.DRAFT;
    @Enumerated(EnumType.STRING) @Column(name="target_type",nullable=false,length=20) private TargetType targetType=TargetType.GLOBAL;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="target_department_id") private Department targetDepartment;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="target_branch_id") private Branch targetBranch;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="target_section_id") private Section targetSection;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="target_hostel_id") private Hostel targetHostel;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="target_user_id") private User targetUser;
    @Enumerated(EnumType.STRING) @Column(name="target_role",length=20) private Role targetRole;

    @Column(name="recipient_type", length=40) private String recipientType = "all";
    @Column(name="recipient_targets", columnDefinition="TEXT") private String recipientTargets;
    @Column(name="attachment_url", length=2048) private String attachmentUrl;
    @Column(name="attachment_name", length=255) private String attachmentName;

    @Column(name="published_at") private Instant publishedAt;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    @Column(name="status_changed_at",nullable=false) private Instant statusChangedAt;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="created_by",nullable=false) private User createdBy;

    @PrePersist void pre(){Instant n=Instant.now();createdAt=n;updatedAt=n;statusChangedAt=n;}
    @PreUpdate void upd(){updatedAt=Instant.now();}

    public Long getId(){return id;}
    public String getTitle(){return title;}
    public String getContent(){return content;}
    public boolean isUrgent(){return urgent;}
    public AnnouncementStatus getStatus(){return status;}
    public TargetType getTargetType(){return targetType;}
    public Department getTargetDepartment(){return targetDepartment;}
    public Branch getTargetBranch(){return targetBranch;}
    public Section getTargetSection(){return targetSection;}
    public Hostel getTargetHostel(){return targetHostel;}
    public User getTargetUser(){return targetUser;}
    public Role getTargetRole(){return targetRole;}
    public String getRecipientType(){return recipientType;}
    public String getRecipientTargets(){return recipientTargets;}
    public String getAttachmentUrl(){return attachmentUrl;}
    public String getAttachmentName(){return attachmentName;}
    public Instant getPublishedAt(){return publishedAt;}
    public Instant getCreatedAt(){return createdAt;}
    public Instant getUpdatedAt(){return updatedAt;}
    public User getCreatedBy(){return createdBy;}

    public void setTitle(String v){title=v;}
    public void setContent(String v){content=v;}
    public void setUrgent(boolean v){urgent=v;}
    public void setStatus(AnnouncementStatus v){status=v;statusChangedAt=Instant.now();}
    public void setTargetType(TargetType v){targetType=v;}
    public void setTargetDepartment(Department v){targetDepartment=v;}
    public void setTargetBranch(Branch v){targetBranch=v;}
    public void setTargetSection(Section v){targetSection=v;}
    public void setTargetHostel(Hostel v){targetHostel=v;}
    public void setTargetUser(User v){targetUser=v;}
    public void setTargetRole(Role v){targetRole=v;}
    public void setRecipientType(String v){recipientType=v;}
    public void setRecipientTargets(String v){recipientTargets=v;}
    public void setAttachmentUrl(String v){attachmentUrl=v;}
    public void setAttachmentName(String v){attachmentName=v;}
    public void setPublishedAt(Instant v){publishedAt=v;}
    public void setCreatedBy(User v){createdBy=v;}
}
