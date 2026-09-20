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
    private final PasswordEncoder encoder;
    private final String username;
    private final String email;
    private final String password;
    private final boolean syncPassword;

    public AdminSeeder(
            UserRepository users,
            RoleRepository roles,
            PasswordEncoder encoder,
            @Value("${notifyhub.admin-username:admin}") String username,
            @Value("${notifyhub.admin-email:admin@notifyhub.local}") String email,
            @Value("${notifyhub.admin-password:}") String password,
            @Value("${notifyhub.admin-sync-password:false}") boolean syncPassword) {
        this.users = users;
        this.roles = roles;
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
}
