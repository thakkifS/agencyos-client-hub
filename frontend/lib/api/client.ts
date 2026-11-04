import type { ApiResponse, HealthData } from "@/lib/types/api";
export type { ActivityRecord, ClientAssetRecord, ClientRecord, CommunicationRecord, PageResult, RequirementItem, RequirementRecord } from "@/lib/types/client-hub";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";
export const apiEndpoint = (path: string) => `${apiBaseUrl}${path}`;

export async function getHealth(): Promise<HealthData> {
  const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" });
  const body = (await response.json()) as ApiResponse<HealthData>;
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "The API health check failed." : body.message);
  }
  return body.data;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isMultipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, cache: "no-store", headers: { ...(!isMultipart ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success) throw new Error(body.success ? `Request failed (${response.status})` : body.message);
  return body.data;
}
