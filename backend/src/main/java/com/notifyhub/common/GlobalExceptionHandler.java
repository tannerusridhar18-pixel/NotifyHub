package com.notifyhub.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

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
    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> unsupportedMediaType(org.springframework.web.HttpMediaTypeNotSupportedException ex, HttpServletRequest request) { return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", "Content type is not supported. Use application/json.", request, List.of()); }
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> methodNotSupported(org.springframework.web.HttpRequestMethodNotSupportedException ex, HttpServletRequest request) { return error(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "HTTP method not allowed.", request, List.of()); }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> status(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String code = switch (status) { case UNAUTHORIZED -> "UNAUTHENTICATED"; case FORBIDDEN -> "Account inactive.".equals(ex.getReason()) ? "ACCOUNT_INACTIVE" : "FORBIDDEN"; case CONFLICT -> "CONFLICT"; case TOO_MANY_REQUESTS -> "RATE_LIMITED"; case UNPROCESSABLE_ENTITY -> "VALIDATION_ERROR"; default -> status == HttpStatus.NOT_FOUND ? "NOT_FOUND" : "REQUEST_FAILED"; };
        return error(status, code, ex.getReason() == null ? "Request failed." : ex.getReason(), request, List.of());
    }

    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    ResponseEntity<ApiError> notFound(Exception ex, HttpServletRequest request) { return error(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found.", request, List.of()); }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> denied(AccessDeniedException ex, HttpServletRequest request) { return error(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied.", request, List.of()); }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> conflict(DataIntegrityViolationException ex, HttpServletRequest request) {
        String cause = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String sanitized = sanitizeSqlMessage(cause);
        LOG.warn("Data integrity violation on {} {}: {}", request.getMethod(), request.getRequestURI(), sanitized);
        return error(HttpStatus.CONFLICT, "CONFLICT", "The request conflicts with existing data.", request, List.of());
    }

    private String sanitizeSqlMessage(String message) {
        if (message == null || message.isBlank()) return "Data integrity violation";
        return message
                .replaceAll("(?i)(password|secret|token|cred(ential)?s?)[=:][^\\s,;]+", "$1=***")
                .replaceAll("(?i)(bearer\\s+)[a-zA-Z0-9._~+/-]+", "$1***")
                .replaceAll("'[^']+'", "'[REDACTED]'");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> generic(Exception ex, HttpServletRequest request) { LOG.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex); return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected server error occurred.", request, List.of()); }

    private ResponseEntity<ApiError> error(HttpStatus status, String code, String message, HttpServletRequest request, List<ApiError.FieldError> fields) {
        return ResponseEntity.status(status).body(new ApiError(Instant.now(), status.value(), code, message, request.getRequestURI(), fields));
    }
}
