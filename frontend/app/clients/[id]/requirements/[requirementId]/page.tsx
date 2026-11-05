"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { apiRequest, type RequirementRecord } from "@/lib/api/client";

type RequirementDetail = RequirementRecord & {
  references: Array<{ id: string; label: string; url: string }>;
};

export default function RequirementDetailPage() {
  const { id, requirementId } = useParams<{ id: string; requirementId: string }>();
  const [data, setData] = useState<RequirementDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiRequest<RequirementDetail>(`/requirements/${requirementId}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load requirement details.");
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function exportConfirmedJson() {
    if (!data) return;
    try {
      const exportData = await apiRequest(`/requirements/${data.id}/export`);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `requirement-${data.id}-v${data.revisions[0]?.version || 1}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    }
  }

  return (
    <AppShell
      pageTitle={data?.title || "Requirement Detail"}
      breadcrumb={[
        { label: "Clients", href: "/clients" },
        { label: "Workspace", href: `/clients/${id}` },
        { label: data?.title || "Requirement" },
      ]}
    >
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/clients/${id}#requirements`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--secondary)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Back to client workspace
        </Link>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-xs sm:text-sm text-[var(--secondary)] animate-pulse">
          Loading requirement details…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-[var(--error)]"
        >
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Glass Card */}
          <section className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                    {data.title || "Untitled Requirement"}
                  </h1>
                  <StatusBadge status={data.status} />
                </div>

                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--foreground)]/80 max-w-3xl">
                  {data.businessObjective || "No business objective defined."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--secondary)]">
                  <span>Prepared by <strong className="text-[var(--foreground)]">{data.preparedBy.name}</strong></span>
                  <span>•</span>
                  <span>Updated {new Date(data.updatedAt).toLocaleString()}</span>
                  {data.confirmedBy && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">
                        Confirmed by {data.confirmedBy.name} on{" "}
                        {data.confirmedAt ? new Date(data.confirmedAt).toLocaleDateString() : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {data.status === "CONFIRMED" && (
                <div className="shrink-0">
                  <Button onClick={exportConfirmedJson}>
                    <Download size={14} /> Export Approved JSON
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Scope and Governance Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Services & Design Preferences */}
            <section className="glass-panel rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Layers size={16} className="text-[var(--primary)]" />
                  Requested Services
                </h2>
                {data.requestedServices.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {data.requestedServices.map((service) => (
                      <Badge key={service} variant="primary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--secondary)]">
                    No specific services requested yet.
                  </p>
                )}
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--primary)]" />
                  Design Preferences
                </h2>
                <p className="mt-2 text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {data.designPreferences || "No design preferences specified."}
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <ExternalLink size={16} className="text-[var(--primary)]" />
                  Reference Links
                </h2>
                {data.references.length ? (
                  <ul className="mt-2.5 space-y-2">
                    {data.references.map((ref) => (
                      <li key={ref.id} className="text-xs">
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline break-all"
                        >
                          <ExternalLink size={12} className="shrink-0" />
                          {ref.label || ref.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[var(--secondary)]">
                    No reference links attached.
                  </p>
                )}
              </div>
            </section>

            {/* Budget, Timeline & Governance */}
            <section className="glass-panel rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Coins size={16} className="text-emerald-600" />
                  Budget & Timeline Parameters
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3">
                    <dt className="text-[var(--secondary)] font-medium">Budget Range</dt>
                    <dd className="mt-1 font-semibold text-[var(--foreground)]">
                      {data.budgetMin || data.budgetMax
                        ? `${data.budgetMin || "0"} – ${data.budgetMax || "—"} ${data.currency || ""}`
                        : "Not specified"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3">
                    <dt className="text-[var(--secondary)] font-medium">Expected Timeline</dt>
                    <dd className="mt-1 font-semibold text-[var(--foreground)]">
                      {data.expectedTimeline || "Not specified"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3">
                    <dt className="text-[var(--secondary)] font-medium">Target Completion</dt>
                    <dd className="mt-1 font-semibold text-[var(--foreground)]">
                      {data.targetDate
                        ? new Date(data.targetDate).toLocaleDateString()
                        : "Not specified"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3">
                    <dt className="text-[var(--secondary)] font-medium">Approval Status</dt>
                    <dd className="mt-1 font-semibold text-[var(--foreground)]">
                      {data.confirmedAt ? "Confirmed" : "Draft / Pending"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                  Constraints & Internal Assumptions
                </h2>
                <div className="mt-2 space-y-2 text-xs">
                  <div>
                    <strong className="text-[var(--foreground)]">Constraints:</strong>{" "}
                    <span className="text-[var(--secondary)]">
                      {data.constraints || "None specified."}
                    </span>
                  </div>
                  <div>
                    <strong className="text-[var(--foreground)]">Internal Assumptions:</strong>{" "}
                    <span className="text-[var(--secondary)]">
                      {data.assumptions || "None specified."}
                    </span>
                  </div>
                  {data.additionalNotes && (
                    <div>
                      <strong className="text-[var(--foreground)]">Additional Notes:</strong>{" "}
                      <span className="text-[var(--secondary)]">{data.additionalNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Structured Requirement Items */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Structured Requirement Items ({data.items.length})
                </h2>
                <p className="mt-0.5 text-xs text-[var(--secondary)]">
                  Functional and non-functional specifications with approval statuses.
                </p>
              </div>
            </div>

            {data.items.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--secondary)]">
                No structured items recorded.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[var(--border)] bg-white/70 p-4 transition-all hover:bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[var(--primary)] font-bold text-xs">
                          {item.sortOrder + 1}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.requirementType}</Badge>
                        <Badge
                          variant={
                            item.priority === "URGENT"
                              ? "error"
                              : item.priority === "HIGH"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {item.priority}
                        </Badge>
                        <StatusBadge status={item.itemStatus} />
                      </div>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-xs text-[var(--secondary)] leading-relaxed pl-8">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Confirmation & Revision History */}
          <section className="glass-panel rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
              Confirmed Revision History
            </h2>
            <p className="text-xs text-[var(--secondary)] mb-4">
              Immutable snapshots generated upon requirement confirmation.
            </p>

            {data.revisions.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--secondary)]">
                No confirmed version snapshots exist yet for this requirement.
              </p>
            ) : (
              <ol className="relative border-l border-blue-200 ml-3 space-y-4">
                {data.revisions.map((rev) => (
                  <li key={rev.id} className="ml-5">
                    <span className="absolute -left-2 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 ring-2 ring-blue-100" />
                    <div className="rounded-xl border border-[var(--border)] bg-white/70 p-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[var(--foreground)]">
                          Version {rev.version} Snapshot
                        </span>
                        <time className="text-[11px] text-[var(--secondary)]">
                          {new Date(rev.confirmedAt).toLocaleString()}
                        </time>
                      </div>
                      <p className="mt-1 text-[var(--secondary)]">
                        Confirmed by <strong className="text-[var(--foreground)]">{rev.confirmedBy.name}</strong>
                      </p>
                      {rev.changeReason && (
                        <p className="mt-1 text-amber-800 bg-amber-50 p-2 rounded-lg">
                          <strong>Revision reason:</strong> {rev.changeReason}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
