"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileEdit,
  FileText,
  FolderOpen,
  Globe,
  Mail,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest, type ClientRecord, type RequirementRecord } from "@/lib/api/client";
import { CommunicationsPanel } from "@/components/client-hub/communications-panel";
import { AssetsPanel } from "@/components/client-hub/assets-panel";
import { TimelinePanel } from "@/components/client-hub/timeline-panel";
import { ClientForm, type ClientFormValues } from "@/components/client-hub/client-form";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

type Hub = {
  client: ClientRecord & {
    notes: Array<{
      id: string;
      content: string;
      createdAt: string;
      author: { name: string };
    }>;
  };
  requirements: RequirementRecord[];
  communications: { available: boolean };
  files: { available: boolean };
  activity: { available: boolean };
};

const serviceOptions = [
  "UI/UX Design",
  "Web Development",
  "Mobile App Development",
  "Backend Development",
  "API Integration",
  "AI / ML Development",
  "QA & Testing",
  "Cloud / Hosting",
  "Maintenance & Support",
  "Digital Marketing",
  "Other",
];

const currencyOptions = [
  "LKR",
  "USD",
  "GBP",
  "EUR",
  "AUD",
  "CAD",
  "INR",
  "SGD",
  "AED",
];

type TabKey = "overview" | "requirements" | "communications" | "files" | "activity";

