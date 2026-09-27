"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { currentUser, eventRegistrationExportUrl, eventRegistrations, registerForEvent, type EventRegistration } from "@/lib/api";
import type { EventItem } from "@/types";

export default function EventRegistrationPanel({ event, canManageRegistrations }: { event: EventItem; canManageRegistrations: boolean }) {
  const [message, setMessage] = useState("");
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    currentUser()
      .then(() => {
        if (alive) setAuthenticated(true);
      })
      .catch(() => {
        if (alive) setAuthenticated(false);
      })
      .finally(() => {
        if (alive) setAuthChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const closed = !event.registrationEnabled || (event.registrationDeadline != null && new Date(event.registrationDeadline) <= new Date());
  const reason = !event.registrationEnabled
    ? "Registration is closed"
    : event.registrationDeadline && new Date(event.registrationDeadline) <= new Date()
    ? "Registration deadline has passed"
    : "";

  async function register() {
    if (!authenticated) return;
    setLoading(true);
    try {
      await registerForEvent(event.id);
      setIsRegistered(true);
      setMessage("You’re registered for this event.");
    } catch (e) {
      const err = e instanceof Error ? e.message : "Unable to register.";
      if (err.toLowerCase().includes("already registered")) {
        setIsRegistered(true);
      }
      setMessage(err);
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
    }
  }

  const buttonText = loading
    ? "Registering…"
    : isRegistered
    ? "Already registered"
    : "Register";

  const buttonDisabled = closed || loading || isRegistered;

  return (
    <section className="mt-4 border-t border-border pt-4" aria-label="Event registration" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2 print-hide">
        {!authChecked ? (
          <span className="inline-flex items-center rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-bold text-muted">
            Checking sign-in…
          </span>
        ) : !authenticated ? (
          <Link
            href="/auth/login"
            className="inline-flex items-center rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Sign in to register
          </Link>
        ) : closed ? (
          <span
            className="inline-flex items-center rounded-full border border-border bg-surface-2 px-3 py-2 text-xs font-bold text-muted"
            aria-label={reason}
          >
            {reason}
          </span>
        ) : (
          <button
            disabled={buttonDisabled}
            onClick={() => void register()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Register for ${event.title}`}
          >
            {buttonText}
          </button>
        )}
        {canManageRegistrations && (
          <>
            <button
              onClick={() => void loadRegistrations()}
              className="rounded-lg border border-brand/40 px-3 py-2 text-sm font-bold text-brand-light hover:bg-brand-50" aria-label={`View registrations for ${event.title}`}
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
      {message && <p className="mt-2 text-xs text-muted print-hide">{message}</p>}
      {registrations && (
        <div className="mt-3 print-area">
          <div className="mb-2 flex items-center justify-between print-hide">
            <span className="text-xs font-bold text-muted">
              {registrations.length} registered attendee{registrations.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => window.print()}
              className="text-xs font-bold text-brand-light hover:underline"
            >
              Print registrations
            </button>
          </div>
          <div className="overflow-auto print:overflow-visible">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="p-2">Student</th>
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
                      <td className="p-2">
                        <strong className="text-ink">{r.studentName || r.studentEmail}</strong>
                        <br />
                        <span className="text-muted text-[10px]">{r.studentEmail}</span>
                      </td>
                      <td className="p-2">{r.department || "—"}</td>
                      <td className="p-2">{r.year ? `Year ${r.year}` : "—"}</td>
                      <td className="p-2">{r.section || "—"}</td>
                      <td className="p-2">{new Date(r.registeredAt).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted">
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
