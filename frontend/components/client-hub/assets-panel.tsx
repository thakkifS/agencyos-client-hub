"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileCode,
  FileIcon,
  FileText,
  FolderOpen,
  ImageIcon,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  apiEndpoint,
  apiRequest,
  type ClientAssetRecord,
  type PageResult,
  type RequirementRecord,
} from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export function AssetsPanel({
  clientId,
  requirements,
}: {
  clientId: string;
  requirements: RequirementRecord[];
}) {
  const [assets, setAssets] = useState<ClientAssetRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form states
  const [requirementId, setRequirementId] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          page: String(nextPage),
          limit: "10",
        });
        if (filter) query.set("type", filter);
        const result = await apiRequest<PageResult<ClientAssetRecord>>(
          `/clients/${clientId}/assets?${query}`
        );
        setAssets(result.items);
        setPages(result.pagination.pages);
        setPage(nextPage);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load files and references"
        );
      } finally {
        setLoading(false);
      }
    },
    [clientId, filter]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function closeForms() {
    setUploadModalOpen(false);
    setRefModalOpen(false);
    setRequirementId("");
    setLabel("");
    setUrl("");
    setFile(null);
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (requirementId) form.append("requirementId", requirementId);
      if (label) form.append("label", label);
      await apiRequest(`/clients/${clientId}/files`, {
        method: "POST",
        body: form,
      });
      setSuccess("File uploaded securely to private storage.");
      closeForms();
      await load(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "File upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddReference(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/clients/${clientId}/references`, {
        method: "POST",
        body: JSON.stringify({
          label,
          url,
          requirementId: requirementId || undefined,
        }),
      });
      setSuccess("External reference URL saved.");
      closeForms();
      await load(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add reference");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(asset: ClientAssetRecord) {
    if (
      !window.confirm(
        `Remove "${asset.label}" from workspace? This soft-deletes the record while preserving audit compliance.`
      )
    )
      return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/assets/${asset.id}`, { method: "DELETE" });
      setSuccess("Item removed from active workspace.");
      await load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  }

  const getFileIcon = (asset: ClientAssetRecord) => {
    if (asset.type === "REFERENCE") return <Link2 size={16} className="text-blue-600" />;
    const mime = asset.mimeType || "";
    if (mime.includes("image")) return <ImageIcon size={16} className="text-emerald-600" />;
    if (mime.includes("pdf")) return <FileText size={16} className="text-red-600" />;
    return <FileIcon size={16} className="text-slate-600" />;
  };

  return (
    <section id="files" className="glass-panel rounded-2xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5 bg-white/50">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Files & External References
          </h2>
          <p className="mt-0.5 text-xs text-[var(--secondary)]">
            Private authorized storage (PDF, PNG, JPG, WebP &le; 10 MB) and client links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setRefModalOpen(true)}>
            <Link2 size={14} /> Add Reference
          </Button>
          <Button size="sm" onClick={() => setUploadModalOpen(true)}>
            <Upload size={14} /> Upload File
          </Button>
        </div>
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

      {/* Filter toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/60 px-5 py-3 text-xs text-[var(--secondary)]">
        <span>Authorized file downloads stream safely with verified MIME signatures.</span>
        <label className="flex items-center gap-2 font-medium">
          Filter:
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
          >
            <option value="">All Materials</option>
            <option value="FILE">Files Only</option>
            <option value="REFERENCE">References Only</option>
          </select>
        </label>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--secondary)]">
          <RefreshCw size={20} className="mx-auto text-blue-500 animate-spin mb-2" />
          Loading workspace assets…
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--secondary)]">
          <FolderOpen size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-[var(--foreground)]">No files or references found</p>
          <p className="mt-1">Upload client specification docs or link Figma / GitHub resources.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {assets.map((asset) => (
            <article
              key={asset.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white shadow-xs mt-0.5">
                  {getFileIcon(asset)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={asset.type === "FILE" ? "primary" : "neutral"} className="text-[10px]">
                      {asset.type === "FILE" ? "File" : "Link"}
                    </Badge>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">
                      {asset.label}
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-[var(--secondary)] truncate">
                    {asset.originalName || asset.externalUrl}
                    {asset.fileSize
                      ? ` · ${(asset.fileSize / 1024 / 1024).toFixed(2)} MB`
                      : ""}
                  </p>

                  <p className="mt-1 text-[11px] text-[var(--secondary)]">
                    Added by {asset.uploadedBy.name} on{" "}
                    {new Date(asset.uploadedAt).toLocaleDateString()}
                    {asset.requirement
                      ? ` · Requirement: ${asset.requirement.title}`
                      : " · Client-level asset"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2 sm:self-center">
                {asset.type === "FILE" && (
                  <a
                    href={apiEndpoint(`/assets/${asset.id}/download`)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-blue-50 transition-colors shadow-xs"
                  >
                    <Download size={13} /> Download
                  </a>
                )}
                {asset.externalUrl && (
                  <a
                    href={asset.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-blue-50 transition-colors shadow-xs"
                  >
                    <ExternalLink size={13} /> Open
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void handleRemove(asset)}
                  aria-label={`Remove ${asset.label}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--error)] hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
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

      {/* Upload File Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={closeForms}
        title="Upload Client File"
        description="Files are stored securely with verified signatures. Supported: PDF, JPEG, PNG, WebP up to 10 MB."
        maxWidth="lg"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Select File <span className="text-[var(--error)]">*</span>
            <input
              required
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-white p-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Display Label (Optional)
            <input
              maxLength={200}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. SOW Signed Agreement"
              className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Link to Requirement (Optional)
            <select
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
              className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            >
              <option value="">Client-level material</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={closeForms}>
              Cancel
            </Button>
            <Button disabled={busy || !file} type="submit">
              {busy ? "Uploading…" : "Upload File"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Reference Modal */}
      <Modal
        isOpen={refModalOpen}
        onClose={closeForms}
        title="Add External Reference Link"
        description="Save external documentation, design links, or shared repository URLs."
        maxWidth="lg"
      >
        <form onSubmit={handleAddReference} className="space-y-4">
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Reference Label <span className="text-[var(--error)]">*</span>
            <input
              required
              maxLength={200}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Figma Design System"
              className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            HTTPS / HTTP URL <span className="text-[var(--error)]">*</span>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://figma.com/file/..."
              className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Link to Requirement (Optional)
            <select
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
              className="mt-1.5 block h-10 w-full rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            >
              <option value="">Client-level material</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={closeForms}>
              Cancel
            </Button>
            <Button disabled={busy || !label || !url} type="submit">
              {busy ? "Saving…" : "Save Reference"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default AssetsPanel;
