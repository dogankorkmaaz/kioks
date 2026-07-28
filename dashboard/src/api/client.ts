// In dev, Vite proxies /api to the backend (see vite.config.ts) so cookies stay same-origin.
// In production this SPA is served by the same Express app, so relative paths already work.
const BASE_URL = "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      // Only stamp JSON content-type for string bodies (our JSON.stringify calls) —
      // a FormData body must keep the browser's own multipart boundary header.
      ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // FormData sets its own multipart boundary Content-Type — must not be overridden with JSON.
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
};
