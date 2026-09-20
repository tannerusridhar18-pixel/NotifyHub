package com.notifyhub.config;

import com.notifyhub.auth.Role;
import com.notifyhub.auth.RoleEntity;
import com.notifyhub.auth.RoleRepository;
import com.notifyhub.auth.User;
import com.notifyhub.auth.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository users;
    private final RoleRepository roles;
    private final com.notifyhub.rbac.UserRoleAssignmentRepository assignments;
    private final PasswordEncoder encoder;
    private final String username;
    private final String email;
    private final String password;
    private final boolean syncPassword;

    public AdminSeeder(
            UserRepository users,
            RoleRepository roles,
            com.notifyhub.rbac.UserRoleAssignmentRepository assignments,
            PasswordEncoder encoder,
            @Value("${notifyhub.admin-username:admin}") String username,
            @Value("${notifyhub.admin-email:admin@notifyhub.local}") String email,
            @Value("${notifyhub.admin-password:}") String password,
            @Value("${notifyhub.admin-sync-password:false}") boolean syncPassword) {
        this.users = users;
        this.roles = roles;
        this.assignments = assignments;
        this.encoder = encoder;
        this.username = username;
        this.email = email;
        this.password = password;
        this.syncPassword = syncPassword;
    }

    @Override
    public void run(String... args) {
        if (password == null || password.isBlank()) {
            log.warn("ADMIN_PASSWORD is not configured; admin seeding is skipped.");
            return;
        }

        RoleEntity superAdminRole = roles.findByNameIgnoreCase("SUPER_ADMIN")
                .or(() -> roles.findByLevel(0))
                .orElse(null);

        User user = users.findByUsername(username).orElseGet(() -> users.findByEmailIgnoreCase(email).orElseGet(User::new));
        user.setUsername(username);
        user.setEmail(email);
        user.setRole(Role.SUPER_ADMIN);
        if (superAdminRole != null) {
            user.setRoleEntity(superAdminRole);
        }
        user.setAccountStatus(com.notifyhub.auth.AccountStatus.ACTIVE);
        user.setMustChangePassword(false);

        if (syncPassword || user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(encoder.encode(password));
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            users.save(user);
            log.info("NotifyHub Super Admin account ready for username '{}' and email '{}'.", username, email);
        } else if (user.getId() == null) {
            users.save(user);
        }

        ensureSuperAdminAssignment(user, superAdminRole);

        if (roles.findByNameIgnoreCase("ADMIN").isEmpty()) {
            RoleEntity adminRole = new RoleEntity("ADMIN", 1, superAdminRole, user, "[1,2,3,4,5]");
            adminRole.setSystemRole(true);
            adminRole.setSuperadmin(false);
            roles.save(adminRole);
            log.info("Seeded default role ADMIN.");
        }

        if (roles.findByNameIgnoreCase("DEPARTMENT_ADMIN").isEmpty()) {
            RoleEntity deptAdmin = new RoleEntity("DEPARTMENT_ADMIN", 3, null, user, "[3,4,5]");
            deptAdmin.setSystemRole(false);
            deptAdmin.setSuperadmin(false);
            roles.save(deptAdmin);
            log.info("Seeded default custom role DEPARTMENT_ADMIN.");
        }
    }

    /**
     * The V11 migration only backfills assignments for users that already existed. On a fresh database the
     * seeded Super Admin would otherwise have no RBAC assignment and be refused by every Super-Admin-only endpoint.
     */
    private void ensureSuperAdminAssignment(User user, RoleEntity superAdminRole) {
        if (user.getId() == null || superAdminRole == null || !superAdminRole.isSuperadmin()) return;
        try {
            if (!assignments.existsByUserIdAndRoleIdAndRevokedAtIsNull(user.getId(), superAdminRole.getId())) {
                com.notifyhub.rbac.UserRoleAssignment assignment = new com.notifyhub.rbac.UserRoleAssignment();
                assignment.setUser(user);
                assignment.setRole(superAdminRole);
                assignment.setScopeType(com.notifyhub.rbac.ScopeType.GLOBAL);
                assignment.setScopeId(null);
                assignments.save(assignment);
                log.info("Granted the seeded Super Admin its GLOBAL Super Admin role assignment.");
            }
        } catch (RuntimeException ex) {
            log.warn("Could not ensure the Super Admin role assignment: {}", ex.getMessage());
        }
    }
}
