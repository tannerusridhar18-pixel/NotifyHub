"use client";
import { useCallback, useEffect, useState } from "react";
import { answerScopedQuery, scopedQueries } from "@/lib/api";
import type { CampusQuery } from "@/types";
import { Empty } from "@/components/States";

export default function QueryInbox() {
  const [status, setStatus] = useState<"OPEN" | "ANSWERED" | "CLOSED">("OPEN");
  const [items, setItems] = useState<CampusQuery[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await scopedQueries(status);
      setItems(res.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load queries.");
    }
  }, [status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on status change
    void load();
  }, [load]);

  async function answer(id: number) {
    const response = answers[id]?.trim();
    if (!response) return;
    try {
      await answerScopedQuery(id, response);
      setAnswers((v) => ({ ...v, [id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to answer query.");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Department queries</h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded border border-border bg-surface-2 p-2 text-xs"
        >
          <option value="OPEN">Open</option>
          <option value="ANSWERED">Answered</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
      {error && <p className="mb-3 text-sm text-danger-light">{error}</p>}
      {items.length ? (
        items.map((q) => (
          <article key={q.id} className="mb-3 rounded-xl border border-border p-4">
            <div className="flex justify-between gap-3">
              <strong>{q.subject || "Student question"}</strong>
              <span className="rounded bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-light">{q.status}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{q.question || q.message}</p>
            {q.status === "OPEN" ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((v) => ({ ...v, [q.id]: e.target.value }))}
                  className="min-w-0 flex-1 rounded border border-border bg-surface-2 p-2 text-sm"
                  placeholder="Write an answer…"
                />
                <button onClick={() => void answer(q.id)} className="rounded bg-brand px-3 text-xs font-bold text-white">
                  Answer
                </button>
              </div>
            ) : (
              <p className="mt-3 rounded bg-surface-2 p-2 text-sm">{q.answer || q.adminResponse}</p>
            )}
          </article>
        ))
      ) : (
        <Empty label="queries matching this status" />
      )}
    </section>
  );
}
