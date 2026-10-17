"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentUser,
  eventRegistrationExportUrl,
  eventRegistrations,
  myEventRegistrations,
  registerForEvent,
  type CurrentUser,
  type EventRegistration,
} from "@/lib/api";
import type { EventItem } from "@/types";

import { canManageEventRegistrations, getEventLoginRedirectUrl } from "./eventRegistration";

export default function EventRegistrationPanel({
  event,
  canManageRegistrations = false,
  onRegistered,
}: {
  event: EventItem;
  canManageRegistrations?: boolean;
  onRegistered?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let alive = true;
    currentUser()
      .then((u) => {
        if (!alive) return;
        setUser(u);
        setAuthenticated(Boolean(u));
        setAuthChecked(true);
        if (u) {
          void myEventRegistrations()
            .then((regs) => {
              if (alive && regs.content.some((registration) => registration.id === event.id)) {
                setIsRegistered(true);
              }
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (alive) {
          setUser(null);
          setAuthenticated(false);
          setAuthChecked(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [event.id]);

  const closed = !event.registrationEnabled || (event.registrationDeadline != null && new Date(event.registrationDeadline) <= new Date());
  const reason = !event.registrationEnabled
    ? "Registration is closed"
    : event.registrationDeadline && new Date(event.registrationDeadline) <= new Date()
    ? "Registration deadline has passed"
    : "";

  const canManage = canManageRegistrations || canManageEventRegistrations(user, event);

  async function handleRegisterClick() {
    if (!authenticated) {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "/events";
      router.push(getEventLoginRedirectUrl(event.id, pathname));
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await registerForEvent(event.id);
      setIsRegistered(true);
      setMessage("You’re registered for this event.");
      setMessageType("success");
      await onRegistered?.();
    } catch (e) {
      const err = e instanceof Error ? e.message : "Unable to register.";
      if (err.toLowerCase().includes("already registered")) {
        setIsRegistered(true);
        setMessage("Already registered: You are already registered for this event.");
        setMessageType("info");
      } else {
        setMessage(err);
        setMessageType("error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadRegistrations() {
    try {
      const list = await eventRegistrations(event.id);
      setRegistrations(list);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Registrations are unavailable.");
      setMessageType("error");
    }
  }

  const buttonText = isRegistered
    ? "Already registered"
    : loading
    ? "Registering…"
    : "Register";

  const buttonDisabled = closed || loading || isRegistered;

  return (
    <section className="mt-4 border-t border-border pt-4" aria-label="Event registration" onClick={(e) => e.stopPropagation()}>
      {!authChecked ? (
        <span className="inline-flex items-center rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-bold text-muted print-hide">
          Checking sign-in…
        </span>
      ) : closed ? (
        <div className="flex flex-wrap gap-2 print-hide">
          <span
            className="inline-flex items-center rounded-full border border-border bg-surface-2 px-3 py-2 text-xs font-bold text-muted"
            aria-label={reason}
          >
            {reason}
          </span>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => void loadRegistrations()}
                className="rounded-lg border border-brand/40 px-3 py-2 text-sm font-bold text-brand-light hover:bg-brand-50"
                aria-label={`View registrations for ${event.title}`}
              >
                View registrations
              </button>
              <a
                href={eventRegistrationExportUrl(event.id)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-surface-2"
              >
                Export CSV
              </a>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 print-hide">
          <button
            type="button"
            disabled={buttonDisabled}
            onClick={() => void handleRegisterClick()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${buttonText} for ${event.title}`}
          >
            {buttonText}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => void loadRegistrations()}
                className="rounded-lg border border-brand/40 px-3 py-2 text-sm font-bold text-brand-light hover:bg-brand-50"
                aria-label={`View registrations for ${event.title}`}
              >
                View registrations
              </button>
              <a
                href={eventRegistrationExportUrl(event.id)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-surface-2"
              >
                Export CSV
              </a>
            </>
          )}
        </div>
      )}

      {message && (
        <p
          className={`mt-2 text-xs print-hide ${
            messageType === "success"
              ? "text-brand-light font-semibold"
              : messageType === "error"
              ? "text-danger font-semibold"
              : "text-muted"
          }`}
        >
          {message}
        </p>
      )}

      {registrations && (
        <div className="mt-4 print-area rounded-xl border border-border bg-surface-2/30 p-3">
          {/* Header visible ONLY during printing */}
          <div className="hidden print:block mb-4 pb-2 border-b border-black text-black">
            <h1 className="text-xl font-bold">{event.title}</h1>
            <p className="text-xs text-gray-700 mt-1">
              {event.location ? `Location: ${event.location} • ` : ""}
              {event.startAt ? `Date: ${new Date(event.startAt).toLocaleString()}` : ""}
            </p>
            <p className="text-xs font-semibold text-gray-800 mt-1">
              Registered Attendees ({registrations.length})
            </p>
          </div>

          <div className="mb-2 flex items-center justify-between print-hide">
            <span className="text-xs font-bold text-muted">
              {registrations.length} registered attendee{registrations.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-brand-light hover:bg-surface-2 hover:underline"
            >
              Print registration list
            </button>
          </div>

          <div className="overflow-auto print:overflow-visible">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="p-2">Attendee</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Department</th>
                  <th className="p-2">Year</th>
                  <th className="p-2">Section</th>
                  <th className="p-2">Registered At</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length > 0 ? (
                  registrations.map((r) => (
                    <tr key={r.id} className="border-b border-border">
                      <td className="p-2 font-bold text-ink">
                        {r.studentName || r.studentEmail}
                      </td>
                      <td className="p-2 text-muted">{r.studentEmail}</td>
                      <td className="p-2">{r.department || "—"}</td>
                      <td className="p-2">{r.year ? `Year ${r.year}` : "—"}</td>
                      <td className="p-2">{r.section || "—"}</td>
                      <td className="p-2">{new Date(r.registeredAt).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted">
                      No registrations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
