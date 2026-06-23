export const CANONICAL_OPERATION_STATUSES = ['queued', 'ready', 'blocked', 'work', 'paused', 'done', 'cancelled'] as const;
export type CanonicalOperationStatus = typeof CANONICAL_OPERATION_STATUSES[number];

export type LifecycleStatus = 'new' | 'queued' | 'work' | 'paused' | 'done' | 'canceled' | 'cancelled';
export type ProductionOperationStatus = 'queued' | 'work' | 'paused' | 'done';
export type ProductionOperationAction = 'start' | 'pause' | 'resume' | 'complete';

export const PRODUCTION_OPERATION_ACTIONS = ['start', 'pause', 'resume', 'complete'] as const;

type TransitionResult =
  | { ok: true; nextStatus: ProductionOperationStatus; noop?: boolean }
  | { ok: false; reason: string; conflict?: boolean };

export function canonicalOrderOperationStatus(op: { status?: string | null; lifecycleStatus?: string | null }): CanonicalOperationStatus {
  const lifecycle = op.lifecycleStatus || op.status || 'new';
  if (lifecycle === 'done' || op.status === 'done') return 'done';
  if (lifecycle === 'paused') return 'paused';
  if (lifecycle === 'work' || op.status === 'work') return 'work';
  if (lifecycle === 'canceled' || lifecycle === 'cancelled') return 'cancelled';
  return 'queued';
}

export function canonicalProductionOperationStatus(op: { status?: string | null; canStart?: boolean; blockedBy?: unknown[] }): CanonicalOperationStatus {
  if (op.status === 'done') return 'done';
  if (op.status === 'work') return 'work';
  if (op.status === 'paused') return 'paused';
  if (op.status === 'canceled' || op.status === 'cancelled') return 'cancelled';
  if (op.canStart === false || (op.blockedBy || []).length > 0) return 'blocked';
  if (op.canStart === true) return 'ready';
  return 'queued';
}

export function productionOperationTransition(currentStatus: string, action: ProductionOperationAction, options: { canStart?: boolean; blockedBy?: string[]; lockedBy?: string | null } = {}): TransitionResult {
  if (action === 'start') {
    if (currentStatus === 'done') return { ok: false, reason: 'Операция уже завершена' };
    if (currentStatus === 'work') return { ok: false, reason: `Операция уже в работе${options.lockedBy ? `: ${options.lockedBy}` : ''}`, conflict: true };
    if (currentStatus === 'paused') return { ok: false, reason: 'Операция на паузе. Используйте возобновление, а не повторный старт.' };
    if (options.canStart === false) {
      const blockedBy = options.blockedBy?.length ? options.blockedBy.join(', ') : 'предшествующие операции';
      return { ok: false, reason: `Операция ожидает предшествующие: ${blockedBy}`, conflict: true };
    }
    return { ok: true, nextStatus: 'work' };
  }
  if (action === 'pause') {
    if (currentStatus !== 'work') return { ok: false, reason: 'Пауза доступна только для операции в работе' };
    return { ok: true, nextStatus: 'paused' };
  }
  if (action === 'resume') {
    if (currentStatus !== 'paused') return { ok: false, reason: 'Возобновление доступно только для операции на паузе' };
    return { ok: true, nextStatus: 'work' };
  }
  if (action === 'complete') {
    if (currentStatus === 'done') return { ok: true, nextStatus: 'done', noop: true };
    if (currentStatus !== 'work' && currentStatus !== 'paused') return { ok: false, reason: 'Операцию нельзя завершить без старта', conflict: true };
    return { ok: true, nextStatus: 'done' };
  }
  return { ok: false, reason: 'Неизвестное действие операции' };
}

export function orderOperationTransition(currentStatus: LifecycleStatus, nextStatus: LifecycleStatus): { ok: true } | { ok: false; reason: string; conflict?: boolean } {
  if (nextStatus === 'new') return { ok: true };
  if (nextStatus === 'work') {
    if (currentStatus === 'done') return { ok: false, reason: 'Завершенную операцию можно вернуть только через сброс', conflict: true };
    if (currentStatus === 'canceled' || currentStatus === 'cancelled') return { ok: false, reason: 'Отмененную операцию нельзя взять в работу', conflict: true };
    return { ok: true };
  }
  if (nextStatus === 'paused') {
    if (currentStatus !== 'work') return { ok: false, reason: 'Пауза доступна только для операции в работе' };
    return { ok: true };
  }
  if (nextStatus === 'done') {
    if (currentStatus !== 'work' && currentStatus !== 'paused') return { ok: false, reason: 'Операцию нельзя завершить без старта', conflict: true };
    return { ok: true };
  }
  if (nextStatus === 'canceled' || nextStatus === 'cancelled') return { ok: true };
  return { ok: false, reason: `Недопустимый статус операции: ${nextStatus}` };
}

export function productionEventTypeFromTransition(previous: string, next: string) {
  if (next === 'work' && previous === 'paused') return 'resume';
  if (next === 'work') return 'start';
  if (next === 'paused') return 'pause';
  if (next === 'done') return 'complete';
  if (next === 'canceled' || next === 'cancelled') return 'cancel';
  if (next === 'rework') return 'rework';
  return null;
}
