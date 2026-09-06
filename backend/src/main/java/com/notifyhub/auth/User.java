package com.notifyhub.auth;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="users", indexes={@Index(name="ux_users_username", columnList="username", unique=true), @Index(name="ux_users_email", columnList="email", unique=true)})
public class User {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @JdbcTypeCode(SqlTypes.CHAR) @Column(name="public_id", nullable=false, unique=true, length=36) private UUID publicId;
    @Column(nullable=false, length=80) private String username;
    @Column(nullable=false, length=190) private String email;
    @Column(name="password_hash", nullable=false, length=100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private Role role;
    @Column(nullable=false) private boolean active=true;
    @Enumerated(EnumType.STRING) @Column(name="account_status", nullable=false, length=20) private AccountStatus accountStatus=AccountStatus.ACTIVE;
    @Column(name="failed_login_attempts", nullable=false) private int failedLoginAttempts;
    @Column(name="locked_until") private Instant lockedUntil;
    @Column(name="must_change_password", nullable=false) private boolean mustChangePassword;
    @Column(nullable=false, updatable=false) private Instant createdAt;
    @Column(nullable=false) private Instant updatedAt;
    @PrePersist void prePersist(){ if(publicId==null) publicId=UUID.randomUUID(); if(accountStatus==null) accountStatus=active?AccountStatus.ACTIVE:AccountStatus.INACTIVE; createdAt=Instant.now(); updatedAt=createdAt; }
    @PreUpdate void preUpdate(){ updatedAt=Instant.now(); }
    public Long getId(){return id;} public UUID getPublicId(){return publicId;} public String getUsername(){return username;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public Role getRole(){return role;} public AccountStatus getAccountStatus(){return accountStatus;} public int getFailedLoginAttempts(){return failedLoginAttempts;} public Instant getLockedUntil(){return lockedUntil;} public boolean isMustChangePassword(){return mustChangePassword;}
    public boolean isActive(){return accountStatus==AccountStatus.ACTIVE && active;}
    public boolean isLocked(Instant now){return lockedUntil!=null && lockedUntil.isAfter(now);}
    public void setUsername(String v){username=v;} public void setEmail(String v){email=v;} public void setPasswordHash(String v){passwordHash=v;} public void setRole(Role v){role=v;} public void setActive(boolean v){active=v; if(accountStatus==AccountStatus.ACTIVE || accountStatus==AccountStatus.INACTIVE) accountStatus=v?AccountStatus.ACTIVE:AccountStatus.INACTIVE;}
    public void setPublicId(UUID v){publicId=v;} public void setAccountStatus(AccountStatus v){accountStatus=v; active=v==AccountStatus.ACTIVE;} public void setFailedLoginAttempts(int v){failedLoginAttempts=v;} public void setLockedUntil(Instant v){lockedUntil=v;} public void setMustChangePassword(boolean v){mustChangePassword=v;}
}
