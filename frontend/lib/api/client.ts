import type { ApiResponse, HealthData } from "@/lib/types/api";
export type {
  ActivityRecord,
  ClientAssetRecord,
  ClientRecord,
  CommunicationRecord,
  PageResult,
  RequirementItem,
  RequirementRecord,
} from "@/lib/types/client-hub";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  agencyId: string;
  agencyName: string;
  role?: string;
  permissions: string[];
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
};

export type LoginResponse = {
  user: AuthUser;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";
export const apiEndpoint = (path: string) => `${apiBaseUrl}${path}`;

export async function getHealth(): Promise<HealthData> {
  const response = await fetch(`${apiBaseUrl}/health`, {
    cache: "no-store",
    credentials: "include",
  });
  const body = (await response.json()) as ApiResponse<HealthData>;
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "The API health check failed." : body.message);
  }
  return body.data;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isMultipart =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include", // Required for HttpOnly session cookie
    headers: {
      ...(!isMultipart ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success) {
    throw new Error(
      body.success ? `Request failed (${response.status})` : body.message
    );
  }
  return body.data;
}

// Authentication API Helpers
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiSignup(input: { name: string; email: string; agencyName: string; password: string }): Promise<LoginResponse> {
  return await apiRequest<LoginResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiLogout(): Promise<{ success: boolean; message: string }> {
  return await apiRequest<{ success: boolean; message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function apiGetMe(): Promise<{ user: AuthUser }> {
  return await apiRequest<{ user: AuthUser }>("/auth/me");
}

export async function apiGetGoogleAuthUrl(): Promise<{
  configured: boolean;
  url?: string;
  message?: string;
}> {
  return await apiRequest<{ configured: boolean; url?: string; message?: string }>(
    "/auth/google"
  );
}
