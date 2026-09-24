package com.notifyhub.auth;

import com.notifyhub.academicstructure.Branch;
import com.notifyhub.academicstructure.Department;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="users", indexes={
    @Index(name="ux_users_username", columnList="username", unique=true),
    @Index(name="ux_users_email", columnList="email", unique=true),
    @Index(name="ix_users_role_id", columnList="role_id"),
    @Index(name="ix_users_department_id", columnList="department_id"),
    @Index(name="ix_users_reports_to", columnList="reports_to")
})
public class User {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @JdbcTypeCode(SqlTypes.CHAR) @Column(name="public_id", nullable=false, unique=true, length=36) private UUID publicId;
    @Column(nullable=false, length=190) private String username;
    @Column(nullable=false, length=190) private String email;
    @Column(name="password_hash", nullable=false, length=100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private Role role = Role.STUDENT;

    @ManyToOne(fetch=FetchType.EAGER)
    @JoinColumn(name="role_id")
    private RoleEntity roleEntity;

    @Column(length=100)
    private String department;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="department_id")
    private Department departmentEntity;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="branch_id")
    private Branch branchEntity;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="reports_to")
    private User reportsTo;

    @Column(nullable=false) private boolean active=true;
    @Enumerated(EnumType.STRING) @Column(name="account_status", nullable=false, length=20) private AccountStatus accountStatus=AccountStatus.ACTIVE;
    @Column(name="failedLoginAttempts", nullable=false) private int failedLoginAttempts;
    @Column(name="locked_until") private Instant lockedUntil;
    @Column(name="must_change_password", nullable=false) private boolean mustChangePassword;
    @Column(nullable=false, updatable=false) private Instant createdAt;
    @Column(nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){
        if(publicId==null) publicId=UUID.randomUUID();
        if(accountStatus==null) accountStatus=active?AccountStatus.ACTIVE:AccountStatus.INACTIVE;
        createdAt=Instant.now();
        updatedAt=createdAt;
    }
    @PreUpdate void preUpdate(){ updatedAt=Instant.now(); }

    public Long getId(){return id;}
    public UUID getPublicId(){ if (publicId == null) publicId = UUID.randomUUID(); return publicId; }
    public String getUsername(){return username;}
    public String getEmail(){return email;}
    public String getPasswordHash(){return passwordHash;}
    public Role getRole(){return role;}
    public RoleEntity getRoleEntity(){return roleEntity;}
    public String getDepartment(){return departmentEntity != null ? departmentEntity.getName() : department;}
    public Department getDepartmentEntity(){return departmentEntity;}
    public Branch getBranchEntity(){return branchEntity;}
    public User getReportsTo(){return reportsTo;}
    public AccountStatus getAccountStatus(){return accountStatus != null ? accountStatus : (active ? AccountStatus.ACTIVE : AccountStatus.INACTIVE);}
    public int getFailedLoginAttempts(){return failedLoginAttempts;}
    public Instant getLockedUntil(){return lockedUntil;}
    public boolean isMustChangePassword(){return mustChangePassword;}
    public Instant getCreatedAt(){return createdAt;}
    public Instant getUpdatedAt(){return updatedAt;}

    public boolean isActive(){return accountStatus==AccountStatus.ACTIVE && active;}
    public boolean isLocked(Instant now){return lockedUntil!=null && lockedUntil.isAfter(now);}

    public int getEffectiveLevel() {
        if (roleEntity != null) return roleEntity.getLevel();
        if (role == Role.SUPER_ADMIN || role == Role.ADMIN) return 0;
        if (role == Role.PRINCIPAL) return 1;
        if (role == Role.DEAN) return 2;
        if (role == Role.HOD || role == Role.DEPARTMENT_ADMIN) return 3;
        if (role == Role.FACULTY) return 4;
        return 5;
    }

    /** Legacy admin tier (Super Admin or Admin) - the same rule the JWT filter uses to grant ROLE_ADMIN. */
    public boolean hasAdminAccess() {
        String roleName = getEffectiveRoleName();
        return getEffectiveLevel() == 0 || role == Role.SUPER_ADMIN || role == Role.ADMIN
                || "SUPER_ADMIN".equalsIgnoreCase(roleName) || "ADMIN".equalsIgnoreCase(roleName);
    }

    public String getEffectiveRoleName() {
        if (roleEntity != null) return roleEntity.getName();
        return role != null ? role.name() : "STUDENT";
    }

    public void setId(Long v){id=v;}
    public void setUsername(String v){username=v;}
    public void setEmail(String v){email=v;}
    public void setPasswordHash(String v){passwordHash=v;}
    public void setRole(Role v){
        role=v;
    }
    public void setRoleEntity(RoleEntity v){
        roleEntity=v;
        if (v != null) {
            this.role = Role.fromName(v.getName());
        }
    }
    public void setDepartment(String v){department=v;}
    public void setDepartmentEntity(Department v){departmentEntity=v; if (v != null) department = v.getName();}
    public void setBranchEntity(Branch v){branchEntity=v;}
    public void setReportsTo(User v){reportsTo=v;}
    public void setActive(boolean v){active=v; if(accountStatus==AccountStatus.ACTIVE || accountStatus==AccountStatus.INACTIVE) accountStatus=v?AccountStatus.ACTIVE:AccountStatus.INACTIVE;}
    public void setPublicId(UUID v){publicId=v;}
    public void setAccountStatus(AccountStatus v){accountStatus=v; active=v==AccountStatus.ACTIVE;}
    public void setFailedLoginAttempts(int v){failedLoginAttempts=v;}
    public void setLockedUntil(Instant v){lockedUntil=v;}
    public void setMustChangePassword(boolean v){mustChangePassword=v;}
}
