package com.notifyhub.config;

import com.notifyhub.auth.Role;
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
    private final PasswordEncoder encoder;
    private final String username;
    private final String email;
    private final String password;
    private final boolean syncPassword;

    public AdminSeeder(
            UserRepository users,
            PasswordEncoder encoder,
            @Value("${notifyhub.admin-username:admin}") String username,
            @Value("${notifyhub.admin-email:admin@notifyhub.local}") String email,
            @Value("${notifyhub.admin-password:}") String password,
            @Value("${notifyhub.admin-sync-password:false}") boolean syncPassword) {
        this.users = users;
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

        User user = users.findByUsername(username).orElseGet(() -> users.findByEmailIgnoreCase(email).orElseGet(User::new));
        user.setUsername(username);
        user.setEmail(email);
        user.setRole(Role.ADMIN);
        user.setAccountStatus(com.notifyhub.auth.AccountStatus.ACTIVE);
        user.setMustChangePassword(false);

        if (syncPassword || user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(encoder.encode(password));
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            users.save(user);
            log.info("NotifyHub admin account ready for username '{}' and email '{}'.", username, email);
        } else if (user.getId() == null) {
            users.save(user);
        }
    }
}
