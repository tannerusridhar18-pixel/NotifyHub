package com.notifyhub.auth;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitations")
public class Invitation {
    @Id @JdbcTypeCode(SqlTypes.CHAR) @Column(length = 36) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "used_at") private Instant usedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private InvitationStatus status;
    @Enumerated(EnumType.STRING) @Column(name = "email_status", nullable = false, length = 16) private InvitationEmailStatus emailStatus;
    @Column(name = "email_error", length = 500) private String emailError;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "created_by", nullable = false) private User createdBy;
    @Column(nullable = false, updatable = false) private Instant createdAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = InvitationStatus.PENDING;
        if (emailStatus == null) emailStatus = InvitationEmailStatus.PENDING;
    }
    public UUID getId() { return id; }
    public User getUser() { return user; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public InvitationStatus getStatus() { return status; }
    public InvitationEmailStatus getEmailStatus() { return emailStatus; }
    public String getEmailError() { return emailError; }
    public User getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setUser(User user) { this.user = user; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public void setUsedAt(Instant usedAt) { this.usedAt = usedAt; }
    public void setStatus(InvitationStatus status) { this.status = status; }
    public void setEmailStatus(InvitationEmailStatus emailStatus) { this.emailStatus = emailStatus; }
    public void setEmailError(String emailError) { this.emailError = emailError; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}