export default function ClientWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [hub, setHub] = useState<Hub | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("newRequirement") === "1") return "requirements";
      const hash = window.location.hash.replace("#", "") as TabKey;
      if (["overview", "requirements", "communications", "files", "activity"].includes(hash)) {
        return hash;
      }
    }
    return "overview";
  });
  const [clientEditing, setClientEditing] = useState(false);
  const [showCreate, setShowCreate] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("newRequirement") === "1";
    }
    return false;
  });
  const [editing, setEditing] = useState<RequirementRecord | null>(null);

  // Requirement Form State
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [services, setServices] = useState("");
  const [designPreferences, setDesignPreferences] = useState("");
  const [references, setReferences] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("");
  const [timeline, setTimeline] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [constraints, setConstraints] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [items, setItems] = useState<
    Array<{
      id?: string;
      title: string;
      description: string;
      priority: string;
      requirementType: "FUNCTIONAL" | "NON_FUNCTIONAL";
      itemStatus: "PENDING" | "CLARIFICATION" | "ACCEPTED";
      sortOrder: number;
    }>
  >([
    {
      title: "",
      description: "",
      priority: "NORMAL",
      requirementType: "FUNCTIONAL",
      itemStatus: "PENDING",
      sortOrder: 0,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHub(await apiRequest<Hub>(`/clients/${id}/hub`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open client workspace");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    const onHashChange = () => {
      const currentHash = window.location.hash.replace("#", "") as TabKey;
      if (["overview", "requirements", "communications", "files", "activity"].includes(currentHash)) {
        setActiveTab(currentHash);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [load]);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    window.location.hash = tab;
  }

  async function submitClient(values: ClientFormValues) {
    await apiRequest(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    setClientEditing(false);
    setMessage("Client profile updated successfully.");
    await load();
  }

  function beginEdit(r: RequirementRecord) {
    setEditing(r);
    setShowCreate(true);
    setActiveTab("requirements");
    setTitle(r.title || "");
    setObjective(r.businessObjective || "");
    setServices(r.requestedServices.join(", "));
    setDesignPreferences(r.designPreferences || "");
    setReferences(r.referenceLinks.join("\n"));
    setBudgetMin(r.budgetMin || "");
    setBudgetMax(r.budgetMax || "");
    setCurrency(r.currency || "");
    setTimeline(r.expectedTimeline || "");
    setTargetDate(r.targetDate ? r.targetDate.slice(0, 10) : "");
    setConstraints(r.constraints || "");
    setAssumptions(r.assumptions || "");
    setAdditionalNotes(r.additionalNotes || "");
    setItems(
      r.items.length
        ? r.items.map((x) => ({
            id: x.id,
            title: x.title || "",
            description: x.description || "",
            priority: x.priority,
            requirementType: x.requirementType,
            itemStatus: x.itemStatus,
            sortOrder: x.sortOrder,
          }))
        : [
            {
              title: "",
              description: "",
              priority: "NORMAL",
              requirementType: "FUNCTIONAL",
              itemStatus: "PENDING",
              sortOrder: 0,
            },
          ]
    );
  }

  function clearForm() {
    setEditing(null);
    setTitle("");
    setObjective("");
    setServices("");
    setDesignPreferences("");
    setReferences("");
    setBudgetMin("");
    setBudgetMax("");
    setCurrency("");
    setTimeline("");
    setTargetDate("");
    setConstraints("");
    setAssumptions("");
    setAdditionalNotes("");
    setItems([
      {
        title: "",
        description: "",
        priority: "NORMAL",
        requirementType: "FUNCTIONAL",
        itemStatus: "PENDING",
        sortOrder: 0,
      },
    ]);
    setShowCreate(false);
  }

  function moveItem(index: number, delta: number) {
    setItems((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  }

  async function createRequirement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const referenceLines = references
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    const invalidLines = referenceLines.flatMap((value, index) => {
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? [] : [index + 1];
      } catch {
        return [index + 1];
      }
    });

    if (referenceLines.length > 10) {
      setError("Use no more than 10 reference URLs.");
      return;
    }
    if (invalidLines.length) {
      setError(
        "Reference URL line(s) " +
          invalidLines.join(", ") +
          " must use a valid http:// or https:// address."
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        businessObjective: objective.trim(),
        requestedServices: services.split(", ").filter(Boolean),
        designPreferences: designPreferences.trim() || null,
        referenceLinks: [...new Set(referenceLines)],
        budgetMin: budgetMin || null,
        budgetMax: budgetMax || null,
        currency: currency || null,
        expectedTimeline: timeline.trim() || null,
        targetDate: targetDate || null,
        constraints: constraints.trim() || null,
        assumptions: assumptions.trim() || null,
        additionalNotes: additionalNotes.trim() || null,
        items: items.map((item, sortOrder) => ({
          ...item,
          title: item.title.trim(),
          description: item.description.trim(),
          sortOrder,
        })),
      };

      await apiRequest(
        editing ? `/requirements/${editing.id}` : `/clients/${id}/requirements`,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setMessage(
        editing ? "Requirement draft updated." : "Requirement draft saved."
      );
      clearForm();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save requirement"
      );
    } finally {
      setSaving(false);
    }
  }

  async function transition(r: RequirementRecord, status: string) {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/requirements/${r.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(
        `Requirement advanced to ${status.replaceAll("_", " ").toLowerCase()}.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status transition failed");
    }
  }

  async function exportRequirement(r: RequirementRecord) {
    try {
      const data = await apiRequest(`/requirements/${r.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `requirement-${r.id}-v${r.revisions[0]?.version || 1}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }

  const tabs: { key: TabKey; label: string; icon: typeof FileText; count?: number }[] = [
    { key: "overview", label: "Overview & Profile", icon: Building2 },
    {
      key: "requirements",
      label: "Requirements",
      icon: FileText,
      count: hub?.requirements.length ?? 0,
    },
    { key: "communications", label: "Communications", icon: MessageSquareText },
    { key: "files", label: "Files & References", icon: FolderOpen },
    { key: "activity", label: "Activity Timeline", icon: Activity },
  ];

  return (
    <AppShell
      pageTitle={hub?.client.name || "Client Workspace"}
      breadcrumb={[
        { label: "Clients", href: "/clients" },
        { label: hub?.client.name || "Workspace" },
      ]}
    >
      {/* Top Navigation Back link */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--secondary)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Back to all clients
        </Link>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-xs sm:text-sm text-[var(--secondary)] animate-pulse">
          Loading client workspace…
        </div>
      ) : error && !hub ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-[var(--error)]"
        >
          {error}
        </div>
      ) : hub ? (
        <>
          {/* Client Workspace Hero Header */}
          <section className="glass-panel mb-8 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md font-bold text-lg">
                  {hub.client.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                      {hub.client.name}
                    </h1>
                    <StatusBadge status={hub.client.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--secondary)]">
                    {hub.client.primaryContactName && (
                      <span className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                        <User size={13} className="text-slate-400" />
                        {hub.client.primaryContactName}
                      </span>
                    )}
                    {hub.client.primaryEmail && (
                      <a
                        href={`mailto:${hub.client.primaryEmail}`}
                        className="flex items-center gap-1.5 hover:text-[var(--primary)] transition-colors"
                      >
                        <Mail size={13} className="text-slate-400" />
                        {hub.client.primaryEmail}
                      </a>
                    )}
                    {hub.client.primaryPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        {hub.client.primaryPhone}
                      </span>
                    )}
                    {hub.client.website && (
                      <a
                        href={hub.client.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[var(--primary)] hover:underline"
                      >
                        <Globe size={13} />
                        {hub.client.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setClientEditing(true)}
                >
                  <Pencil size={13} aria-hidden="true" />
                  Edit Client Profile
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    clearForm();
                    setShowCreate(true);
                    switchTab("requirements");
                  }}
                >
                  <Plus size={14} aria-hidden="true" />
                  New Requirement
                </Button>
              </div>
            </div>

            {/* Notification Messages */}
            {message && (
              <div
                role="status"
                className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-900 animate-fade-in"
              >
                <span>{message}</span>
                <button
                  onClick={() => setMessage("")}
                  className="text-xs text-emerald-700 font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mt-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-[var(--error)] animate-fade-in"
              >
                <span>{error}</span>
                <button
                  onClick={() => setError("")}
                  className="text-xs text-red-700 font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </section>

          {/* Tab Navigation */}
          <nav
            aria-label="Workspace tabs"
            className="mb-8 flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-2"
          >
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-blue-50 text-[var(--primary)] shadow-xs"
                      : "text-[var(--secondary)] hover:bg-slate-100 hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {typeof count === "number" && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${
                        isActive
                          ? "bg-blue-200/60 text-blue-800"
                          : "bg-slate-200/70 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* TAB 1: OVERVIEW & CLIENT DETAILS */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Client Company Profile Card */}
                <section className="glass-panel rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Client Organization Details
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary)]">
                    Primary contact attributes and normalized communication channels.
                  </p>

                  <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3.5">
                      <dt className="text-[var(--secondary)] font-medium">Primary Contact</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        {hub.client.primaryContactName || "Not provided"}
                      </dd>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3.5">
                      <dt className="text-[var(--secondary)] font-medium">Direct Email</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)] truncate">
                        {hub.client.primaryEmail || "Not provided"}
                      </dd>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3.5">
                      <dt className="text-[var(--secondary)] font-medium">Phone Number</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        {hub.client.primaryPhone || "Not provided"}
                      </dd>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3.5">
                      <dt className="text-[var(--secondary)] font-medium">Official Website</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)] truncate">
                        {hub.client.website ? (
                          <a
                            href={hub.client.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--primary)] hover:underline"
                          >
                            {hub.client.website}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 pt-4 border-t border-[var(--border)] flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setClientEditing(true)}
                    >
                      <Pencil size={13} /> Edit Profile
                    </Button>
                  </div>
                </section>

                {/* Latest Client Notes Card */}
                <section className="glass-panel rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Internal Client Notes
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary)]">
                    Notes captured by your agency team.
                  </p>

                  <div className="mt-5 space-y-3 max-h-[260px] overflow-y-auto">
                    {hub.client.notes.length ? (
                      hub.client.notes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-[var(--border)] bg-white/70 p-3.5 text-xs"
                        >
                          <p className="text-[var(--foreground)] leading-relaxed">
                            {note.content}
                          </p>
                          <p className="mt-2 text-[11px] text-[var(--secondary)]">
                            {note.author.name} ·{" "}
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-xs text-[var(--secondary)]">
                        No client notes recorded yet.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* Workspace Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--secondary)]">
                      Total Requirements
                    </span>
                    <FileText size={18} className="text-blue-600" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {hub.requirements.length}
                  </p>
                  <button
                    onClick={() => switchTab("requirements")}
                    className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                  >
                    Manage requirements →
                  </button>
                </div>

                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--secondary)]">
                      Logged Communications
                    </span>
                    <MessageSquare size={18} className="text-emerald-600" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--secondary)]">
                    Manual records & call logs
                  </p>
                  <button
                    onClick={() => switchTab("communications")}
                    className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                  >
                    Open communications →
                  </button>
                </div>

                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--secondary)]">
                      Audit Timeline
                    </span>
                    <Activity size={18} className="text-amber-600" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--secondary)]">
                    Chronological activity log
                  </p>
                  <button
                    onClick={() => switchTab("activity")}
                    className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                  >
                    View timeline →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REQUIREMENTS */}
          {activeTab === "requirements" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    Structured Requirements
                  </h2>
                  <p className="text-xs text-[var(--secondary)]">
                    Draft, review, confirm, and export version-controlled client requirements.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (showCreate) clearForm();
                    else {
                      clearForm();
                      setShowCreate(true);
                    }
                  }}
                >
                  <Plus size={15} />
                  {showCreate ? "Close Form" : "New Requirement"}
                </Button>
              </div>

              {/* Requirement Form (Multi-section) */}
              {showCreate && (
                <form
                  onSubmit={createRequirement}
                  className="glass-panel rounded-3xl p-6 sm:p-8 space-y-7 border-blue-200/80 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-[var(--foreground)]">
                        {editing ? "Edit Requirement Draft" : "Create New Requirement"}
                      </h3>
                      <p className="text-xs text-[var(--secondary)]">
                        Incomplete work may be saved as DRAFT; full validation runs upon review submission.
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearForm}>
                      Cancel
                    </Button>
                  </div>

                  {/* Section 1: Title & Services */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                      1. Basic Scope & Services
                    </h4>
                    <label className="block text-xs font-semibold text-[var(--foreground)]">
                      Requirement Title <span className="text-[var(--error)]">*</span>
                      <input
                        maxLength={150}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Enterprise Client Portal & Billing Integration"
                        className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-xs sm:text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                      />
                    </label>

                    <fieldset>
                      <legend className="text-xs font-semibold text-[var(--foreground)]">
                        Requested Services{" "}
                        <span className="font-normal text-[var(--secondary)]">
                          (Select one or more)
                        </span>
                      </legend>
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {serviceOptions.map((option) => {
                          const isSelected = services.split(", ").includes(option);
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-medium cursor-pointer transition-colors ${
                                isSelected
                                  ? "border-[var(--primary)] bg-blue-50/80 text-[var(--primary)]"
                                  : "border-[var(--border)] bg-white hover:bg-slate-50 text-[var(--foreground)]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const selected = services.split(", ").filter(Boolean);
                                  setServices(
                                    (e.target.checked
                                      ? [...selected, option]
                                      : selected.filter((value) => value !== option)
                                    ).join(", ")
                                  );
                                }}
                                className="accent-[var(--primary)] h-4 w-4 rounded"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>

                  {/* Section 2: Business Objective */}
                  <div className="space-y-2 border-t border-[var(--border)] pt-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                      2. Business Objective
                    </h4>
                    <label className="block text-xs font-semibold text-[var(--foreground)]">
                      Objective Description{" "}
                      <span className="text-slate-400 font-normal">
                        (10–2000 characters before review)
                      </span>
                      <textarea
                        minLength={10}
                        maxLength={2000}
                        rows={3}
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Explain the client's business challenge, core users, and desired outcomes…"
                        className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-white p-3.5 text-xs sm:text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                      />
                    </label>
                  </div>

                  {/* Section 3: Requirement Items */}
                  <div className="space-y-4 border-t border-[var(--border)] pt-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                        3. Structured Requirement Items ({items.length})
                      </h4>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setItems([
                            ...items,
                            {
                              title: "",
                              description: "",
                              priority: "NORMAL",
                              requirementType: "FUNCTIONAL",
                              itemStatus: "PENDING",
                              sortOrder: items.length,
                            },
                          ])
                        }
                      >
                        <Plus size={13} /> Add Item
                      </Button>
                    </div>

                    <div className="space-y-3.5">
                      {items.map((item, i) => (
                        <div
                          key={item.id ?? i}
                          className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 sm:p-5 shadow-xs relative"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-[var(--primary)] bg-blue-50 px-2.5 py-1 rounded-lg">
                              Item #{i + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label={`Move item ${i + 1} up`}
                                disabled={i === 0}
                                onClick={() => moveItem(i, -1)}
                                className="p-1 rounded-lg border border-[var(--border)] text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Move item ${i + 1} down`}
                                disabled={i === items.length - 1}
                                onClick={() => moveItem(i, 1)}
                                className="p-1 rounded-lg border border-[var(--border)] text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove item ${i + 1}`}
                                disabled={items.length === 1}
                                onClick={() =>
                                  setItems(
                                    items
                                      .filter((_, j) => j !== i)
                                      .map((x, j) => ({ ...x, sortOrder: j }))
                                  )
                                }
                                className="p-1 rounded-lg border border-red-200 text-[var(--error)] hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="text-xs font-semibold text-[var(--foreground)]">
                              Item Title
                              <input
                                maxLength={150}
                                value={item.title}
                                onChange={(e) =>
                                  setItems(
                                    items.map((x, j) =>
                                      j === i ? { ...x, title: e.target.value } : x
                                    )
                                  )
                                }
                                placeholder="e.g. Single Sign-On via Google SAML"
                                className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                              />
                            </label>

                            <label className="text-xs font-semibold text-[var(--foreground)] sm:col-span-2">
                              Item Description
                              <input
                                maxLength={500}
                                value={item.description}
                                onChange={(e) =>
                                  setItems(
                                    items.map((x, j) =>
                                      j === i
                                        ? { ...x, description: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                placeholder="Specific capability, acceptance criteria or rule…"
                                className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                              />
                            </label>

                            <label className="text-xs font-semibold text-[var(--foreground)]">
                              Category
                              <select
                                value={item.requirementType}
                                onChange={(e) =>
                                  setItems(
                                    items.map((x, j) =>
                                      j === i
                                        ? {
                                            ...x,
                                            requirementType: e.target.value as typeof x.requirementType,
                                          }
                                        : x
                                    )
                                  )
                                }
                                className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                              >
                                <option value="FUNCTIONAL">Functional</option>
                                <option value="NON_FUNCTIONAL">Non-functional</option>
                              </select>
                            </label>

                            <label className="text-xs font-semibold text-[var(--foreground)]">
                              Priority
                              <select
                                value={item.priority}
                                onChange={(e) =>
                                  setItems(
                                    items.map((x, j) =>
                                      j === i ? { ...x, priority: e.target.value } : x
                                    )
                                  )
                                }
                                className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                              >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                            </label>

                            <label className="text-xs font-semibold text-[var(--foreground)]">
                              Status
                              <select
                                value={item.itemStatus}
                                onChange={(e) =>
                                  setItems(
                                    items.map((x, j) =>
                                      j === i
                                        ? {
                                            ...x,
                                            itemStatus: e.target.value as typeof x.itemStatus,
                                          }
                                        : x
                                    )
                                  )
                                }
                                className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="CLARIFICATION">Clarification</option>
                                <option value="ACCEPTED">Accepted</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: Design & References */}
                  <div className="space-y-4 border-t border-[var(--border)] pt-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                      4. Design Preferences & References
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-[var(--foreground)]">
                        Design Preferences
                        <textarea
                          maxLength={2000}
                          rows={3}
                          value={designPreferences}
                          onChange={(e) => setDesignPreferences(e.target.value)}
                          placeholder="Brand guidelines, moodboards, color palette preferences…"
                          className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs sm:text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>

                      <label className="block text-xs font-semibold text-[var(--foreground)]">
                        Reference URLs{" "}
                        <span className="font-normal text-[var(--secondary)]">
                          (One per line, max 10)
                        </span>
                        <textarea
                          rows={3}
                          value={references}
                          onChange={(e) => setReferences(e.target.value)}
                          placeholder="https://example.com/reference-doc&#10;https://figma.com/design-file"
                          className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs sm:text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Section 5: Budget & Timeline */}
                  <div className="space-y-4 border-t border-[var(--border)] pt-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                      5. Budget & Timeline (Optional)
                    </h4>
                    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Budget Minimum
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          placeholder="0.00"
                          className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>

                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Budget Maximum
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder="0.00"
                          className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>

                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Currency
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        >
                          <option value="">Select currency</option>
                          {currencyOptions.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Expected Timeline
                        <input
                          value={timeline}
                          onChange={(e) => setTimeline(e.target.value)}
                          placeholder="e.g. 6 weeks"
                          maxLength={50}
                          className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>

                      <label className="text-xs font-semibold text-[var(--foreground)] sm:col-span-2">
                        Target Date
                        <input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="mt-1 block h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Section 6: Governance */}
                  <div className="space-y-4 border-t border-[var(--border)] pt-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                      6. Constraints, Assumptions & Internal Notes
                    </h4>
                    <div className="grid gap-3.5 sm:grid-cols-3">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Constraints
                        <textarea
                          rows={3}
                          maxLength={2000}
                          value={constraints}
                          onChange={(e) => setConstraints(e.target.value)}
                          placeholder="Technical, compliance, or hosting limitations…"
                          className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>

                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Internal Assumptions
                        <textarea
                          rows={3}
                          maxLength={2000}
                          value={assumptions}
                          onChange={(e) => setAssumptions(e.target.value)}
                          placeholder="Assumed integrations, credentials or resources…"
                          className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>

                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Additional Notes
                        <textarea
                          rows={3}
                          maxLength={5000}
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          placeholder="Internal team notes or references…"
                          className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-[var(--border)]">
                    <Button type="button" variant="secondary" onClick={clearForm}>
                      Cancel
                    </Button>
                    <Button disabled={saving} type="submit">
                      {saving
                        ? "Saving…"
                        : editing
                        ? "Update Requirement Draft"
                        : "Save Requirement Draft"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Requirements Cards List */}
              {hub.requirements.length === 0 ? (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    No requirements yet
                  </p>
                  <p className="mt-1 text-xs text-[var(--secondary)] max-w-sm mx-auto">
                    Create a structured requirement draft for this client workspace to begin review and confirmation.
                  </p>
                  <div className="mt-5">
                    <Button onClick={() => setShowCreate(true)}>
                      <Plus size={15} /> Create First Requirement
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {hub.requirements.map((r) => (
                    <article
                      key={r.id}
                      className="glass-card rounded-2xl p-5 sm:p-6 transition-all"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Link
                              href={`/clients/${id}/requirements/${r.id}`}
                              className="text-base font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                            >
                              {r.title || "Untitled requirement"}
                            </Link>
                            <StatusBadge status={r.status} />
                          </div>

                          <p className="mt-2 text-xs text-[var(--secondary)] line-clamp-2 leading-relaxed">
                            {r.businessObjective || "No business objective recorded yet."}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--secondary)]">
                            <span>Prepared by {r.preparedBy.name}</span>
                            <span>•</span>
                            <span>Updated {new Date(r.updatedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{r.items.length} structured items</span>
                            {r.revisions.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-emerald-700">
                                  {r.revisions.length} confirmed revision(s)
                                </span>
                              </>
                            )}
                          </div>

                          {/* Items summary pills */}
                          {r.items.length > 0 && (
                            <div className="mt-3.5 flex flex-wrap gap-1.5">
                              {r.items.map((it) => (
                                <span
                                  key={it.id}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-[11px] text-[var(--foreground)]"
                                >
                                  <span className="font-bold text-[var(--primary)]">
                                    {it.sortOrder + 1}.
                                  </span>{" "}
                                  {it.title || "Untitled item"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Status Transitions & Actions Toolbar */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-start">
                          {["DRAFT", "CHANGES_REQUESTED"].includes(r.status) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => beginEdit(r)}
                            >
                              <Pencil size={12} /> Edit Draft
                            </Button>
                          )}

                          {r.status === "DRAFT" && (
                            <Button
                              size="sm"
                              onClick={() => void transition(r, "UNDER_REVIEW")}
                            >
                              Submit for Review
                            </Button>
                          )}

                          {["UNDER_REVIEW", "CHANGES_REQUESTED"].includes(r.status) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void transition(r, "CHANGES_REQUESTED")}
                              >
                                Request Changes
                              </Button>
                              <Button
                                size="sm"
                                className="bg-[var(--success)] hover:bg-emerald-700"
                                onClick={() => void transition(r, "CONFIRMED")}
                              >
                                <CheckCircle2 size={13} /> Confirm
                              </Button>
                            </>
                          )}

                          {r.status === "CONFIRMED" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void transition(r, "CHANGES_REQUESTED")}
                              >
                                Revise
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void exportRequirement(r)}
                              >
                                <Download size={13} /> Export Approved JSON
                              </Button>
                            </>
                          )}

                          {r.status !== "ARCHIVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void transition(r, "ARCHIVED")}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Revision History Accordion */}
                      {r.revisions.length > 0 && (
                        <details className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--secondary)]">
                          <summary className="cursor-pointer font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors select-none">
                            Revision History ({r.revisions.length} confirmed version{r.revisions.length === 1 ? "" : "s"})
                          </summary>
                          <ul className="mt-2.5 space-y-2 pl-2">
                            {r.revisions.map((v) => (
                              <li
                                key={v.id}
                                className="rounded-xl border border-[var(--border)] bg-white/60 p-2.5 text-xs text-[var(--secondary)]"
                              >
                                <span className="font-bold text-[var(--foreground)]">
                                  Version {v.version}
                                </span>{" "}
                                confirmed by {v.confirmedBy.name} on{" "}
                                {new Date(v.confirmedAt).toLocaleString()}
                                {v.changeReason && ` · Reason: ${v.changeReason}`}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMUNICATIONS */}
          {activeTab === "communications" && (
            <div className="animate-fade-in">
              <CommunicationsPanel
                clientId={id}
                requirements={hub.requirements}
              />
            </div>
          )}

          {/* TAB 4: FILES & REFERENCES */}
          {activeTab === "files" && (
            <div className="animate-fade-in">
              <AssetsPanel clientId={id} requirements={hub.requirements} />
            </div>
          )}

          {/* TAB 5: ACTIVITY TIMELINE */}
          {activeTab === "activity" && (
            <div className="animate-fade-in">
              <TimelinePanel clientId={id} />
            </div>
          )}

          {/* Edit Client Modal */}
          <Modal
            isOpen={clientEditing}
            onClose={() => setClientEditing(false)}
            title="Edit Client Organization Profile"
            description="Update company contact details. Unchanged legacy phone numbers will be preserved."
            maxWidth="2xl"
          >
            <ClientForm
              initial={{
                name: hub.client.name,
                primaryContactName: hub.client.primaryContactName ?? "",
                primaryEmail: hub.client.primaryEmail,
                primaryPhone: hub.client.primaryPhone,
                website: hub.client.website,
              }}
              submitLabel="Save Changes"
              onSubmit={submitClient}
              onCancel={() => setClientEditing(false)}
            />
          </Modal>
        </>
      ) : null}
    </AppShell>
  );
}
