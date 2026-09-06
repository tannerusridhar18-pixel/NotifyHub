package com.notifyhub.auth;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<Invitation, java.util.UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitation i join fetch i.user where i.tokenHash = :tokenHash")
    Optional<Invitation> findForUpdateByTokenHash(@Param("tokenHash") String tokenHash);
}
