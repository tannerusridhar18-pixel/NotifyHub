package com.notifyhub.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class AuthCookieService {
    private final boolean secure;
    private final String sameSite;
    private final long accessMaxAge;
    private final long refreshMaxAge;

    public AuthCookieService(@Value("${notifyhub.auth.cookie-secure:false}") boolean secure,
                             @Value("${notifyhub.auth.cookie-same-site:Lax}") String sameSite,
                             @Value("${notifyhub.jwt-access-minutes:15}") long accessMinutes,
                             @Value("${notifyhub.jwt-refresh-days:7}") long refreshDays) {
        this.secure = secure; this.sameSite = sameSite; this.accessMaxAge = accessMinutes * 60; this.refreshMaxAge = refreshDays * 86400;
    }
    public void setSessionCookies(HttpServletResponse response, AuthService.IssuedSession session) {
        response.addHeader("Set-Cookie", cookie("NH_ACCESS", session.accessToken(), accessMaxAge, "/").toString());
        response.addHeader("Set-Cookie", cookie("NH_REFRESH", session.rawRefreshToken(), refreshMaxAge, "/api/v1/auth").toString());
    }
    public void clearSessionCookies(HttpServletResponse response) {
        response.addHeader("Set-Cookie", cookie("NH_ACCESS", "", 0, "/").toString());
        response.addHeader("Set-Cookie", cookie("NH_REFRESH", "", 0, "/api/v1/auth").toString());
    }
    private ResponseCookie cookie(String name, String value, long maxAge, String path) {
        return ResponseCookie.from(name, value).httpOnly(true).secure(secure).sameSite(sameSite).path(path).maxAge(maxAge).build();
    }
}
