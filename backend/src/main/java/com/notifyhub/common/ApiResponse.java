package com.notifyhub.common;

public record ApiResponse<T>(boolean success, T data, String message) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null); }
    public static <T> ApiResponse<T> created(T data) { return new ApiResponse<>(true, data, null); }
    public static ApiResponse<Void> message(String message) { return new ApiResponse<>(true, null, message); }
}
