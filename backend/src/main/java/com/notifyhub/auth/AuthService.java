package com.notifyhub.auth;

import com.notifyhub.security.JwtService;
import com.notifyhub.security.SecureTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {
    private static final String DUMMY_PASSWORD_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.4kSxK9VQ9W0Qm8GzS4hG1vYfWq8x0m2";

    private final UserRepository users;
    private final RefreshTokenRepository tokens;
    private final InvitationRepository invitations;
    private final PasswordResetTokenRepository resetTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final SecureTokenService secureTokens;
    private final PasswordResetEmailService resetEmail;
    private final long refreshDays;
    private final long resetMinutes;

    public AuthService(UserRepository users, RefreshTokenRepository tokens, InvitationRepository invitations,
                       PasswordResetTokenRepository resetTokens, PasswordEncoder encoder, JwtService jwt,
                       SecureTokenService secureTokens, PasswordResetEmailService resetEmail, @Value("${notifyhub.jwt-refresh-days:7}") long refreshDays,
                       @Value("${notifyhub.password-reset-minutes:30}") long resetMinutes) {
        if (refreshDays < 1 || refreshDays > 90) throw new IllegalStateException("JWT refresh lifetime must be between 1 and 90 days.");
        if (resetMinutes < 5 || resetMinutes > 120) throw new IllegalStateException("Password reset lifetime must be between 5 and 120 minutes.");
        this.users = users; this.tokens = tokens; this.invitations = invitations; this.resetTokens = resetTokens;
        this.encoder = encoder; this.jwt = jwt; this.secureTokens = secureTokens; this.resetEmail = resetEmail;
        this.refreshDays = refreshDays; this.resetMinutes = resetMinutes;
    }

    @Transactional
    public IssuedSession login(String email, String password) {
        User user = users.findByEmailIgnoreCase(email).orElseGet(() -> users.findByUsername(email).orElse(null));
        if (user == null) { encoder.matches(password, DUMMY_PASSWORD_HASH); throw invalidCredentials(); }
        if (!user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account inactive.");
        if (user.isLocked(Instant.now())) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again later.");
        if (!encoder.matches(password, user.getPasswordHash())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= 5) user.setLockedUntil(Instant.now().plus(5, ChronoUnit.MINUTES));
            users.save(user);
            throw invalidCredentials();
        }

        user.setFailedLoginAttempts(0); user.setLockedUntil(null);
        return issue(user, UUID.randomUUID());
    }

    @Transactional
    public IssuedSession refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) throw invalidRefreshToken();
        RefreshToken current = tokens.findByTokenHash(secureTokens.hash(rawRefreshToken)).orElseThrow(this::invalidRefreshToken);
        if (current.isRevoked()) { revokeFamily(current.getFamilyId()); throw invalidRefreshToken(); }
        if (current.getExpiresAt().isBefore(Instant.now()) || !current.getUser().isActive()) {
            current.setRevoked(true); tokens.save(current); throw invalidRefreshToken();
        }
        IssuedSession next = issue(current.getUser(), current.getFamilyId());
        current.setRevoked(true); current.setReplacedByHash(secureTokens.hash(next.rawRefreshToken())); tokens.save(current);
        return next;
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        tokens.findByTokenHash(secureTokens.hash(rawRefreshToken)).ifPresent(token -> { token.setRevoked(true); tokens.save(token); });
    }

    @Transactional
    public RegistrationResult register(String rawInvitationToken, String password, String confirmation) {
        validatePassword(password, confirmation);
        Invitation invitation = invitations.findForUpdateByTokenHash(secureTokens.hash(rawInvitationToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid invitation."));
        if (invitation.getUsedAt() != null || invitation.getExpiresAt().isBefore(Instant.now()) || invitation.getUser().getAccountStatus() != AccountStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid invitation.");
        }
        User user = invitation.getUser();
        if (user.getEffectiveLevel() == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Super Admin accounts cannot be activated via public invite.");
        }
        user.setPasswordHash(encoder.encode(password)); user.setAccountStatus(AccountStatus.ACTIVE); user.setMustChangePassword(false);
        invitation.setUsedAt(Instant.now()); invitation.setStatus(InvitationStatus.USED); users.save(user); invitations.save(invitation);
        return new RegistrationResult(user.getEmail());
    }

    @Transactional
    public void requestPasswordReset(String email) {
        users.findByEmailIgnoreCase(email).filter(User::isActive).ifPresent(user -> {
            resetTokens.deleteByUserId(user.getId());
            String rawToken = secureTokens.rawToken();
            PasswordResetToken token = new PasswordResetToken(); token.setUser(user); token.setTokenHash(secureTokens.hash(rawToken));
            token.setExpiresAt(Instant.now().plus(resetMinutes, ChronoUnit.MINUTES)); resetTokens.save(token);
            resetEmail.send(user.getEmail(), rawToken, resetMinutes);
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String password, String confirmation) {
        validatePassword(password, confirmation);
        PasswordResetToken token = resetTokens.findForUpdateByTokenHash(secureTokens.hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reset token."));
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(Instant.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reset token.");
        User user = token.getUser(); user.setPasswordHash(encoder.encode(password)); user.setAccountStatus(AccountStatus.ACTIVE);
        user.setFailedLoginAttempts(0); user.setLockedUntil(null); token.setUsedAt(Instant.now());
        tokens.deleteByUserId(user.getId()); resetTokens.save(token); users.save(user);
    }

    private IssuedSession issue(User user, UUID familyId) {
        String rawRefresh = secureTokens.rawToken(); RefreshToken token = new RefreshToken(); token.setUser(user); token.setFamilyId(familyId);
        token.setTokenHash(secureTokens.hash(rawRefresh)); token.setExpiresAt(Instant.now().plus(refreshDays, ChronoUnit.DAYS)); tokens.save(token);
        return new IssuedSession(
                jwt.accessToken(user),
                rawRefresh,
                user.getRole(),
                user.getRoleEntity() != null ? user.getRoleEntity().getId() : null,
                user.getEffectiveLevel(),
                user.getEffectiveRoleName(),
                user.isMustChangePassword()
        );
    }

    private void revokeFamily(UUID familyId) { List<RefreshToken> family = tokens.findByFamilyId(familyId); family.forEach(token -> token.setRevoked(true)); tokens.saveAll(family); }
    private void validatePassword(String password, String confirmation) {
        if (password == null || password.length() < 8 || !password.matches(".*[A-Za-z].*") || !password.matches(".*[0-9].*") || !password.equals(confirmation)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password does not meet the required policy.");
        }
    }
    private ResponseStatusException invalidCredentials() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password."); }
    private ResponseStatusException invalidRefreshToken() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token."); }

    public record IssuedSession(
            String accessToken,
            String rawRefreshToken,
            Role role,
            Long roleId,
            int roleLevel,
            String roleName,
            boolean mustChangePassword
    ) {
        public IssuedSession(String accessToken, String rawRefreshToken, Role role, boolean mustChangePassword) {
            this(accessToken, rawRefreshToken, role, null, role == Role.SUPER_ADMIN || role == Role.ADMIN ? 0 : role == Role.FACULTY ? 4 : 5, role.name(), mustChangePassword);
        }
    }
    public record RegistrationResult(String email) { }
}
