"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  departmentManagedEvents,
  eventRegistrationExportUrl,
  eventRegistrations,
  managedEvents,
  type EventRegistration,
} from "@/lib/api";
import type { EventItem } from "@/types";
import { Empty, ErrorState, Loading } from "@/components/States";
import { SoftBadge, StatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface EventRegistrationManagerProps {
  departmentScoped?: boolean;
  departmentName?: string | null;
  events?: EventItem[];
  initialEventId?: number | null;
  onEventSelect?: (eventId: number) => void;
}

export default function EventRegistrationManager({
  departmentScoped = false,
  departmentName,
  events: propEvents,
  initialEventId = null,
  onEventSelect,
}: EventRegistrationManagerProps) {
  const [internalEvents, setInternalEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [selectedEventId, setSelectedEventId] = useState<number | null>(initialEventId);
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine which event list to use
  const events = useMemo(() => {
    return propEvents && propEvents.length > 0 ? propEvents : internalEvents;
  }, [propEvents, internalEvents]);

  // Fetch events if not provided via props
  const fetchEvents = useCallback(async () => {
    if (propEvents && propEvents.length > 0) return;
    setEventsLoading(true);
    setEventsError("");
    try {
      const res = departmentScoped
        ? await departmentManagedEvents(0, 100)
        : await managedEvents(0, 100);
      setInternalEvents(res.content || []);
    } catch (e) {
      setEventsError(
        e instanceof Error
          ? e.message
          : departmentScoped
          ? "Unable to load department events."
          : "Unable to load events."
      );
    } finally {
      setEventsLoading(false);
    }
  }, [departmentScoped, propEvents]);

  // Derive currently active event ID (explicit selection or fallback to first eligible event)
  const activeEventId = useMemo(() => {
    if (selectedEventId !== null) return selectedEventId;
    if (events.length === 0) return null;
    const candidate = events.find((e) => e.registrationEnabled) || events[0];
    return candidate.id;
  }, [events, selectedEventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async event list load on mount
    void fetchEvents();
  }, [fetchEvents]);

  // Fetch attendee registrations for selected event
  const loadRegistrations = useCallback(async (eventId: number) => {
    setRegistrationsLoading(true);
    setRegistrationsError("");
    setIsForbidden(false);
    try {
      const list = await eventRegistrations(eventId);
      setRegistrations(list);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Unable to load registrations.";
      setRegistrationsError(err);
      if (
        err.toLowerCase().includes("forbidden") ||
        err.toLowerCase().includes("department admin") ||
        err.toLowerCase().includes("access denied") ||
        err.toLowerCase().includes("cannot view")
      ) {
        setIsForbidden(true);
      }
    } finally {
      setRegistrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeEventId !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async registration fetch on active event change
      void loadRegistrations(activeEventId);
    } else {
      setRegistrations(null);
    }
  }, [activeEventId, loadRegistrations]);

  function handleSelectEvent(id: number) {
    setSelectedEventId(id);
    onEventSelect?.(id);
  }

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === activeEventId) || null,
    [events, activeEventId]
  );

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  return (
    <section
      className="space-y-6"
      aria-label="Manage Event Registrations Section"
    >
      {/* Section Header */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-surface-2/60 p-5 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between print-hide">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-light">
              🎟️
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Manage Event Registrations
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            {departmentScoped
              ? `Review and print attendee rosters for events in ${
                  departmentName ? `${departmentName} Department` : "your department"
                }.`
              : "Review and print attendee rosters across campus events."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {departmentScoped && (
            <SoftBadge>
              {departmentName ? `${departmentName} Dept` : "Department Scoped"}
            </SoftBadge>
          )}
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {events.length} event{events.length === 1 ? "" : "s"} available
          </span>
        </div>
      </div>

      {eventsLoading && !events.length && (
        <Loading label="Loading events with registration rosters…" />
      )}

      {eventsError && !events.length && (
        <ErrorState
          message={eventsError}
          onRetry={() => void fetchEvents()}
        />
      )}

      {!eventsLoading && events.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center print-hide">
          <Empty label="events" />
          <p className="mt-2 text-xs text-muted">
            {departmentScoped
              ? "No events found for your department yet. Create or target an event to your department to view registrations."
              : "No events found. Create and publish an event with registration enabled to track attendee rosters."}
          </p>
        </div>
      )}

      {events.length > 0 && (
        <>
          {/* Event Selector Control */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft print-hide">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <label
                  htmlFor="event-registration-select"
                  className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
                >
                  Select Event to Inspect
                </label>
                <select
                  id="event-registration-select"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs font-medium text-ink focus:border-brand focus:outline-none"
                  value={activeEventId ?? ""}
                  onChange={(e) => handleSelectEvent(Number(e.target.value))}
                >
                  <option value="" disabled>
                    -- Choose an event --
                  </option>
                  {filteredEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} {ev.location ? `(${ev.location})` : ""} —{" "}
                      {new Date(ev.startAt).toLocaleDateString()}{" "}
                      {ev.registrationEnabled ? "[Registration Open]" : "[Closed]"}
                    </option>
                  ))}
                </select>
              </div>

              {events.length > 5 && (
                <div className="w-full md:w-64">
                  <label
                    htmlFor="event-search-filter"
                    className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
                  >
                    Filter Events
                  </label>
                  <input
                    id="event-search-filter"
                    type="search"
                    placeholder="Search by title or venue…"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Quick-selection Chips */}
            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border">
              <span className="text-[11px] font-semibold text-muted self-center mr-1">
                Quick pick:
              </span>
              {filteredEvents.slice(0, 8).map((ev) => {
                const isSelected = ev.id === activeEventId;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleSelectEvent(ev.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-brand text-black shadow-sm font-bold"
                        : "bg-surface-2 text-muted hover:bg-surface-2/80 hover:text-white"
                    }`}
                  >
                    {ev.title}
                    {ev.registrationEnabled ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Event Roster Card */}
          {selectedEvent ? (
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              {/* Event Details Banner */}
              <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between print-hide">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedEvent.status} />
                    {selectedEvent.registrationEnabled ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        Registration Open
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-muted">
                        Registration Closed
                      </span>
                    )}
                    <SoftBadge>{selectedEvent.targetType || "GLOBAL"}</SoftBadge>
                  </div>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-ink">
                    {selectedEvent.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted">
                    {selectedEvent.location && (
                      <span className="flex items-center gap-1">
                        📍 {selectedEvent.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      📅 {new Date(selectedEvent.startAt).toLocaleString()} –{" "}
                      {new Date(selectedEvent.endAt).toLocaleTimeString()}
                    </span>
                    {selectedEvent.registrationDeadline && (
                      <span className="flex items-center gap-1 text-amber-400">
                        ⏰ Deadline:{" "}
                        {new Date(selectedEvent.registrationDeadline).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!registrations || registrations.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
                  >
                    <span>🖨️</span> Print Registration List
                  </Button>
                  <a
                    href={eventRegistrationExportUrl(selectedEvent.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-xs font-bold text-muted transition-all hover:bg-surface-2/80 hover:text-white"
                  >
                    <span>📥</span> Export CSV
                  </a>
                  <button
                    type="button"
                    onClick={() => void loadRegistrations(selectedEvent.id)}
                    disabled={registrationsLoading}
                    className="rounded-xl border border-border bg-surface-2 p-2 text-xs text-muted hover:text-white"
                    title="Refresh registrations"
                    aria-label="Refresh attendee list"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* Registrations Loading State */}
              {registrationsLoading && (
                <div className="py-12 print-hide">
                  <Loading label={`Loading attendee roster for "${selectedEvent.title}"…`} />
                </div>
              )}

              {/* Forbidden / Department Access Error State */}
              {!registrationsLoading && isForbidden && (
                <div
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300 print-hide"
                  role="alert"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⛔</span>
                    <div>
                      <h4 className="text-sm font-bold">Access Denied</h4>
                      <p className="mt-1 text-xs leading-relaxed text-rose-200">
                        {registrationsError ||
                          "Department Admins can only view registrations for events within their authorized department."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Error State */}
              {!registrationsLoading && registrationsError && !isForbidden && (
                <div className="print-hide">
                  <ErrorState
                    message={registrationsError}
                    onRetry={() => void loadRegistrations(selectedEvent.id)}
                  />
                </div>
              )}

              {/* Registrations Roster Table & Print Area */}
              {!registrationsLoading && !registrationsError && registrations && (
                <div className="print-area">
                  {/* Clean Printable Header (Only rendered when printing) */}
                  <div className="hidden print:block mb-4 pb-3 border-b-2 border-black text-black">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                          VNotify Campus Portal — Event Attendee Roster
                        </span>
                        <h1 className="text-2xl font-bold mt-1">{selectedEvent.title}</h1>
                        <p className="text-xs text-gray-700 mt-1">
                          {selectedEvent.location ? `Venue: ${selectedEvent.location} • ` : ""}
                          Date: {new Date(selectedEvent.startAt).toLocaleString()}
                        </p>
                        {departmentName && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            Authorized Department: {departmentName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-gray-900">
                          Total Registered: {registrations.length}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Generated: {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="mb-3 flex items-center justify-between print-hide">
                    <span className="text-xs font-bold text-muted">
                      {registrations.length} registered student
                      {registrations.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-[11px] text-muted">
                      Official attendee roster verified from database
                    </span>
                  </div>

                  {registrations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-surface-2/40 py-12 text-center">
                      <p className="text-sm font-semibold text-muted">
                        No students have registered for this event yet.
                      </p>
                      <p className="mt-1 text-xs text-muted/70">
                        {selectedEvent.registrationEnabled
                          ? "Registrations are currently open for eligible students."
                          : "Registration is not enabled for this event."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto print:overflow-visible rounded-xl border border-border">
                      <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-border bg-surface-2/80 text-muted">
                            <th className="p-3 w-10 text-center">#</th>
                            <th className="p-3">Student Name</th>
                            <th className="p-3">Student ID</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Department</th>
                            <th className="p-3">Year / Section</th>
                            <th className="p-3">Registered At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((r, idx) => (
                            <tr
                              key={r.id}
                              className="border-b border-border/60 hover:bg-surface-2/30 last:border-b-0"
                            >
                              <td className="p-3 text-center text-muted font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="p-3 font-semibold text-ink">
                                {r.studentName || "—"}
                              </td>
                              <td className="p-3 font-mono text-[11px] text-brand-light">
                                {r.studentId || "—"}
                              </td>
                              <td className="p-3 text-muted">{r.studentEmail}</td>
                              <td className="p-3">{r.department || "—"}</td>
                              <td className="p-3">
                                {r.year ? `Year ${r.year}` : "—"}
                                {r.section ? ` · Sec ${r.section}` : ""}
                              </td>
                              <td className="p-3 text-muted">
                                {new Date(r.registeredAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted">
              Select an event from the list above to view registered students.
            </div>
          )}
        </>
      )}
    </section>
  );
}
