import type { AuthUser } from '../api/types';

export const MAIN_TABS = ['dispatch', 'terminal', 'director'] as const;
export const ADDITIONAL_TABS = ['process-graph', 'nomenclature', 'reference-sections', 'reference-operations', 'shifts-kpi', 'production', 'import', 'orders', 'people', 'archive'] as const;
const LAST_TAB_STORAGE_PREFIX = 'mes:last-tab';
const ALL_TABS = [...MAIN_TABS, ...ADDITIONAL_TABS, 'order-card', 'production-run-card', 'nomenclature-card'] as const;

export function label(tab: string) {
  if (tab === 'shifts-kpi') return 'Смены и KPI';
  return ({
    dispatch: 'План производства',
    terminal: 'Терминал участка',
    director: 'Директор',
    'process-graph': 'Граф процесса',
    nomenclature: 'Номенклатура',
    'reference-sections': 'Справочник участков',
    'reference-operations': 'Справочник операций',
    production: 'Партии',
    import: 'Импорт Excel',
    orders: 'Заказы',
    people: 'Исполнители',
    archive: 'Архив',
  } as Record<string, string>)[tab];
}

function lastTabStorageKey(user?: AuthUser | null) {
  return `${LAST_TAB_STORAGE_PREFIX}:${user?.id || user?.role || 'anonymous'}`;
}

function defaultTabForRole(user?: AuthUser | null) {
  if (!user) return 'dispatch';
  if (user.isTerminalOnly || user.role === 'terminal' || user.role === 'operator') return 'terminal';
  if (user.role === 'director') return 'director';
  if (user.role === 'technologist') return 'nomenclature';
  return 'dispatch';
}

export function readSavedTab(user?: AuthUser | null) {
  const savedTab = window.localStorage.getItem(lastTabStorageKey(user));
  return isKnownTab(savedTab) ? savedTab : defaultTabForRole(user);
}

export function saveTab(tab: string, user?: AuthUser | null) {
  if (isKnownTab(tab)) window.localStorage.setItem(lastTabStorageKey(user), tab);
}

function isKnownTab(tab: string | null): tab is string {
  return Boolean(tab && (ALL_TABS as readonly string[]).includes(tab));
}

export function resolveAvailableTab(tab: string, user: AuthUser) {
  if (isKnownTab(tab) && canOpenTab(user, tab)) return tab;
  const preferred = defaultTabForRole(user);
  if (canOpenTab(user, preferred)) return preferred;
  if (canOpenTab(user, 'director')) return 'director';
  if (canOpenTab(user, 'nomenclature')) return 'nomenclature';
  if (canOpenTab(user, 'dispatch')) return 'dispatch';
  if (canOpenTab(user, 'terminal')) return 'terminal';
  return 'dispatch';
}

export function canOpenTab(user: AuthUser, tab: string) {
  const role = user.role;
  if (role === 'admin') return true;
  if (tab === 'director') return role === 'director';
  if (tab === 'terminal') return role === 'operator' || role === 'dispatcher';
  if (tab === 'dispatch') return role === 'dispatcher' || role === 'director';
  if (tab === 'process-graph') return role === 'technologist' || role === 'dispatcher';
  if (tab === 'nomenclature' || tab === 'nomenclature-card') return role === 'technologist' || role === 'dispatcher';
  if (['reference-sections', 'reference-operations'].includes(tab)) return role === 'technologist' || role === 'dispatcher';
  if (['production', 'import', 'orders', 'archive', 'shifts-kpi'].includes(tab)) return role === 'dispatcher';
  if (tab === 'people') return false;
  return false;
}
