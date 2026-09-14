package com.notifyhub.announcement;

import com.notifyhub.auth.Role;
import com.notifyhub.targeting.TargetType;

public record AnnouncementPublishedEvent(
        Long announcementId,
        String title,
        String content,
        boolean urgent,
        TargetType targetType,
        Long departmentId,
        Long branchId,
        Long sectionId,
        Long hostelId,
        Long userId,
        Role role) {
}
