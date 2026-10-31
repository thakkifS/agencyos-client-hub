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
