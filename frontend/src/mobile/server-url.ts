import { withTerminalAppMarker } from './terminal-app-mode';

export const SERVER_URL_STORAGE_KEY = 'robopulse:terminal-app:server-url';
export const SERVER_SETUP_MARKER = 'terminal-setup';
export const DEFAULT_SERVER_URL = 'https://172.17.16.254:8443';

export type ServerUrlValidation =
  | { ok: true; url: string }
  | { ok: false; message: string };

export function readStoredServerUrl() {
  return window.localStorage.getItem(SERVER_URL_STORAGE_KEY) || DEFAULT_SERVER_URL;
}

export function clearStoredServerUrl() {
  window.localStorage.removeItem(SERVER_URL_STORAGE_KEY);
}

export function saveStoredServerUrl(url: string) {
  window.localStorage.setItem(SERVER_URL_STORAGE_KEY, url);
}

export function hasServerSetupMarker() {
  const params = new URLSearchParams(window.location.search);
  return params.get(SERVER_SETUP_MARKER) === '1' || params.get('changeServer') === '1';
}

export function validateAndNormalizeServerUrl(input: string): ServerUrlValidation {
  const raw = input.trim();
  if (!raw) return { ok: false, message: 'Введите HTTPS-адрес сервера RoboPulse' };
  if (/^(javascript|file|data):/i.test(raw)) return { ok: false, message: 'Этот тип адреса нельзя использовать как сервер RoboPulse' };

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, message: 'Адрес сервера не распознан' };
  }

  if (url.protocol !== 'https:') return { ok: false, message: 'Для Android-приложения укажите HTTPS-адрес сервера' };
  if (!url.hostname) return { ok: false, message: 'В адресе сервера не найден host' };
  if (url.username || url.password) return { ok: false, message: 'Адрес сервера не должен содержать логин или пароль' };

  return { ok: true, url: url.origin };
}

export function redirectToTerminalServer(serverUrl: string) {
  window.location.replace(withTerminalAppMarker(serverUrl));
}

export function openTerminalServerSetup() {
  const url = new URL('https://localhost/');
  url.searchParams.set(SERVER_SETUP_MARKER, '1');
  window.location.assign(url.toString());
}
