import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown[];
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    page_size: number;
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function handleError(res: Response): Promise<never> {
  let body: ApiErrorBody = { code: "UNKNOWN_ERROR", message: `API error: ${res.status}` };
  try {
    const json = await res.json();
    if (json?.error) body = json.error;
    else if (json?.detail?.error) body = json.detail.error;
  } catch {
    // intentional: non-JSON error responses fall back to UNKNOWN_ERROR body
  }
  throw new ApiError(res.status, body);
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) await handleError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) await handleError(res);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
  if (!res.ok && res.status !== 204) await handleError(res);
}

/**
 * Post multipart/form-data (for file uploads).
 * Does NOT set Content-Type — browser sets it automatically with boundary.
 */
export async function apiUploadForm<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) await handleError(res);
  return res.json();
}
