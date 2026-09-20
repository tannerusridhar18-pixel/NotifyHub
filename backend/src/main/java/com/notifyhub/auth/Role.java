package com.notifyhub.auth;

public enum Role {
    SUPER_ADMIN,
    ADMIN,
    PRINCIPAL,
    DEAN,
    HOD,
    FACULTY,
    STUDENT,
    CUSTOM;

    public static Role fromName(String name) {
        if (name == null) return STUDENT;
        try {
            return Role.valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            return CUSTOM;
        }
    }
}
