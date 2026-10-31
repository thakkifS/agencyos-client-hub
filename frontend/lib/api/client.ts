import type { ApiResponse, HealthData } from "@/lib/types/api";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

export async function getHealth(): Promise<HealthData> {
  const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" });
  const body = (await response.json()) as ApiResponse<HealthData>;
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "The API health check failed." : body.message);
  }
  return body.data;
}

export type ClientRecord = { id: string; name: string; primaryContactName: string | null; primaryEmail: string | null; primaryPhone: string | null; website: string | null; status: string; updatedAt: string; _count?: { requirements: number; projects: number } };
export type PageResult<T> = { items: T[]; pagination: { page: number; limit: number; total: number; pages: number } };
export type RequirementItem = { id: string; title: string; description: string | null; category: string | null; priority: string; notes: string | null; sortOrder: number };
export type RequirementRecord = { id: string; clientId: string; title: string; businessObjective: string; requestedServices: string[]; designPreferences: string | null; referenceLinks: string[]; budgetMin: string | null; budgetMax: string | null; currency: string | null; expectedTimeline: string | null; targetDate: string | null; constraints: string | null; assumptions: string | null; additionalNotes: string | null; status: string; updatedAt: string; confirmedAt: string | null; preparedBy: { id: string; name: string }; confirmedBy: { id: string; name: string } | null; items: RequirementItem[]; revisions: Array<{ id: string; version: number; changeReason: string | null; confirmedAt: string; confirmedBy: { id: string; name: string } }> };

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success) throw new Error(body.success ? `Request failed (${response.status})` : body.message);
  return body.data;
}
