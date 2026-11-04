"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, FolderOpen, MessageSquareText, Plus, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { getClientHubOverview, getClientsForRequirementPicker } from "@/lib/api/client-hub";
import { apiRequest, type ClientRecord } from "@/lib/api/client";
import type { ClientHubOverview } from "@/lib/types/client-hub";
import { AppShell } from "@/components/layout/app-shell";
import { ClientForm, type ClientFormValues } from "@/components/client-hub/client-form";
import { Button } from "@/components/ui/button";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const statusStyles: Record<string, string> = {
  UNDER_REVIEW: "bg-amber-50 text-amber-800",
  CHANGES_REQUESTED: "bg-amber-50 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-green-50 text-green-800",
};

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
      setError(cause instanceof Error ? cause.message : "Could not load the Client Hub overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
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
      setPickerError(cause instanceof Error ? cause.message : "Could not load clients.");
    } finally {
      setPickerLoading(false);
    }
  }

  async function createClient(values: ClientFormValues) {
    await apiRequest<ClientRecord>("/clients", { method: "POST", body: JSON.stringify(values) });
    setAddClientOpen(false);
    setNotice("Client created successfully.");
    await load();
  }

  const metrics = data ? [
    { label: "Total clients", value: data.metrics.totalClients, icon: UsersRound, tone: "text-blue-700 bg-blue-50" },
    { label: "Draft requirements", value: data.metrics.draftRequirements, icon: FileText, tone: "text-slate-700 bg-slate-100" },
    { label: "Under review", value: data.metrics.underReviewRequirements, icon: Clock3, tone: "text-amber-800 bg-amber-50" },
    { label: "Confirmed", value: data.metrics.confirmedRequirements, icon: CheckCircle2, tone: "text-green-800 bg-green-50" },
  ] : [];

  return <AppShell pageTitle="Client Hub overview">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Client operations</p><h1 className="text-3xl font-semibold tracking-tight">Client Hub overview</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--secondary)]">A current view of client relationships, requirement approvals and recent conversations.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true"/>Refresh</Button><Button onClick={() => setAddClientOpen(true)}><Plus size={15} aria-hidden="true"/>Add client</Button></div>
    </div>

    {notice && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
    {error && <div role="alert" className="glass-panel mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm text-[var(--error)]"><span>{error}</span><Button variant="secondary" onClick={() => void load()}>Try again</Button></div>}

    {loading && !data ? <div role="status" className="glass-panel rounded-2xl p-10 text-center text-sm text-[var(--secondary)]">Loading live Client Hub data…</div> : data && <>
      <section aria-label="Client Hub metrics" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className="glass-panel rounded-2xl p-5"><div className="flex items-start justify-between"><p className="text-sm font-medium text-[var(--secondary)]">{label}</p><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={18} aria-hidden="true"/></span></div><p className="mt-4 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p><p className="mt-1 text-xs text-[var(--secondary)]">Live agency data</p></article>)}
      </section>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section id="requirements" className="glass-panel scroll-mt-24 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="text-base font-semibold">Requirements needing attention</h2><p className="mt-1 text-sm text-[var(--secondary)]">Reviews and requested changes from your clients.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{data.requirementsNeedingAttention.length} shown</span></div>
          {data.requirementsNeedingAttention.length === 0 ? <p className="p-8 text-center text-sm text-[var(--secondary)]">No requirements are waiting for review.</p> : <ul className="divide-y divide-[var(--border)]">{data.requirementsNeedingAttention.map((item) => <li key={item.id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"><div className="min-w-0"><Link href={`/clients/${item.clientId}/requirements/${item.id}`} className="font-semibold hover:text-[var(--primary-dark)]">{item.title || "Untitled requirement"}</Link><p className="mt-1 text-sm text-[var(--secondary)]">{item.client.name} · Prepared by {item.preparedBy.name}</p><p className="mt-1 text-xs text-[var(--secondary)]">Updated {formatDate(item.updatedAt)}</p></div><span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>{item.status.replaceAll("_", " ")}</span></li>)}</ul>}
        </section>

        <section id="clients" className="glass-panel scroll-mt-24 rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="text-base font-semibold">Recent clients</h2><p className="mt-1 text-sm text-[var(--secondary)]">Latest client records in your agency.</p></div><Link href="/clients" className="text-sm font-semibold text-blue-700 hover:text-blue-800">View all</Link></div>
          {data.recentClients.length === 0 ? <p className="p-8 text-center text-sm text-[var(--secondary)]">No clients yet. Add a client to start a workspace.</p> : <ul className="divide-y divide-[var(--border)]">{data.recentClients.map((client) => <li key={client.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><Link href={`/clients/${client.id}`} className="truncate font-semibold hover:text-[var(--primary-dark)]">{client.name}</Link><p className="mt-1 text-xs text-[var(--secondary)]">{client._count.requirements} requirements · Updated {formatDate(client.updatedAt)}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{client.status.replaceAll("_", " ")}</span></li>)}</ul>}
        </section>
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-2">
        <section id="communications" className="glass-panel scroll-mt-24 rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="text-base font-semibold">Recent communications</h2><p className="mt-1 text-sm text-[var(--secondary)]">Manually recorded client conversations.</p></div><MessageSquareText size={18} className="text-[var(--primary)]" aria-hidden="true"/></div>
          {data.recentCommunications.length === 0 ? <p className="p-8 text-center text-sm text-[var(--secondary)]">No communications recorded yet.</p> : <ul className="divide-y divide-[var(--border)]">{data.recentCommunications.map((item) => <li key={item.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/clients/${item.clientId}#communications`} className="font-semibold hover:text-[var(--primary-dark)]">{item.subject}</Link><time className="text-xs text-[var(--secondary)]">{formatDate(item.occurredAt)}</time></div><p className="mt-1 text-sm text-[var(--secondary)]">{item.client.name} · {item.type.replaceAll("_", " ")}{item.requirement?.title ? ` · ${item.requirement.title}` : ""}</p></li>)}</ul>}
        </section>

        <section id="files" className="glass-panel scroll-mt-24 rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="text-base font-semibold">Recent files & references</h2><p className="mt-1 text-sm text-[var(--secondary)]">Client material added to active workspaces.</p></div><FolderOpen size={18} className="text-[var(--primary)]" aria-hidden="true"/></div>
          {data.recentFiles.length === 0 ? <p className="p-8 text-center text-sm text-[var(--secondary)]">No files or references have been added.</p> : <ul className="divide-y divide-[var(--border)]">{data.recentFiles.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><Link href={`/clients/${item.clientId}#files`} className="truncate font-semibold hover:text-[var(--primary-dark)]">{item.label}</Link><p className="mt-1 text-xs text-[var(--secondary)]">{item.client.name} · {item.type === "FILE" ? item.originalName || "Uploaded file" : "External reference"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.type === "FILE" ? "File" : "Reference"}</span></li>)}</ul>}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section id="activity" className="glass-panel scroll-mt-24 rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="text-base font-semibold">Recent activity</h2><p className="mt-1 text-sm text-[var(--secondary)]">A safe, chronological summary of client work.</p></div><Activity size={18} className="text-[var(--primary)]" aria-hidden="true"/></div>
          {data.recentActivity.length === 0 ? <p className="p-8 text-center text-sm text-[var(--secondary)]">No client activity recorded yet.</p> : <ol className="divide-y divide-[var(--border)]">{data.recentActivity.map((event) => <li key={event.id} className="flex gap-3 p-4"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true"/><div className="min-w-0"><p className="text-sm font-medium">{event.description}</p><p className="mt-1 text-xs text-[var(--secondary)]"><Link href={`/clients/${event.clientId}`} className="font-medium hover:text-[var(--primary-dark)]">{event.clientName}</Link>{event.requirementTitle ? ` · ${event.requirementTitle}` : ""}{event.actor ? ` · ${event.actor.name}` : ""}</p><time className="mt-1 block text-xs text-[var(--secondary)]">{formatDate(event.occurredAt)}</time></div></li>)}</ol>}
        </section>

        <section className="glass-panel rounded-2xl p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BriefcaseBusiness size={19} aria-hidden="true"/></span><div><h2 className="text-base font-semibold">Quick actions</h2><p className="text-sm text-[var(--secondary)]">Go straight to a useful next step.</p></div></div><div className="mt-5 grid gap-3"><Button variant="secondary" className="w-full justify-between" onClick={() => setAddClientOpen(true)}>Add a client <ArrowRight size={15} aria-hidden="true"/></Button><Button variant="secondary" className="w-full justify-between" onClick={() => void openRequirementPicker()}>Create a requirement <ArrowRight size={15} aria-hidden="true"/></Button><Link className="inline-flex h-10 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[var(--secondary)] transition-colors hover:bg-slate-50" href="/clients">View all clients <ArrowRight size={15} aria-hidden="true"/></Link><Link className="inline-flex h-10 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[var(--secondary)] transition-colors hover:bg-slate-50" href="#requirements">Review requirements <ArrowRight size={15} aria-hidden="true"/></Link></div><p className="mt-5 flex items-start gap-2 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--secondary)]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true"/>Overview results are scoped to the agency resolved by the backend.</p></section>
      </div>
    </>}

    {addClientOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddClientOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="overview-add-client-title" className="my-auto w-full max-w-2xl rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:p-6"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="overview-add-client-title" className="text-lg font-semibold">Add a client</h2><p className="mt-1 text-sm text-[var(--secondary)]">Create an agency-scoped client workspace.</p></div><button type="button" onClick={() => setAddClientOpen(false)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-slate-50" aria-label="Close add client dialog">Close</button></div><ClientForm submitLabel="Create client" onSubmit={createClient} onCancel={() => setAddClientOpen(false)}/></section></div>}

    {pickerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="requirement-client-picker-title" className="glass-panel w-full max-w-lg rounded-2xl p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="requirement-client-picker-title" className="text-lg font-semibold">Choose a client</h2><p className="mt-1 text-sm text-[var(--secondary)]">A requirement must belong to a client workspace.</p></div><button type="button" onClick={() => setPickerOpen(false)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-slate-50">Close</button></div>{pickerLoading ? <p role="status" className="py-5 text-sm text-[var(--secondary)]">Loading clients…</p> : pickerError ? <p role="alert" className="py-3 text-sm text-[var(--error)]">{pickerError}</p> : clientChoices.length === 0 ? <div className="space-y-3"><p className="text-sm text-[var(--secondary)]">Create a client before starting its requirement.</p><Button onClick={() => { setPickerOpen(false); setAddClientOpen(true); }}>Add a client</Button></div> : <><label htmlFor="requirement-client-picker" className="block text-sm font-medium">Client<select id="requirement-client-picker" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{clientChoices.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><div className="mt-5 flex flex-col-reverse justify-between gap-2 sm:flex-row"><Link href="/clients" onClick={() => setPickerOpen(false)} className="inline-flex h-10 items-center px-3 text-sm font-medium text-[var(--secondary)] hover:text-[var(--foreground)]">View all clients</Link><Button disabled={!selectedClientId} onClick={() => { setPickerOpen(false); router.push(`/clients/${selectedClientId}?newRequirement=1`); }}>Continue to requirement <ArrowRight size={15} aria-hidden="true"/></Button></div></>}</section></div>}
  </AppShell>;
}
