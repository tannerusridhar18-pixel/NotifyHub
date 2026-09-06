package com.notifyhub.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiError.FieldError> fields = ex.getBindingResult().getFieldErrors().stream().map(error -> new ApiError.FieldError(error.getField(), "Invalid value.")).toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request.", request, fields);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> violation(ConstraintViolationException ex, HttpServletRequest request) { return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request.", request, List.of()); }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex, HttpServletRequest request) { return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Malformed request.", request, List.of()); }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) { return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request parameter.", request, List.of()); }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> status(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String code = switch (status) { case UNAUTHORIZED -> "UNAUTHENTICATED"; case FORBIDDEN -> "Account inactive.".equals(ex.getReason()) ? "ACCOUNT_INACTIVE" : "FORBIDDEN"; case CONFLICT -> "CONFLICT"; case TOO_MANY_REQUESTS -> "RATE_LIMITED"; case UNPROCESSABLE_ENTITY -> "VALIDATION_ERROR"; default -> status == HttpStatus.NOT_FOUND ? "NOT_FOUND" : "REQUEST_FAILED"; };
        return error(status, code, ex.getReason() == null ? "Request failed." : ex.getReason(), request, List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> denied(AccessDeniedException ex, HttpServletRequest request) { return error(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied.", request, List.of()); }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> generic(Exception ex, HttpServletRequest request) { return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected server error occurred.", request, List.of()); }

    private ResponseEntity<ApiError> error(HttpStatus status, String code, String message, HttpServletRequest request, List<ApiError.FieldError> fields) {
        return ResponseEntity.status(status).body(new ApiError(Instant.now(), status.value(), code, message, request.getRequestURI(), fields));
    }
}
