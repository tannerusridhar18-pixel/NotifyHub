package com.notifyhub.auth;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="refresh_tokens", indexes={@Index(name="ix_refresh_token_hash", columnList="token_hash", unique=true), @Index(name="ix_refresh_user", columnList="user_id")})
public class RefreshToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id", nullable=false) private User user;
    @Column(name="token_hash", nullable=false, length=64, unique=true) private String tokenHash;
    @JdbcTypeCode(SqlTypes.CHAR) @Column(name="family_id", nullable=false, length=36) private UUID familyId;
    @Column(name="replaced_by_hash", length=64) private String replacedByHash;
    @Column(nullable=false) private Instant expiresAt;
    @Column(nullable=false) private boolean revoked=false;
    @Column(name="revoked_at") private Instant revokedAt;
    public Long getId(){return id;} public User getUser(){return user;} public String getTokenHash(){return tokenHash;} public UUID getFamilyId(){return familyId;} public String getReplacedByHash(){return replacedByHash;} public Instant getExpiresAt(){return expiresAt;} public boolean isRevoked(){return revoked;} public Instant getRevokedAt(){return revokedAt;}
    public void setUser(User v){user=v;} public void setTokenHash(String v){tokenHash=v;} public void setFamilyId(UUID v){familyId=v;} public void setReplacedByHash(String v){replacedByHash=v;} public void setExpiresAt(Instant v){expiresAt=v;} public void setRevoked(boolean v){revoked=v; if(v&&revokedAt==null) revokedAt=Instant.now();} public void setRevokedAt(Instant v){revokedAt=v; revoked=v!=null;}
}
