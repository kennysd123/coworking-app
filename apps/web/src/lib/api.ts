const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
    } catch { /* noop */ }
    throw new ApiError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Fábrica autenticada ────────────────────────────────────────────────────

export function makeApi(token: string | null) {
  const get = <T>(path: string) => apiFetch<T>(path, { method: 'GET' }, token);
  const post = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
  const patch = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token);

  return { get, post, patch };
}

// ── API pública (sin auth) ─────────────────────────────────────────────────

export const publicApi = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (body: { email: string; password: string; nombre: string; role: string }) =>
    apiFetch<{ id: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
