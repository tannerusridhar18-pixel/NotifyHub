package com.notifyhub.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ResendEmailTransportTest {

    private HttpClient mockHttpClient;
    private HttpResponse<String> mockResponse;
    private ObjectMapper objectMapper;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        mockHttpClient = mock(HttpClient.class);
        mockResponse = mock(HttpResponse.class);
        objectMapper = new ObjectMapper();
    }

    @Test
    @SuppressWarnings("unchecked")
    void sendsEmailSuccessfullyViaResendHttpsApi() throws Exception {
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn("{\"id\":\"msg_mock_12345\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        ResendEmailTransport transport = new ResendEmailTransport(
                "re_valid_test_key_123",
                "https://api.resend.com/emails",
                mockHttpClient,
                objectMapper
        );

        transport.send(
                "onboarding@resend.dev",
                "student@campus.edu",
                "Your NotifyHub student invitation",
                "Welcome to NotifyHub!"
        );

        org.mockito.ArgumentCaptor<HttpRequest> captor = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(mockHttpClient).send(captor.capture(), any());

        HttpRequest request = captor.getValue();
        assertThat(request.uri().toString()).isEqualTo("https://api.resend.com/emails");
        assertThat(request.method()).isEqualTo("POST");
        assertThat(request.headers().firstValue("Authorization")).contains("Bearer re_valid_test_key_123");
        assertThat(request.headers().firstValue("Content-Type")).contains("application/json");
        assertThat(transport.getProviderName()).contains("Resend");
    }

    @Test
    @SuppressWarnings("unchecked")
    void handlesResendApiHttpErrorSafelyWithoutExposingApiKey() throws Exception {
        when(mockResponse.statusCode()).thenReturn(401);
        when(mockResponse.body()).thenReturn("{\"statusCode\":401,\"message\":\"The provided key re_secret_key_123 is invalid\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        ResendEmailTransport transport = new ResendEmailTransport(
                "re_secret_key_123",
                "https://api.resend.com/emails",
                mockHttpClient,
                objectMapper
        );

        assertThatThrownBy(() -> transport.send(
                "onboarding@resend.dev",
                "student@campus.edu",
                "Subject",
                "Body"
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("HTTP 401")
                .hasMessageNotContaining("re_secret_key_123")
                .hasMessageContaining("re_***");
    }

    @Test
    @SuppressWarnings("unchecked")
    void handlesResendConnectionTimeoutSafely() throws Exception {
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpConnectTimeoutException("Connect timed out to api.resend.com:443"));

        ResendEmailTransport transport = new ResendEmailTransport(
                "re_valid_key",
                "https://api.resend.com/emails",
                mockHttpClient,
                objectMapper
        );

        assertThatThrownBy(() -> transport.send(
                "onboarding@resend.dev",
                "student@campus.edu",
                "Subject",
                "Body"
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Resend API request failed")
                .hasMessageContaining("Connect timed out");
    }

    @Test
    void failsEarlyWhenApiKeyIsMissing() {
        ResendEmailTransport transport = new ResendEmailTransport(
                "",
                "https://api.resend.com/emails",
                mockHttpClient,
                objectMapper
        );

        assertThatThrownBy(() -> transport.send(
                "onboarding@resend.dev",
                "student@campus.edu",
                "Subject",
                "Body"
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Resend API key is not configured");
    }

    @Test
    void validatesConnectionDoesNotThrowOnMissingOrInvalidKey() {
        ResendEmailTransport emptyKeyTransport = new ResendEmailTransport("");
        emptyKeyTransport.validateConnection();

        ResendEmailTransport invalidPrefixTransport = new ResendEmailTransport("not_starting_with_re");
        invalidPrefixTransport.validateConnection();

        ResendEmailTransport validTransport = new ResendEmailTransport("re_valid_key_123");
        validTransport.validateConnection();
    }
}
