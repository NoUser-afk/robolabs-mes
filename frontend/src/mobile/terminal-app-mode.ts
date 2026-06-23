import { isNativeCapacitor } from './capacitor';

const TERMINAL_APP_MODE_KEY = 'robopulse:terminal-app:mode';
const TERMINAL_APP_MARKER = 'terminal-app';

function hasUrlMarker() {
  const params = new URLSearchParams(window.location.search);
  return params.get(TERMINAL_APP_MARKER) === '1' || params.get('terminalApp') === '1' || params.get('robopulseTerminalApp') === '1';
}

export function rememberTerminalAppModeFromUrl() {
  if (hasUrlMarker()) window.localStorage.setItem(TERMINAL_APP_MODE_KEY, '1');
}

export function isTerminalAppMode() {
  return isNativeCapacitor() || hasUrlMarker() || window.localStorage.getItem(TERMINAL_APP_MODE_KEY) === '1';
}

export function withTerminalAppMarker(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.set(TERMINAL_APP_MARKER, '1');
  return url.toString();
}
