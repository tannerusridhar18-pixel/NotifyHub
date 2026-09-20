package com.notifyhub.rbac;
import com.notifyhub.auth.User;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="audit_log") public class AuditLog {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id") private User actor;
 @Column(nullable=false) private String action; @Column(name="target_type",nullable=false) private String targetType; @Column(name="target_id",nullable=false) private String targetId;
 @Column(columnDefinition="json") private String metadata; @Column(nullable=false) private Instant timestamp;
 @PrePersist void pre(){if(timestamp==null) timestamp=Instant.now();} public AuditLog(){} public AuditLog(User a,String ac,String tt,String ti,String m){actor=a;action=ac;targetType=tt;targetId=ti;metadata=m;}
}
