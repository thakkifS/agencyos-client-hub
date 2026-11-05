"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  MessageSquareText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getClientHubOverview, getClientsForRequirementPicker } from "@/lib/api/client-hub";
import { apiRequest, type ClientRecord } from "@/lib/api/client";
import type { ClientHubOverview } from "@/lib/types/client-hub";
import { AppShell } from "@/components/layout/app-shell";
import { ClientForm, type ClientFormValues } from "@/components/client-hub/client-form";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function OverviewDashboard() {
  const router = useRouter();
  const [data, setData] = useState<ClientHubOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientChoices, setClientChoices] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getClientHubOverview());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the Client Hub overview."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openRequirementPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    setPickerError("");
    try {
      const result = await getClientsForRequirementPicker();
      setClientChoices(result.items);
      setSelectedClientId(result.items[0]?.id ?? "");
    } catch (cause) {
      setPickerError(
        cause instanceof Error ? cause.message : "Could not load clients."
      );
    } finally {
      setPickerLoading(false);
    }
  }

  async function createClient(values: ClientFormValues) {
    await apiRequest<ClientRecord>("/clients", {
      method: "POST",
      body: JSON.stringify(values),
    });
    setAddClientOpen(false);
    setNotice("Client workspace created successfully.");
    await load();
  }

  const metrics = data
    ? [
        {
          label: "Total Clients",
          value: data.metrics.totalClients,
          icon: UsersRound,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          sub: "Active agency records",
        },
        {
          label: "Draft Requirements",
          value: data.metrics.draftRequirements,
          icon: FileText,
          color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
          sub: "Incomplete / draft items",
        },
        {
          label: "Under Review",
          value: data.metrics.underReviewRequirements,
          icon: Clock3,
          color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
          sub: "Awaiting stakeholder approval",
        },
        {
          label: "Confirmed Requirements",
          value: data.metrics.confirmedRequirements,
          icon: CheckCircle2,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          sub: "Approved version snapshots",
        },
      ]
    : [];

  return (
    <AppShell pageTitle="Client Hub Overview">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            <Sparkles size={14} className="text-blue-500" aria-hidden="true" />
            Executive Client Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Client Hub Overview
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-[var(--secondary)] leading-relaxed">
            Consolidated overview of client relationships, requirement approval cycles, and ongoing collaboration feeds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </Button>
          <Button onClick={() => setAddClientOpen(true)}>
            <Plus size={15} aria-hidden="true" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 shadow-xs animate-fade-in"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            {notice}
          </span>
          <button
            onClick={() => setNotice("")}
            className="text-xs text-emerald-500 hover:underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-xs sm:text-sm text-[var(--error)] border-red-500/30 bg-red-500/10 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--error)] shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass-panel h-28 rounded-2xl p-5 animate-pulse bg-[var(--surface)]/60"
              />
            ))}
          </div>
          <div className="glass-panel h-64 rounded-2xl p-8 animate-pulse bg-[var(--surface)]/60 text-center text-xs text-[var(--secondary)] flex items-center justify-center">
            Synchronizing live Client Hub operational data…
          </div>
        </div>
      ) : data ? (
        <>
          {/* Key Metrics Cards */}
          <section
            aria-label="Client Hub metrics"
            className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map(({ label, value, icon: Icon, color, sub }) => (
              <article
                key={label}
                className="glass-card rounded-2xl p-5 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--secondary)]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                      {value.toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${color} shadow-xs`}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-[var(--secondary)] border-t border-[var(--border)] pt-2.5">
                  {sub}
                </p>
              </article>
            ))}
          </section>

          {/* Core Workflow Grid: Requirements Needing Attention & Recent Clients */}
          <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {/* Requirements Needing Attention */}
            <section
              id="requirements"
              className="glass-panel scroll-mt-24 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4.5 bg-[var(--surface)]/50">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Requirements Needing Attention
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary)]">
                    Reviews pending feedback and requested client revisions
                  </p>
                </div>
                <Badge variant="warning">
                  {data.requirementsNeedingAttention.length} pending
                </Badge>
              </div>

              {data.requirementsNeedingAttention.length === 0 ? (
                <div className="p-10 text-center text-xs text-[var(--secondary)] my-auto">
                  <CheckCircle2
                    size={28}
                    className="mx-auto text-emerald-500 mb-2"
                  />
                  <p className="font-medium text-[var(--foreground)]">
                    All requirements are up to date
                  </p>
                  <p className="mt-1">
                    No requirements are currently waiting for review or changes.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)] overflow-y-auto max-h-[380px]">
                  {data.requirementsNeedingAttention.map((item) => (
                    <li
                      key={item.id}
                      className="p-5 transition-colors hover:bg-[var(--surface-elevated)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/clients/${item.clientId}/requirements/${item.id}`}
                          className="font-semibold text-xs sm:text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors flex items-center gap-1.5"
                        >
                          {item.title || "Untitled requirement"}
                          <ArrowRight size={13} className="text-slate-400 shrink-0" />
                        </Link>
                        <p className="mt-1 text-xs text-[var(--secondary)]">
                          <span className="font-medium text-[var(--foreground)]">
                            {item.client.name}
                          </span>{" "}
                          · Prepared by {item.preparedBy.name}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--secondary)]">
                          Updated {formatDate(item.updatedAt)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={item.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent Clients */}
            <section
              id="clients"
              className="glass-panel scroll-mt-24 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4.5 bg-[var(--surface)]/50">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Recent Clients
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary)]">
                    Latest client workspaces in this agency
                  </p>
                </div>
                <Link
                  href="/clients"
                  className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors flex items-center gap-1"
                >
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              {data.recentClients.length === 0 ? (
                <div className="p-10 text-center text-xs text-[var(--secondary)] my-auto">
                  <UsersRound
                    size={28}
                    className="mx-auto text-slate-400 mb-2"
                  />
                  <p className="font-medium text-[var(--foreground)]">
                    No clients created yet
                  </p>
                  <p className="mt-1">
                    Add a client workspace to start collecting structured requirements.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)] overflow-y-auto max-h-[380px]">
                  {data.recentClients.map((client) => (
                    <li
                      key={client.id}
                      className="p-4.5 transition-colors hover:bg-[var(--surface-elevated)]/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-semibold text-xs sm:text-sm text-[var(--foreground)] hover:text-[var(--primary)] transition-colors truncate block"
                        >
                          {client.name}
                        </Link>
                        <p className="mt-1 text-[11px] text-[var(--secondary)]">
                          {client._count.requirements} requirement
                          {client._count.requirements === 1 ? "" : "s"} · Updated{" "}
                          {formatDate(client.updatedAt)}
                        </p>
                      </div>
                      <StatusBadge status={client.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Communications & Files Grid */}
          <div className="mb-8 grid gap-6 xl:grid-cols-2">
            {/* Recent Communications */}
            <section
              id="communications"
              className="glass-panel scroll-mt-24 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4.5 bg-[var(--surface)]/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[var(--primary)]">
                    <MessageSquareText size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Recent Communications
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--secondary)]">
                      Manually logged stakeholder interactions
                    </p>
                  </div>
                </div>
              </div>

              {data.recentCommunications.length === 0 ? (
                <p className="p-8 text-center text-xs text-[var(--secondary)] my-auto">
                  No communications recorded yet. Open a client workspace to log calls or meetings.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)] overflow-y-auto max-h-[320px]">
                  {data.recentCommunications.map((item) => (
                    <li key={item.id} className="p-4.5 hover:bg-[var(--surface-elevated)]/60 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/clients/${item.clientId}#communications`}
                          className="font-semibold text-xs text-[var(--foreground)] hover:text-[var(--primary)] transition-colors flex items-center gap-1.5"
                        >
                          <Badge variant="neutral" className="text-[10px] py-0 px-2 uppercase">
                            {item.type.replace("_", " ")}
                          </Badge>
                          <span className="truncate max-w-[240px] sm:max-w-md">
                            {item.subject}
                          </span>
                        </Link>
                        <time className="text-[11px] text-[var(--secondary)]">
                          {formatDate(item.occurredAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-xs text-[var(--secondary)]">
                        <span className="font-medium text-[var(--foreground)]">
                          {item.client.name}
                        </span>
                        {item.requirement?.title ? ` · Requirement: ${item.requirement.title}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent Files & References */}
            <section
              id="files"
              className="glass-panel scroll-mt-24 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4.5 bg-[var(--surface)]/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[var(--primary)]">
                    <FolderOpen size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Recent Files & References
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--secondary)]">
                      Private storage assets and documented links
                    </p>
                  </div>
                </div>
              </div>

              {data.recentFiles.length === 0 ? (
                <p className="p-8 text-center text-xs text-[var(--secondary)] my-auto">
                  No files or references added yet. Client files are stored securely in local private storage.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)] overflow-y-auto max-h-[320px]">
                  {data.recentFiles.map((item) => (
                    <li
                      key={item.id}
                      className="p-4.5 hover:bg-[var(--surface-elevated)]/60 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/clients/${item.clientId}#files`}
                          className="font-semibold text-xs text-[var(--foreground)] hover:text-[var(--primary)] transition-colors truncate block"
                        >
                          {item.label}
                        </Link>
                        <p className="mt-1 text-[11px] text-[var(--secondary)]">
                          <span className="font-medium text-[var(--foreground)]">
                            {item.client.name}
                          </span>{" "}
                          · {item.type === "FILE" ? item.originalName || "Uploaded asset" : "External link"}
                        </p>
                      </div>
                      <Badge variant={item.type === "FILE" ? "primary" : "neutral"} className="text-[10px]">
                        {item.type === "FILE" ? "File" : "Link"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Activity Timeline & Quick Actions */}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {/* Recent Safe Activity */}
            <section
              id="activity"
              className="glass-panel scroll-mt-24 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4.5 bg-[var(--surface)]/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[var(--primary)]">
                    <Activity size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Recent Activity
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--secondary)]">
                      Safe, chronological audit summary across all clients
                    </p>
                  </div>
                </div>
              </div>

              {data.recentActivity.length === 0 ? (
                <p className="p-8 text-center text-xs text-[var(--secondary)] my-auto">
                  No activity recorded yet in this agency workspace.
                </p>
              ) : (
                <ol className="divide-y divide-[var(--border)] overflow-y-auto max-h-[380px]">
                  {data.recentActivity.map((event) => (
                    <li
                      key={event.id}
                      className="p-4.5 hover:bg-[var(--surface-elevated)]/60 transition-colors flex gap-3.5"
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)] ring-4 ring-blue-500/20"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--foreground)]">
                          {event.description}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--secondary)]">
                          <Link
                            href={`/clients/${event.clientId}`}
                            className="font-medium text-[var(--primary)] hover:underline"
                          >
                            {event.clientName}
                          </Link>
                          {event.requirementTitle ? ` · ${event.requirementTitle}` : ""}
                          {event.actor ? ` · ${event.actor.name}` : ""}
                        </p>
                        <time className="mt-1 block text-[10px] text-slate-400">
                          {formatDate(event.occurredAt)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Working Quick Actions Card */}
            <section className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/10 to-blue-800/20 border border-blue-500/20 text-[var(--primary)] shadow-xs">
                    <BriefcaseBusiness size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Quick Operations
                    </h2>
                    <p className="text-xs text-[var(--secondary)]">
                      Frequently used workflows & actions
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-2.5">
                  <Button
                    variant="secondary"
                    className="w-full justify-between h-11 rounded-xl text-xs sm:text-sm font-medium"
                    onClick={() => setAddClientOpen(true)}
                  >
                    <span className="flex items-center gap-2">
                      <Plus size={15} className="text-[var(--primary)]" />
                      Add a Client Workspace
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Button>

                  <Button
                    variant="secondary"
                    className="w-full justify-between h-11 rounded-xl text-xs sm:text-sm font-medium"
                    onClick={() => void openRequirementPicker()}
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={15} className="text-[var(--primary)]" />
                      Create a Client Requirement
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Button>

                  <Link
                    href="/clients"
                    className="inline-flex h-11 items-center justify-between rounded-xl px-3.5 text-xs sm:text-sm font-medium text-[var(--secondary)] border border-[var(--border)] bg-[var(--surface)]/70 hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-colors shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <UsersRound size={15} className="text-slate-400" />
                      Manage All Clients
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>

                  <Link
                    href="#requirements"
                    className="inline-flex h-11 items-center justify-between rounded-xl px-3.5 text-xs sm:text-sm font-medium text-[var(--secondary)] border border-[var(--border)] bg-[var(--surface)]/70 hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-colors shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Clock3 size={15} className="text-slate-400" />
                      Review Pending Requirements
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--secondary)]">
                  <ShieldCheck
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  <span>
                    Tenant isolation verified. All records are restricted to the
                    agency resolved by the server actor guard.
                  </span>
                </p>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {/* Add Client Modal */}
      <Modal
        isOpen={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        title="Add a Client"
        description="Create an agency-scoped client workspace. Company name is unique within your agency."
        maxWidth="2xl"
      >
        <ClientForm
          submitLabel="Create Client"
          onSubmit={createClient}
          onCancel={() => setAddClientOpen(false)}
        />
      </Modal>

      {/* Choose Client for Requirement Picker Modal */}
      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose a Client"
        description="Requirements must be associated with an existing client workspace."
        maxWidth="lg"
      >
        {pickerLoading ? (
          <p role="status" className="py-6 text-center text-xs text-[var(--secondary)]">
            Loading client workspaces…
          </p>
        ) : pickerError ? (
          <div role="alert" className="py-4 text-xs text-[var(--error)]">
            {pickerError}
          </div>
        ) : clientChoices.length === 0 ? (
          <div className="space-y-4 py-3">
            <p className="text-xs text-[var(--secondary)]">
              No clients exist yet. Create a client before initiating a requirement.
            </p>
            <Button
              onClick={() => {
                setPickerOpen(false);
                setAddClientOpen(true);
              }}
            >
              Add a Client First
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <label htmlFor="requirement-client-picker" className="block text-xs font-semibold text-[var(--foreground)]">
              Select Client Workspace
              <select
                id="requirement-client-picker"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs sm:text-sm font-medium focus-visible:outline-2 focus-visible:outline-[var(--primary)] text-[var(--foreground)]"
              >
                {clientChoices.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-4 border-t border-[var(--border)]">
              <Link
                href="/clients"
                onClick={() => setPickerOpen(false)}
                className="inline-flex h-10 items-center justify-center px-3.5 text-xs font-medium text-[var(--secondary)] hover:text-[var(--foreground)]"
              >
                View all clients
              </Link>
              <Button
                disabled={!selectedClientId}
                onClick={() => {
                  setPickerOpen(false);
                  router.push(`/clients/${selectedClientId}?newRequirement=1`);
                }}
              >
                Continue to Requirement Form
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

export default OverviewDashboard;
