package com.notifyhub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int publicLimit;
    private final int authLimit;
    private final int queryLimit;

    public RateLimitFilter(
            @Value("${notifyhub.rate-limit-public-per-minute:120}") int publicLimit,
            @Value("${notifyhub.rate-limit-auth-per-minute:10}") int authLimit,
            @Value("${notifyhub.rate-limit-query-per-minute:10}") int queryLimit) {
        this.publicLimit = requirePositive(publicLimit, "public rate limit");
        this.authLimit = requirePositive(authLimit, "auth rate limit");
        this.queryLimit = requirePositive(queryLimit, "query rate limit");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        int limit = publicLimit;
        if (path.startsWith("/api/v1/auth/")) {
            limit = authLimit;
        } else if ("POST".equalsIgnoreCase(request.getMethod()) && "/api/v1/queries".equals(path)) {
            limit = queryLimit;
        }

        long minute = System.currentTimeMillis() / 60_000L;
        String key = request.getRemoteAddr() + "|" + path;
        Window window = windows.compute(key, (ignored, current) ->
                current == null || current.minute != minute ? new Window(minute) : current);

        window.count.increment();
        long count = window.count.sum();

        if (count > limit) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"success\":false,\"data\":null,\"message\":\"Too many requests. Please try again later.\"}");
            return;
        }

        chain.doFilter(request, response);

        // Keep this simple in-process limiter from retaining old windows forever.
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(entry -> entry.getValue().minute < minute - 1);
        }
    }

    private static int requirePositive(int value, String name) {
        if (value <= 0) {
            throw new IllegalStateException(name + " must be greater than zero.");
        }
        return value;
    }

    private static final class Window {
        private final long minute;
        private final LongAdder count = new LongAdder();

        private Window(long minute) {
            this.minute = minute;
        }
    }
}
