package com.notifyhub.users;

import java.time.Instant;
import java.util.UUID;

public record InvitationCreatedEvent(UUID invitationId, String email, String role, String rawToken, Instant expiresAt) { }
