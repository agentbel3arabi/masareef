import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    page_size: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
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

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const error: ApiError = await res.json();
      message = error.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const error: ApiError = await res.json();
      message = error.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const error: ApiError = await res.json();
      message = error.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok && res.status !== 204) {
    let message = `API error: ${res.status}`;
    try {
      const error: ApiError = await res.json();
      message = error.error?.message || message;
    } catch {}
    throw new Error(message);
  }
}
