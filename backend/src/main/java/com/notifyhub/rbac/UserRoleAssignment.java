package com.notifyhub.rbac;

import com.notifyhub.auth.RoleEntity;
import com.notifyhub.auth.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "user_role_assignments")
public class UserRoleAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "role_id", nullable = false) private RoleEntity role;
    @Enumerated(EnumType.STRING) @Column(name = "scope_type", nullable = false) private ScopeType scopeType;
    @Column(name = "scope_id") private Long scopeId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assigned_by") private User assignedBy;
    @Column(name = "assigned_at", nullable = false) private Instant assignedAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    @PrePersist void onCreate() { if (assignedAt == null) assignedAt = Instant.now(); }
    public Long getId(){ return id; } public User getUser(){ return user; } public RoleEntity getRole(){return role;} public ScopeType getScopeType(){return scopeType;} public Long getScopeId(){return scopeId;} public Instant getRevokedAt(){return revokedAt;}
    public void setUser(User v){user=v;} public void setRole(RoleEntity v){role=v;} public void setScopeType(ScopeType v){scopeType=v;} public void setScopeId(Long v){scopeId=v;} public void setAssignedBy(User v){assignedBy=v;} public void revoke(){revokedAt=Instant.now();}
}
