"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Filter,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  User,
  Users,
} from "lucide-react";
import {
  apiRequest,
  type CommunicationRecord,
  type PageResult,
  type RequirementRecord,
} from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const types = [
  "CALL",
  "EMAIL",
  "MEETING",
  "WHATSAPP_MESSAGE",
  "VIDEO_MEETING",
  "OTHER",
] as const;

const typeLabels: Record<string, string> = {
  CALL: "Phone Call",
  EMAIL: "Email",
  MEETING: "In-Person Meeting",
  WHATSAPP_MESSAGE: "WhatsApp Message",
  VIDEO_MEETING: "Video Conference",
  OTHER: "Other Communication",
};

export function CommunicationsPanel({
  clientId,
  requirements,
}: {
  clientId: string;
  requirements: RequirementRecord[];
}) {
  const [records, setRecords] = useState<CommunicationRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form inputs
  const [type, setType] = useState<(typeof types)[number]>("MEETING");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [participants, setParticipants] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [requirementId, setRequirementId] = useState("");

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          page: String(nextPage),
          limit: "10",
        });
        if (filterType) query.set("type", filterType);
        if (from) query.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
        if (to) query.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());

        const result = await apiRequest<PageResult<CommunicationRecord>>(
          `/clients/${clientId}/communications?${query}`
        );
        setRecords(result.items);
        setTotal(result.pagination.total);
        setPages(result.pagination.pages);
        setPage(nextPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load communications");
      } finally {
        setLoading(false);
      }
    },
    [clientId, filterType, from, to]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/clients/${clientId}/communications`, {
        method: "POST",
        body: JSON.stringify({
          type,
          subject,
          summary,
          participants: participants
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          occurredAt: new Date(occurredAt).toISOString(),
          followUpNotes: followUpNotes || undefined,
          requirementId: requirementId || undefined,
        }),
      });
      setModalOpen(false);
      setSubject("");
      setSummary("");
      setParticipants("");
      setOccurredAt("");
      setFollowUpNotes("");
      setRequirementId("");
      setSuccess("Communication log recorded successfully.");
      await load(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save communication");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="communications" className="glass-panel rounded-2xl overflow-hidden shadow-xs">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5 bg-white/50">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Communication History
          </h2>
          <p className="mt-0.5 text-xs text-[var(--secondary)]">
            {total} manually logged conversation{total === 1 ? "" : "s"} with stakeholder context
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <MessageSquarePlus size={15} /> Log Communication
        </Button>
      </div>

      {/* Notifications */}
      {success && (
        <div
          role="status"
          className="m-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 animate-fade-in"
        >
          {success}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-[var(--error)] animate-fade-in"
        >
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-slate-50/60 p-3.5 text-xs">
        <label className="flex items-center gap-2 text-[var(--secondary)] font-medium">
          <Filter size={13} className="text-slate-400" />
          Type:
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
          >
            <option value="">All Communication Types</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {typeLabels[item] || item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[var(--secondary)] font-medium">
          From:
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
          />
        </label>

        <label className="flex items-center gap-2 text-[var(--secondary)] font-medium">
          To:
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
          />
        </label>

        {(filterType || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType("");
              setFrom("");
              setTo("");
            }}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Communications Feed */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--secondary)]">
          <RefreshCw size={20} className="mx-auto text-blue-500 animate-spin mb-2" />
          Loading communication records…
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--secondary)]">
          <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-[var(--foreground)]">No communications match the filters</p>
          <p className="mt-1">Log a meeting, call, or email to keep stakeholders aligned.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {records.map((record) => (
            <article key={record.id} className="p-5 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Badge variant="primary">
                    {typeLabels[record.type] || record.type.replace("_", " ")}
                  </Badge>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {record.subject}
                  </h3>
                </div>
                <time className="text-[11px] text-[var(--secondary)] font-medium">
                  {new Date(record.occurredAt).toLocaleString()}
                </time>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]/80 whitespace-pre-wrap">
                {record.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--secondary)]">
                <span>Logged by <strong className="text-[var(--foreground)]">{record.createdBy.name}</strong></span>
                {record.participants.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} className="text-slate-400" />
                      Participants: {record.participants.join(", ")}
                    </span>
                  </>
                )}
                {record.requirement && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-[var(--primary)]">
                      Requirement: {record.requirement.title}
                    </span>
                  </>
                )}
              </div>

              {record.followUpNotes && (
                <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900">
                  <strong className="font-semibold">Next Steps & Follow-up:</strong>{" "}
                  {record.followUpNotes}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--secondary)] bg-white/40">
        <span>
          Page <strong className="text-[var(--foreground)]">{page}</strong> of{" "}
          <strong className="text-[var(--foreground)]">{Math.max(1, pages)}</strong>
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Log Communication Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log a Client Communication"
        description="Records are scoped to this client workspace; no external calendar or email sync is connected."
        maxWidth="xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[var(--foreground)]">
              Communication Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as (typeof types)[number])}
                className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              >
                {types.map((item) => (
                  <option key={item} value={item}>
                    {typeLabels[item] || item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-[var(--foreground)]">
              Occurred At <span className="text-[var(--error)]">*</span>
              <input
                required
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Subject <span className="text-[var(--error)]">*</span>
            <input
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scope alignment and architecture review"
              className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Summary / Discussion Notes <span className="text-[var(--error)]">*</span>
            <textarea
              required
              maxLength={10000}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Key decisions, client feedback, or consensus reached…"
              className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[var(--foreground)]">
              Participants{" "}
              <span className="font-normal text-[var(--secondary)]">(comma-separated)</span>
              <input
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="Jane Doe, Mark Smith"
                className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              />
            </label>

            <label className="text-xs font-semibold text-[var(--foreground)]">
              Related Requirement
              <select
                value={requirementId}
                onChange={(e) => setRequirementId(e.target.value)}
                className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              >
                <option value="">Client-level interaction</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Follow-Up Notes / Next Steps
            <textarea
              maxLength={10000}
              rows={2}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="Action items assigned, next meeting date…"
              className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Saving…" : "Save Communication"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default CommunicationsPanel;
