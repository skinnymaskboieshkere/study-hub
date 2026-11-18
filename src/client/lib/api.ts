/** Error with the message the server sends as `{ error: "…" }` (already in Russian). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Сервер Study Hub не отвечает. Проверь, что он запущен (npm run dev).", 0);
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Ошибка сервера (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
  delete: (url: string) => request<void>("DELETE", url),
};

/**
 * Last-chance save when the tab closes (SPEC §9.1): sendBeacon survives page unload,
 * a normal fetch may not.
 */
export function beacon(url: string, body: unknown) {
  const payload = new Blob([JSON.stringify(body)], { type: "application/json" });
  if (!navigator.sendBeacon?.(url, payload)) {
    void fetch(url, { method: "POST", body: payload, keepalive: true }).catch(() => undefined);
  }
}
