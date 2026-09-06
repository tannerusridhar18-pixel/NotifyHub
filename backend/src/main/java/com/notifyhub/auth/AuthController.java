package com.notifyhub.auth;

import com.notifyhub.common.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final AuthCookieService cookies;

    public AuthController(AuthService service, AuthCookieService cookies) { this.service = service; this.cookies = cookies; }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthService.IssuedSession session = service.login(request.email(), request.password());
        cookies.setSessionCookies(response, session);
        return ResponseEntity.ok(ApiResponse.ok(new AuthResponse(session.role().name(), session.mustChangePassword())));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(HttpServletRequest request, HttpServletResponse response) {
        AuthService.IssuedSession session = service.refresh(cookie(request, "NH_REFRESH"));
        cookies.setSessionCookies(response, session);
        return ResponseEntity.ok(ApiResponse.ok(new AuthResponse(session.role().name(), session.mustChangePassword())));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        service.logout(cookie(request, "NH_REFRESH"));
        cookies.clearSessionCookies(response);
        return ResponseEntity.ok(ApiResponse.message("Logged out."));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthService.RegistrationResult>> register(@Valid @RequestBody RegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.register(request.invitationToken(), request.password(), request.confirmPassword())));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        service.requestPasswordReset(request.email());
        return ResponseEntity.ok(ApiResponse.message("If an account exists for this email, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        service.resetPassword(request.token(), request.password(), request.confirmPassword());
        return ResponseEntity.ok(ApiResponse.message("Password reset successfully."));
    }

    private String cookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) if (name.equals(cookie.getName())) return cookie.getValue();
        return null;
    }

    public record LoginRequest(@NotBlank @Size(max = 190) String email, @NotBlank @Size(max = 200) String password) { }
    public record RegistrationRequest(@NotBlank @Size(max = 256) String invitationToken, @NotBlank String password, @NotBlank String confirmPassword) { }
    public record ForgotPasswordRequest(@NotBlank @Email @Size(max = 190) String email) { }
    public record ResetPasswordRequest(@NotBlank @Size(max = 256) String token, @NotBlank String password, @NotBlank String confirmPassword) { }
    public record AuthResponse(String role, boolean mustChangePassword) { }
}
