export const API = import.meta.env.VITE_API_URL || '/api';

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // Keep the original HTTP status when the backend does not return JSON.
    }
    throw new Error(apiErrorMessage(payload, `Ошибка API ${res.status}`));
  }
  return res.json();
}

export function apiErrorMessage(payload: any, fallback: string) {
  const message = Array.isArray(payload?.message) ? payload.message.join('; ') : payload?.message;
  return message || payload?.error || fallback;
}
