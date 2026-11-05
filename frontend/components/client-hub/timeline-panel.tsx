"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileCheck,
  FilePlus,
  FileText,
  Link2,
  MessageCircle,
  Pencil,
  RefreshCw,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { apiRequest, type ActivityRecord, type PageResult } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

const icons: Record<string, typeof Activity> = {
  CLIENT_CREATED: UserRound,
  CLIENT_UPDATED: Pencil,
  REQUIREMENT_CREATED: FilePlus,
  REQUIREMENT_UPDATED: Pencil,
  REQUIREMENT_CONFIRMED: CheckCircle2,
  COMMUNICATION_RECORDED: MessageCircle,
  FILE_ADDED: FileText,
  REFERENCE_ADDED: Link2,
};

const iconColors: Record<string, string> = {
  CLIENT_CREATED: "bg-blue-100 text-blue-700 ring-blue-50",
  CLIENT_UPDATED: "bg-slate-100 text-slate-700 ring-slate-50",
  REQUIREMENT_CREATED: "bg-indigo-100 text-indigo-700 ring-indigo-50",
  REQUIREMENT_UPDATED: "bg-amber-100 text-amber-700 ring-amber-50",
  REQUIREMENT_CONFIRMED: "bg-emerald-100 text-emerald-700 ring-emerald-50",
  COMMUNICATION_RECORDED: "bg-sky-100 text-sky-700 ring-sky-50",
  FILE_ADDED: "bg-purple-100 text-purple-700 ring-purple-50",
  REFERENCE_ADDED: "bg-cyan-100 text-cyan-700 ring-cyan-50",
};

export function TimelinePanel({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<ActivityRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError("");
      try {
        const result = await apiRequest<PageResult<ActivityRecord>>(
          `/clients/${clientId}/timeline?page=${nextPage}&limit=20`
        );
        setEvents(result.items);
        setPage(nextPage);
        setPages(result.pagination.pages);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load activity timeline");
      } finally {
        setLoading(false);
      }
    },
    [clientId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <section id="activity" className="glass-panel rounded-2xl overflow-hidden shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-5 bg-white/50">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Chronological Activity Timeline
          </h2>
          <p className="mt-0.5 text-xs text-[var(--secondary)]">
            Safe audit log projection tracking client milestones, revisions and team events
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void load(page)}
          disabled={loading}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-[var(--error)] animate-fade-in"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--secondary)]">
          <RefreshCw size={20} className="mx-auto text-blue-500 animate-spin mb-2" />
          Loading activity timeline…
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--secondary)]">
          <Activity size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-[var(--foreground)]">No activity recorded yet</p>
          <p className="mt-1">Events will appear here as client records and requirements are modified.</p>
        </div>
      ) : (
        <div className="p-6">
          <ol className="relative border-l border-slate-200 ml-4 space-y-6">
            {events.map((event) => {
              const Icon = icons[event.eventType] || Activity;
              const color =
                iconColors[event.eventType] || "bg-slate-100 text-slate-700 ring-slate-50";

              return (
                <li key={event.id} className="relative pl-6">
                  {/* Event Node Icon */}
                  <span
                    className={`absolute -left-3.5 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 shadow-xs ${color}`}
                  >
                    <Icon size={13} aria-hidden="true" />
                  </span>

                  {/* Content Card */}
                  <div className="rounded-xl border border-[var(--border)] bg-white/80 p-3.5 shadow-xs transition-colors hover:bg-white">
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      {event.description}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--secondary)]">
                      <time className="font-medium text-slate-500">
                        {new Date(event.occurredAt).toLocaleString()}
                      </time>
                      {event.actor && (
                        <span>
                          by <strong className="text-[var(--foreground)]">{event.actor.name}</strong>
                        </span>
                      )}
                      {event.relatedRequirementTitle && (
                        <Link
                          href={`/clients/${clientId}/requirements/${event.requirementId}`}
                          className="font-medium text-[var(--primary)] hover:underline"
                        >
                          {event.relatedRequirementTitle}
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--secondary)] bg-white/40">
          <span>
            Page <strong className="text-[var(--foreground)]">{page}</strong> of{" "}
            <strong className="text-[var(--foreground)]">{pages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => void load(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => void load(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default TimelinePanel;
