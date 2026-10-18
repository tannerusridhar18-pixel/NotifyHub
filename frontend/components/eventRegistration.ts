import type { CurrentUser } from "@/lib/api";
import type { EventItem } from "@/types";

export function canManageEventRegistrations(
  user: CurrentUser | null | undefined,
  event: EventItem
): boolean {
  if (!user) return false;
  const role = user.role;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  return (
    role === "DEPARTMENT_ADMIN" &&
    user.departmentId != null &&
    user.departmentId === event.departmentId
  );
}

export function getEventLoginRedirectUrl(eventId: number, currentPath = "/events"): string {
  const cleanPath = currentPath.split("?")[0] || "/events";
  const target = `${cleanPath}?event=${eventId}#event-${eventId}`;
  return `/auth/login?redirect=${encodeURIComponent(target)}`;
}

export function getRegistrationState({
  event,
  authenticated,
  isRegistered,
  loading,
}: {
  event: EventItem;
  authenticated: boolean;
  isRegistered: boolean;
  loading: boolean;
}): {
  closed: boolean;
  reason: string;
  buttonText: string;
  buttonDisabled: boolean;
  needsLogin: boolean;
} {
  const isPastDeadline =
    event.registrationDeadline != null && new Date(event.registrationDeadline) <= new Date();
  const closed = !event.registrationEnabled || isPastDeadline;
  const reason = !event.registrationEnabled
    ? "Registration is closed"
    : isPastDeadline
    ? "Registration deadline has passed"
    : "";

  const needsLogin = !authenticated;
  const buttonText = isRegistered
    ? "Already registered"
    : loading
    ? "Registering…"
    : "Register";
  const buttonDisabled = closed || loading || isRegistered;

  return {
    closed,
    reason,
    buttonText,
    buttonDisabled,
    needsLogin,
  };
}
