package com.notifyhub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter(5, 3, 2, "127.0.0.1,::1,10.0.0.1");
        chain = mock(FilterChain.class);
    }

    @Test
    void directConnectionIgnoresSpoofedXForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/announcements");
        request.setRemoteAddr("203.0.113.195");
        request.addHeader("X-Forwarded-For", "1.1.1.1, 10.0.0.1");

        String clientIp = filter.resolveClientIp(request);
        assertThat(clientIp).isEqualTo("203.0.113.195");
    }

    @Test
    void trustedProxyExtractsRealClientIp() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/announcements");
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "198.51.100.24");

        String clientIp = filter.resolveClientIp(request);
        assertThat(clientIp).isEqualTo("198.51.100.24");
    }

    @Test
    void trustedProxyWithClientSpoofedPrefixPicksRightmostNonTrustedIp() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/announcements");
        request.setRemoteAddr("10.0.0.1");
        // Attacker spoofed 8.8.8.8, real client is 198.51.100.24, forwarded through proxy 10.0.0.1
        request.addHeader("X-Forwarded-For", "8.8.8.8, 198.51.100.24, 10.0.0.1");

        String clientIp = filter.resolveClientIp(request);
        assertThat(clientIp).isEqualTo("198.51.100.24");
    }

    @Test
    void fixedCategoryBucketingAggregatesVariablePaths() throws ServletException, IOException {
        String ip = "192.0.2.10";

        // Auth limit is 3. Sending 3 requests to different auth endpoints should use up the limit
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 4th request to a DIFFERENT auth endpoint (/api/v1/auth/refresh) from same IP should be blocked
        MockHttpServletRequest req4 = new MockHttpServletRequest("POST", "/api/v1/auth/refresh");
        req4.setRemoteAddr(ip);
        MockHttpServletResponse res4 = new MockHttpServletResponse();
        filter.doFilter(req4, res4, chain);
        assertThat(res4.getStatus()).isEqualTo(429);
        assertThat(res4.getHeader("Retry-After")).isEqualTo("60");
        assertThat(res4.getContentAsString()).contains("Too many requests");
    }

    @Test
    void directAuthPathWithoutApiPrefixIsRateLimitedInAuthBucket() throws ServletException, IOException {
        String ip = "192.0.2.20";

        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/auth/login");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest req4 = new MockHttpServletRequest("POST", "/auth/refresh");
        req4.setRemoteAddr(ip);
        MockHttpServletResponse res4 = new MockHttpServletResponse();
        filter.doFilter(req4, res4, chain);
        assertThat(res4.getStatus()).isEqualTo(429);
        assertThat(res4.getContentAsString()).contains("Too many requests");
    }

    @Test
    void differentClientsDoNotShareLimitBehindTrustedProxy() throws ServletException, IOException {
        // Client A makes 3 auth requests through trusted proxy 127.0.0.1
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr("127.0.0.1");
            req.addHeader("X-Forwarded-For", "198.51.100.1");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // Client A's 4th request is blocked
        MockHttpServletRequest reqA4 = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqA4.setRemoteAddr("127.0.0.1");
        reqA4.addHeader("X-Forwarded-For", "198.51.100.1");
        MockHttpServletResponse resA4 = new MockHttpServletResponse();
        filter.doFilter(reqA4, resA4, chain);
        assertThat(resA4.getStatus()).isEqualTo(429);

        // Client B making request from 198.51.100.2 through same proxy should NOT be blocked (shared-IP solved)
        MockHttpServletRequest reqB = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqB.setRemoteAddr("127.0.0.1");
        reqB.addHeader("X-Forwarded-For", "198.51.100.2");
        MockHttpServletResponse resB = new MockHttpServletResponse();
        filter.doFilter(reqB, resB, chain);
        assertThat(resB.getStatus()).isEqualTo(200);
    }

    @Test
    void csrfEndpointUsesPublicRateLimitAndDoesNotConsumeAuthBucket() throws ServletException, IOException {
        String ip = "192.0.2.30";

        // Auth limit is 3, Public limit is 5.
        // Send 3 CSRF token requests; they should NOT exhaust the AUTH bucket
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/auth/csrf");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // Now client should still be able to make 3 login requests in the AUTH bucket
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr(ip);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 4th login request is blocked by auth limit
        MockHttpServletRequest req4 = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        req4.setRemoteAddr(ip);
        MockHttpServletResponse res4 = new MockHttpServletResponse();
        filter.doFilter(req4, res4, chain);
        assertThat(res4.getStatus()).isEqualTo(429);
    }
}
