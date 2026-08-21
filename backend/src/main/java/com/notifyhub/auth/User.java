package com.notifyhub.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="users", indexes={@Index(name="ux_users_username", columnList="username", unique=true), @Index(name="ux_users_email", columnList="email", unique=true)})
public class User {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, length=80) private String username;
    @Column(nullable=false, length=190) private String email;
    @Column(name="password_hash", nullable=false, length=100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private Role role;
    @Column(nullable=false) private boolean active=true;
    @Column(nullable=false, updatable=false) private Instant createdAt;
    @Column(nullable=false) private Instant updatedAt;
    @PrePersist void prePersist(){ createdAt=Instant.now(); updatedAt=createdAt; }
    @PreUpdate void preUpdate(){ updatedAt=Instant.now(); }
    public Long getId(){return id;} public String getUsername(){return username;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public Role getRole(){return role;} public boolean isActive(){return active;}
    public void setUsername(String v){username=v;} public void setEmail(String v){email=v;} public void setPasswordHash(String v){passwordHash=v;} public void setRole(Role v){role=v;} public void setActive(boolean v){active=v;}
}
