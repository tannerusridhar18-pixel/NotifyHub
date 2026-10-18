package com.notifyhub.auth;

import com.notifyhub.config.AdminSeeder;
import com.notifyhub.rbac.UserRoleAssignmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminRoleRemovalVerificationTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleAssignmentRepository assignmentRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("AdminSeeder does not recreate or save the ADMIN role on startup")
    void adminSeederDoesNotRecreateAdminRole() {
        RoleEntity superAdminRole = new RoleEntity("SUPER_ADMIN", 0, null, null, "[0,1,2,3,4,5]");
        superAdminRole.setSuperadmin(true);
        when(roleRepository.findByNameIgnoreCase("SUPER_ADMIN")).thenReturn(Optional.of(superAdminRole));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("admin@notifyhub.local")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(roleRepository.findByNameIgnoreCase("DEPARTMENT_ADMIN")).thenReturn(Optional.of(new RoleEntity()));

        AdminSeeder seeder = new AdminSeeder(
                userRepository,
                roleRepository,
                assignmentRepository,
                passwordEncoder,
                "admin",
                "admin@notifyhub.local",
                "SecretPass123!",
                false
        );

        seeder.run();

        // Verify that findByNameIgnoreCase("ADMIN") was NEVER called
        verify(roleRepository, never()).findByNameIgnoreCase("ADMIN");

        // Verify that roles.save is NEVER called for an ADMIN role entity
        verify(roleRepository, never()).save(argThat(r -> r != null && "ADMIN".equalsIgnoreCase(r.getName())));
    }

    @Test
    @DisplayName("Role enum contains ADMIN for application authorization logic")
    void roleEnumPreservesAdminForAuthorization() {
        assertThat(Role.ADMIN).isNotNull();
        assertThat(Role.SUPER_ADMIN).isNotNull();
        assertThat(Role.PRINCIPAL).isNotNull();
        assertThat(Role.DEAN).isNotNull();
        assertThat(Role.HOD).isNotNull();
        assertThat(Role.DEPARTMENT_ADMIN).isNotNull();
        assertThat(Role.FACULTY).isNotNull();
        assertThat(Role.STUDENT).isNotNull();
    }
}
