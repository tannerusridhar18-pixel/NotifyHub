package com.notifyhub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;
import java.util.regex.Pattern;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private static final Pattern IPV4_PATTERN =
            Pattern.compile("^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.){3}(25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)$");

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int publicLimit;
    private final int authLimit;
    private final int queryLimit;
    private final Set<String> trustedProxies;

    public RateLimitFilter(
            @Value("${notifyhub.rate-limit-public-per-minute:120}") int publicLimit,
            @Value("${notifyhub.rate-limit-auth-per-minute:10}") int authLimit,
            @Value("${notifyhub.rate-limit-query-per-minute:10}") int queryLimit,
            @Value("${notifyhub.trusted-proxies:127.0.0.1,::1,0:0:0:0:0:0:0:1}") String trustedProxies) {
        this.publicLimit = requirePositive(publicLimit, "public rate limit");
        this.authLimit = requirePositive(authLimit, "auth rate limit");
        this.queryLimit = requirePositive(queryLimit, "query rate limit");
        this.trustedProxies = parseTrustedProxies(trustedProxies);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path == null || (!path.startsWith("/api/") && !path.startsWith("/auth/"))) {
            chain.doFilter(request, response);
            return;
        }

        String bucket;
        int limit;
        if (path.startsWith("/api/v1/auth/") || path.startsWith("/auth/")) {
            bucket = "AUTH";
            limit = authLimit;
        } else if ("POST".equalsIgnoreCase(request.getMethod()) &&
                ("/api/v1/queries".equals(path) || "/api/v1/queries/student".equals(path) || "/api/v1/queries/faculty".equals(path))) {
            bucket = "QUERY";
            limit = queryLimit;
        } else {
            bucket = "PUBLIC";
            limit = publicLimit;
        }

        long minute = System.currentTimeMillis() / 60_000L;
        String clientIp = resolveClientIp(request);
        String key = clientIp + "|" + bucket;

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

        // Periodically evict stale windows to prevent memory exhaustion
        if (windows.size() > 5_000) {
            windows.entrySet().removeIf(entry -> entry.getValue().minute < minute - 1);
        }
    }

    public void reset() {
        windows.clear();
    }

    public String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return "unknown";
        }
        String cleanRemote = remoteAddr.trim().toLowerCase(Locale.ROOT);

        // If the immediate connection is NOT from a trusted proxy,
        // NEVER trust client-supplied forwarding headers!
        if (!trustedProxies.contains(cleanRemote)) {
            return cleanRemote;
        }

        // When connected via a trusted proxy, inspect X-Forwarded-For
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) {
            return cleanRemote;
        }

        // Untrusted clients can prepend spoofed headers; proxies append the real IP.
        // Traverse right-to-left to find the rightmost IP that is not a trusted proxy.
        String[] parts = xff.split(",");
        for (int i = parts.length - 1; i >= 0; i--) {
            String candidate = parts[i].trim().toLowerCase(Locale.ROOT);
            if (candidate.isEmpty()) continue;
            if (isValidIp(candidate) && !trustedProxies.contains(candidate)) {
                return candidate;
            }
        }

        return cleanRemote;
    }

    private static boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || ip.length() > 45) return false;
        if (IPV4_PATTERN.matcher(ip).matches()) return true;
        return ip.contains(":") && ip.matches("^[0-9a-fA-F:]+$");
    }

    private static Set<String> parseTrustedProxies(String config) {
        Set<String> set = new HashSet<>(Set.of("127.0.0.1", "::1", "0:0:0:0:0:0:0:1"));
        if (config != null && !config.isBlank()) {
            for (String s : config.split(",")) {
                String trimmed = s.trim().toLowerCase(Locale.ROOT);
                if (!trimmed.isEmpty()) {
                    set.add(trimmed);
                }
            }
        }
        return set;
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
