"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Globe,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ApiStatus } from "@/components/client-hub/api-status";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ClientForm, type ClientFormValues } from "@/components/client-hub/client-form";
import { apiRequest, type ClientRecord, type PageResult } from "@/lib/api/client";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const load = useCallback(async (nextPage = 1, q = "") => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        limit: "15",
      });
      if (q.trim()) query.set("search", q.trim());
      const result = await apiRequest<PageResult<ClientRecord>>(`/clients?${query}`);
      setClients(result.items);
      setPages(result.pagination.pages);
      setTotal(result.pagination.total);
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1, "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createClient(values: ClientFormValues) {
    await apiRequest<ClientRecord>("/clients", {
      method: "POST",
      body: JSON.stringify(values),
    });
    setCreateModalOpen(false);
    setNotice("Client workspace created successfully.");
    void load(1, search);
  }

  return (
    <AppShell pageTitle="Clients" breadcrumb={[{ label: "Clients" }]}>
      {/* Page Header */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Workspace Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Clients
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--secondary)]">
            Manage client organizations, primary contacts, and structured requirement workspaces.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ApiStatus />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load(page, search)}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus size={15} aria-hidden="true" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 shadow-xs animate-fade-in"
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs sm:text-sm text-[var(--error)] shadow-xs animate-fade-in"
        >
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => void load(page, search)}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Glass Panel */}
      <section className="glass-panel rounded-2xl overflow-hidden shadow-xs">
        {/* Search & Statistics Filter Bar */}
        <div className="flex flex-col gap-3.5 border-b border-[var(--border)] p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between bg-[var(--surface)]/50">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              All Client Workspaces
            </h2>
            <p className="mt-0.5 text-xs text-[var(--secondary)]">
              {total} record{total === 1 ? "" : "s"} scoped to your agency
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(1, search);
            }}
            className="flex items-center gap-2"
          >
            <label className="relative flex-1 sm:w-64">
              <span className="sr-only">Search clients</span>
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company or contact…"
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-xs text-[var(--foreground)] placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              />
            </label>
            <Button variant="secondary" size="sm" type="submit">
              Search
            </Button>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setSearch("");
                  void load(1, "");
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="p-16 text-center text-xs sm:text-sm text-[var(--secondary)]">
            <RefreshCw size={24} className="mx-auto text-blue-500 animate-spin mb-3" />
            Loading client workspaces…
          </div>
        ) : clients.length === 0 ? (
          <div className="p-16 text-center">
            <UsersRound size={32} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {search ? "No clients match your search" : "No clients created yet"}
            </p>
            <p className="mt-1 text-xs text-[var(--secondary)] max-w-sm mx-auto">
              {search
                ? "Try searching for a different company name or clearing the search query."
                : "Create your first client workspace to start organizing requirements and communications."}
            </p>
            <div className="mt-5">
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus size={15} aria-hidden="true" />
                Add Client
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">
                    <th className="px-6 py-3.5">Client & Company</th>
                    <th className="px-6 py-3.5">Primary Contact</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Requirements</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-[var(--surface-elevated)]/60 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-[var(--primary)] font-bold text-xs">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/clients/${client.id}`}
                              className="text-xs sm:text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors block truncate"
                            >
                              {client.name}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--secondary)]">
                              {client.website ? (
                                <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                                  <Globe size={11} className="shrink-0" />
                                  {client.website.replace(/^https?:\/\//, "")}
                                </span>
                              ) : client.primaryPhone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={11} className="shrink-0" />
                                  {client.primaryPhone}
                                </span>
                              ) : client.primaryEmail ? (
                                <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                                  <Mail size={11} className="shrink-0" />
                                  {client.primaryEmail}
                                </span>
                              ) : (
                                <span>No contact info</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-[var(--foreground)]">
                        {client.primaryContactName ? (
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-slate-400 shrink-0" />
                            <span className="font-medium truncate max-w-[160px]">
                              {client.primaryContactName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--secondary)]">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={client.status} />
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <Badge variant="neutral">
                          {client._count?.requirements ?? 0} requirement
                          {(client._count?.requirements ?? 0) === 1 ? "" : "s"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/clients/${client.id}`}
                          aria-label={`Open workspace for ${client.name}`}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-blue-500/10 transition-colors"
                        >
                          Open workspace
                          <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block sm:hidden divide-y divide-[var(--border)]">
              {clients.map((client) => (
                <div key={client.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] block truncate"
                      >
                        {client.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--secondary)]">
                        {client.primaryContactName || "No contact specified"}
                      </p>
                    </div>
                    <StatusBadge status={client.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--secondary)]">
                    {client.primaryPhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={11} /> {client.primaryPhone}
                      </span>
                    )}
                    {client.primaryEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={11} /> {client.primaryEmail}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                    <Badge variant="neutral">
                      {client._count?.requirements ?? 0} requirements
                    </Badge>
                    <Link
                      href={`/clients/${client.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
                    >
                      Workspace <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3.5 text-xs text-[var(--secondary)] bg-[var(--surface)]/40">
          <span>
            Page <strong className="text-[var(--foreground)]">{page}</strong> of{" "}
            <strong className="text-[var(--foreground)]">{Math.max(pages, 1)}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1, search)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages || loading}
              onClick={() => void load(page + 1, search)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      {/* Create Client Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add a New Client Workspace"
        description="Company names are validated and unique per agency. At least one contact method is required."
        maxWidth="2xl"
      >
        <ClientForm
          submitLabel="Create Client"
          onSubmit={createClient}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>
    </AppShell>
  );
}
