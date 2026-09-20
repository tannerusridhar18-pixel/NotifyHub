package com.notifyhub.auth;

import com.notifyhub.security.JwtService;
import com.notifyhub.security.SecureTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository users;
    @Mock RefreshTokenRepository tokens;
    @Mock InvitationRepository invitations;
    @Mock PasswordResetTokenRepository resetTokens;
    @Mock PasswordResetEmailService resetEmail;

    private AuthService service;
    private BCryptPasswordEncoder encoder;
    private User user;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder(4);
        JwtService jwt = new JwtService("NotifyHub_Test_JWT_Secret_At_Least_32_Bytes_123456", 15);
        service = new AuthService(users, tokens, invitations, resetTokens, encoder, jwt, new SecureTokenService(), resetEmail, 7, 30);
        user = new User();
        user.setPublicId(UUID.randomUUID());
        user.setUsername("student@example.edu");
        user.setEmail("student@example.edu");
        user.setPasswordHash(encoder.encode("Password1"));
        user.setRole(Role.STUDENT);
        user.setAccountStatus(AccountStatus.ACTIVE);
    }

    @Test
    void loginIssuesSessionForValidCredentials() {
        when(users.findByEmailIgnoreCase("student@example.edu")).thenReturn(Optional.of(user));
        when(tokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.IssuedSession session = service.login("student@example.edu", "Password1");

        assertThat(session.accessToken()).isNotBlank();
        assertThat(session.rawRefreshToken()).isNotBlank();
        assertThat(session.role()).isEqualTo(Role.STUDENT);
        verify(tokens).save(any(RefreshToken.class));
    }

    @Test
    void loginIssuesSessionForSuperAdmin() {
        User superAdmin = new User();
        superAdmin.setPublicId(UUID.randomUUID());
        superAdmin.setUsername("superadmin@notifyhub.local");
        superAdmin.setEmail("superadmin@notifyhub.local");
        superAdmin.setPasswordHash(encoder.encode("SuperSecret123!"));
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdmin.setAccountStatus(AccountStatus.ACTIVE);

        when(users.findByEmailIgnoreCase("superadmin@notifyhub.local")).thenReturn(Optional.of(superAdmin));
        when(tokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.IssuedSession session = service.login("superadmin@notifyhub.local", "SuperSecret123!");

        assertThat(session.accessToken()).isNotBlank();
        assertThat(session.roleLevel()).isEqualTo(0);
        assertThat(session.role()).isEqualTo(Role.SUPER_ADMIN);
    }

    @Test
    void loginDoesNotRevealUnknownAccount() {
        when(users.findByEmailIgnoreCase("missing@example.edu")).thenReturn(Optional.empty());
        when(users.findByUsername("missing@example.edu")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login("missing@example.edu", "Password1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void inactiveAccountCannotLogin() {
        user.setAccountStatus(AccountStatus.INACTIVE);
        when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.login(user.getEmail(), "Password1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Account inactive");
        verifyNoInteractions(tokens);
    }

    @Test
    void refreshRotatesTokenAndRevokesPresentedToken() {
        RefreshToken current = new RefreshToken();
        current.setUser(user); current.setFamilyId(UUID.randomUUID()); current.setTokenHash("old");
        current.setExpiresAt(Instant.now().plusSeconds(60));
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(current));
        when(tokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.IssuedSession session = service.refresh("old-token");

        assertThat(session.rawRefreshToken()).isNotBlank();
        assertThat(current.isRevoked()).isTrue();
        assertThat(current.getReplacedByHash()).isNotBlank();
        verify(tokens, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void invitationRegistrationIsSingleUseAndActivatesUser() {
        Invitation invitation = new Invitation();
        invitation.setUser(user); invitation.setTokenHash("invite"); invitation.setExpiresAt(Instant.now().plusSeconds(60));
        when(invitations.findForUpdateByTokenHash(any())).thenReturn(Optional.of(invitation));
        user.setAccountStatus(AccountStatus.INVITED);
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(invitations.save(any(Invitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.RegistrationResult result = service.register("raw", "Password1", "Password1");

        assertThat(result.email()).isEqualTo(user.getEmail());
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.getPasswordHash()).isNotEqualTo("Password1");
        assertThat(invitation.getUsedAt()).isNotNull();
    }
}
