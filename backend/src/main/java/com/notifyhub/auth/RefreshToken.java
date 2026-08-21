package com.notifyhub.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="refresh_tokens", indexes={@Index(name="ix_refresh_token_hash", columnList="token_hash", unique=true), @Index(name="ix_refresh_user", columnList="user_id")})
public class RefreshToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id", nullable=false) private User user;
    @Column(name="token_hash", nullable=false, length=64, unique=true) private String tokenHash;
    @Column(nullable=false) private Instant expiresAt;
    @Column(nullable=false) private boolean revoked=false;
    public Long getId(){return id;} public User getUser(){return user;} public String getTokenHash(){return tokenHash;} public Instant getExpiresAt(){return expiresAt;} public boolean isRevoked(){return revoked;}
    public void setUser(User v){user=v;} public void setTokenHash(String v){tokenHash=v;} public void setExpiresAt(Instant v){expiresAt=v;} public void setRevoked(boolean v){revoked=v;}
}
