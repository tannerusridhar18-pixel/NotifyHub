package com.notifyhub.auth;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notifyhub.rbac.PermissionKey;
import java.util.Set;

@Entity
@Table(name = "roles", indexes = {
    @Index(name = "ux_roles_name", columnList = "name", unique = true),
    @Index(name = "ix_roles_level", columnList = "level")
})
public class RoleEntity {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80, unique = true)
    private String name;

    @Column(nullable = false)
    private int level;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_role_id")
    private RoleEntity parentRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "can_post_to", columnDefinition = "TEXT")
    private String canPostTo = "[]";

    @Column(name = "is_system_role", nullable = false)
    private boolean systemRole;

    @Column(name = "is_superadmin", nullable = false)
    private boolean superadmin;

    @ElementCollection(targetClass = PermissionKey.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Enumerated(EnumType.STRING) @Column(name = "permission_key")
    private Set<PermissionKey> permissions = new java.util.HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
        if (canPostTo == null) canPostTo = "[]";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public RoleEntity() {}

    public RoleEntity(String name, int level, RoleEntity parentRole, User createdBy, String canPostTo) {
        this.name = name;
        this.level = level;
        this.parentRole = parentRole;
        this.createdBy = createdBy;
        this.canPostTo = canPostTo;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public int getLevel() { return level; }
    public RoleEntity getParentRole() { return parentRole; }
    public User getCreatedBy() { return createdBy; }
    public String getCanPostTo() { return canPostTo; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public boolean isSystemRole() { return systemRole; }
    public boolean isSuperadmin() { return superadmin; }
    public Set<PermissionKey> getPermissions() { return permissions; }

    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setLevel(int level) { this.level = level; }
    public void setParentRole(RoleEntity parentRole) { this.parentRole = parentRole; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public void setCanPostTo(String canPostTo) { this.canPostTo = canPostTo; }
    public void setSystemRole(boolean v) { systemRole = v; }
    public void setSuperadmin(boolean v) { superadmin = v; }
    public void setPermissions(Set<PermissionKey> v) { permissions = v == null ? new java.util.HashSet<>() : new java.util.HashSet<>(v); }

    public List<Integer> parseCanPostToLevels() {
        if (canPostTo == null || canPostTo.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(canPostTo, new TypeReference<List<Integer>>() {});
        } catch (Exception e) {
            try {
                List<String> stringList = MAPPER.readValue(canPostTo, new TypeReference<List<String>>() {});
                List<Integer> res = new ArrayList<>();
                for (String s : stringList) {
                    try { res.add(Integer.parseInt(s.trim())); } catch (NumberFormatException ignored) {}
                }
                return res;
            } catch (Exception ex) {
                return new ArrayList<>();
            }
        }
    }

    public boolean canTargetLevel(int targetLevel) {
        if (level == 0) return true; // Super Admin can post to all
        List<Integer> allowed = parseCanPostToLevels();
        return allowed.contains(targetLevel);
    }
}
