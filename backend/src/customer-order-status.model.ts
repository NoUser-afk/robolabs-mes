import { pbkdf2Sync, randomBytes, randomInt, timingSafeEqual } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const HASH_PREFIX = 'pbkdf2_sha256';
const HASH_ITERATIONS = 120_000;

export type CustomerOperationStatus = 'new' | 'queued' | 'ready' | 'blocked' | 'work' | 'paused' | 'done' | 'canceled' | 'cancelled' | string;

export type CustomerOrderOperationInput = {
  operationCode?: string | null;
  operationId?: string | null;
  name?: string | null;
  section?: string | null;
  status?: CustomerOperationStatus | null;
  normHours?: number | null;
  sortOrder?: number | null;
  sequence?: number | null;
};

export type CustomerProductionUnitInput = {
  unitId?: string | null;
  unitNo?: number | null;
  status?: string | null;
  progress?: number | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  operations?: CustomerOrderOperationInput[];
};

export type CustomerProductionRunInput = {
  id?: string | null;
  archived?: boolean | null;
  testData?: boolean | null;
  orderId?: number | null;
  orderNumber?: string | null;
  productCode?: string | null;
  productName?: string | null;
  quantity?: number | null;
  launchedQuantity?: number | null;
  status?: string | null;
  progress?: number | null;
  units?: CustomerProductionUnitInput[];
  operations?: CustomerOrderOperationInput[];
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
};

export type CustomerOrderInput = {
  id: number | string;
  sourceType?: 'order' | 'production-run';
  unitId?: string | null;
  unitNo?: number | null;
  orderNumber: string;
  productCode: string;
  productName?: string | null;
  quantity: number;
  dueDate?: string | Date | null;
  updatedAt?: string | Date | null;
  operations?: CustomerOrderOperationInput[];
};

export type CustomerPhaseKey = 'ordered' | 'assembly' | 'final_preparation' | 'ready';

export type CustomerPhase = {
  key: CustomerPhaseKey;
  label: string;
  status: 'waiting' | 'in_work' | 'paused' | 'done';
};

export type CustomerPublicStage = {
  name: string;
  status: 'waiting' | 'in_work' | 'paused' | 'done';
};

export type CustomerOrderStatusCard = {
  order: {
    id: number | string;
    sourceType: 'order' | 'production-run';
    unitId: string | null;
    unitNo: number | null;
    orderNumber: string;
    productCode: string;
    productName: string | null;
    quantity: number;
    dueDate: string | null;
  };
  status: 'not_launched' | 'in_work' | 'paused' | 'completed';
  progress: number;
  quantities: {
    ordered: number;
    launched: number;
    ready: number;
    inWork: number;
    remaining: number;
  };
  currentStage: CustomerPublicStage | null;
  nextStage: CustomerPublicStage | null;
  currentPhase: CustomerPhaseKey;
  phaseFlow: CustomerPhase[];
  eta: {
    label: string;
    remainingNormHours: number;
    confidence: 'rough';
  };
  updatedAt: string;
  generatedAt: string;
};

export type CustomerOrderStatusResponse = {
  order: {
    orderNumber: string;
    positionsCount: number;
    totalQuantity: number;
    dueDate: string | null;
  };
  positions: CustomerOrderStatusCard[];
  updatedAt: string;
  generatedAt: string;
};

export function generateCustomerAccessCode() {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `${part()}-${part()}`;
}

export function hashCustomerAccessCode(accessCode: string, salt = randomBytes(16).toString('base64url')) {
  const normalized = normalizeAccessCode(accessCode);
  if (!normalized) throw new Error('Access code is required');
  const digest = pbkdf2Sync(normalized, salt, HASH_ITERATIONS, 32, 'sha256').toString('base64url');
  return `${HASH_PREFIX}$${HASH_ITERATIONS}$${salt}$${digest}`;
}

export function verifyCustomerAccessCode(accessCode: string, encodedHash: string) {
  const normalized = normalizeAccessCode(accessCode);
  const [kind, iterationsText, salt, digest] = String(encodedHash || '').split('$');
  const iterations = Number(iterationsText);
  if (!normalized || kind !== HASH_PREFIX || !Number.isFinite(iterations) || !salt || !digest) return false;
  const actual = pbkdf2Sync(normalized, salt, iterations, 32, 'sha256').toString('base64url');
  const expectedBuffer = Buffer.from(digest);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function normalizeAccessCode(accessCode: string) {
  return String(accessCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildCustomerOrderStatusCard(input: { order: CustomerOrderInput; runs: CustomerProductionRunInput[]; generatedAt?: Date }): CustomerOrderStatusCard {
  const generatedAt = input.generatedAt || new Date();
  const orderOperations = sortOperations(input.order.operations || []);
  const runs = input.runs.filter((run) => !run.archived && !run.testData);
  const runOperations = runs.flatMap((run) => productionRunOperations(run));
  const operations = runOperations.length ? runOperations : orderOperations;
  const launchedFromRuns = runs.reduce((sum, run) => sum + Number(run.launchedQuantity || run.units?.length || run.quantity || 0), 0);
  const launched = runs.length ? launchedFromRuns : orderOperations.some((op) => op.status === 'work' || op.status === 'paused' || op.status === 'done') ? input.order.quantity : 0;
  const readyFromRuns = runs.reduce((sum, run) => {
    if (run.units?.length) return sum + run.units.filter((unit) => unit.status === 'done').length;
    return sum + (run.status === 'done' ? Number(run.quantity || 0) : 0);
  }, 0);
  const ready = runs.length ? readyFromRuns : orderOperations.length && orderOperations.every((op) => op.status === 'done') ? input.order.quantity : 0;
  const progress = runs.length
    ? round1(average(runs.map((run) => Number(run.progress ?? progressFromOperations(productionRunOperations(run))))))
    : round1(progressFromOperations(orderOperations));
  const currentOperation = operations.find((op) => op.status === 'work')
    || operations.find((op) => op.status === 'paused')
    || operations.find((op) => op.status !== 'done')
    || null;
  const nextOperation = operations.find((op) => op.status !== 'done' && op !== currentOperation) || null;
  const remainingNormHours = round1(operations.filter((op) => op.status !== 'done').reduce((sum, op) => sum + Number(op.normHours || 0), 0));
  const completed = ready >= input.order.quantity || (operations.length > 0 && operations.every((op) => op.status === 'done'));
  const paused = operations.some((op) => op.status === 'paused');
  const status = completed ? 'completed' : !launched ? 'not_launched' : paused ? 'paused' : 'in_work';
  const phaseFlow = customerPhaseFlow({ currentOperation, launched, completed, paused });
  const currentPhase = phaseFlow.find((phase) => phase.status === 'in_work' || phase.status === 'paused')?.key
    || phaseFlow.find((phase) => phase.status === 'waiting')?.key
    || 'ready';
  const latest = latestTimestamp([
    input.order.updatedAt,
    ...runs.flatMap((run) => [run.updatedAt, run.createdAt, run.startedAt, run.completedAt]),
  ]) || generatedAt;

  return {
    order: {
      id: input.order.id,
      sourceType: input.order.sourceType || 'order',
      unitId: input.order.unitId || null,
      unitNo: input.order.unitNo || null,
      orderNumber: input.order.orderNumber,
      productCode: input.order.productCode,
      productName: input.order.productName || null,
      quantity: input.order.quantity,
      dueDate: toIsoDate(input.order.dueDate),
    },
    status,
    progress: completed ? 100 : Math.min(99.9, progress),
    quantities: {
      ordered: input.order.quantity,
      launched,
      ready: Math.min(ready, input.order.quantity),
      inWork: Math.max(0, launched - ready),
      remaining: Math.max(0, input.order.quantity - ready),
    },
    currentStage: currentOperation ? publicStage(currentOperation) : null,
    nextStage: nextOperation ? publicStage(nextOperation) : null,
    currentPhase,
    phaseFlow,
    eta: {
      label: etaLabel(status, remainingNormHours),
      remainingNormHours,
      confidence: 'rough' as const,
    },
    updatedAt: latest.toISOString(),
    generatedAt: generatedAt.toISOString(),
  };
}

export function buildCustomerOrderStatusResponse(input: { positions: CustomerOrderStatusCard[]; generatedAt?: Date }): CustomerOrderStatusResponse {
  const generatedAt = (input.generatedAt || new Date()).toISOString();
  const latest = latestTimestamp(input.positions.map((position) => position.updatedAt)) || new Date(generatedAt);
  const first = input.positions[0];
  return {
    order: {
      orderNumber: first?.order.orderNumber || '',
      positionsCount: input.positions.length,
      totalQuantity: input.positions.reduce((sum, position) => sum + Number(position.order.quantity || 0), 0),
      dueDate: earliestIsoDate(input.positions.map((position) => position.order.dueDate)),
    },
    positions: input.positions,
    updatedAt: latest.toISOString(),
    generatedAt,
  };
}

export function buildCustomerProductionRunStatusResponse(input: { run: CustomerProductionRunInput; generatedAt?: Date }): CustomerOrderStatusResponse {
  const generatedAt = input.generatedAt || new Date();
  const run = input.run;
  const orderNumber = run.orderNumber || run.id || 'RUN';
  const units = run.units || [];
  const positions = units.length
    ? units.map((unit) => buildCustomerOrderStatusCard({
      order: {
        id: `${run.id || orderNumber}:${unit.unitId || unit.unitNo || 'unit'}`,
        sourceType: 'production-run',
        unitId: unit.unitId || null,
        unitNo: unit.unitNo || null,
        orderNumber,
        productCode: run.productCode || '',
        productName: `${run.productName || run.productCode || 'Позиция'}${unit.unitNo ? ` · позиция ${unit.unitNo}` : ''}`,
        quantity: 1,
        updatedAt: latestTimestamp([unit.completedAt, unit.startedAt, run.updatedAt, run.createdAt]) || generatedAt,
        operations: unit.operations || [],
      },
      runs: [{
        ...run,
        quantity: 1,
        launchedQuantity: 1,
        units: [unit],
        operations: unit.operations || [],
      }],
      generatedAt,
    }))
    : [buildCustomerOrderStatusCard({
      order: {
        id: run.id || orderNumber,
        sourceType: 'production-run',
        unitId: null,
        unitNo: null,
        orderNumber,
        productCode: run.productCode || '',
        productName: run.productName || run.productCode || null,
        quantity: Number(run.launchedQuantity || run.quantity || 0),
        updatedAt: run.updatedAt || run.completedAt || run.startedAt || run.createdAt || generatedAt,
        operations: run.operations || [],
      },
      runs: [run],
      generatedAt,
    })];
  return buildCustomerOrderStatusResponse({ positions, generatedAt });
}

function productionRunOperations(run: CustomerProductionRunInput) {
  const unitOperations = run.units?.flatMap((unit) => unit.operations || []) || [];
  return sortOperations(unitOperations.length ? unitOperations : (run.operations || []));
}

function sortOperations(operations: CustomerOrderOperationInput[]) {
  return [...operations].sort((a, b) => Number(a.sequence ?? a.sortOrder ?? 0) - Number(b.sequence ?? b.sortOrder ?? 0));
}

function progressFromOperations(operations: CustomerOrderOperationInput[]) {
  const total = operations.reduce((sum, op) => sum + Number(op.normHours || 0), 0);
  const done = operations.filter((op) => op.status === 'done').reduce((sum, op) => sum + Number(op.normHours || 0), 0);
  return total ? (done / total) * 100 : 0;
}

function publicStage(op: CustomerOrderOperationInput): CustomerPublicStage {
  const text = `${op.name || ''} ${op.section || ''} ${op.operationCode || ''} ${op.operationId || ''}`.toLowerCase();
  const status = op.status === 'done' ? 'done' : op.status === 'work' ? 'in_work' : op.status === 'paused' ? 'paused' : 'waiting';
  return { name: publicStageName(text, op.section || op.name || 'Производственный этап'), status };
}

function publicStageName(text: string, fallback: string) {
  if (text.includes('диспетчер') || text.includes('dispatch') || text.includes('op10') || text.includes('оп10') || text.includes('ор10')) return 'Запуск в производство';
  if (text.includes('лазер') || text.includes('laser') || text.includes('cut') || text.includes('резк') || text.includes('заготов')) return 'Заготовка';
  if (text.includes('сбор') || text.includes('assembly')) return 'Сборка';
  if (text.includes('контрол') || text.includes('quality') || text.includes('qc') || text.includes('отк')) return 'Контроль качества';
  if (text.includes('упаков') || text.includes('отгруз') || text.includes('pack') || text.includes('ship')) return 'Подготовка к отгрузке';
  return fallback;
}

function customerPhaseFlow(input: {
  currentOperation: CustomerOrderOperationInput | null;
  launched: number;
  completed: boolean;
  paused: boolean;
}): CustomerPhase[] {
  const currentBucket = input.completed ? 'ready' : input.launched ? operationPhase(input.currentOperation) : 'ordered';
  return [
    { key: 'ordered', label: 'Заказано', status: input.launched || input.completed ? 'done' : input.paused ? 'paused' : 'in_work' },
    { key: 'assembly', label: 'Сборка', status: phaseStatus('assembly', currentBucket, input) },
    { key: 'final_preparation', label: 'Финальная подготовка', status: phaseStatus('final_preparation', currentBucket, input) },
    { key: 'ready', label: 'Готово', status: input.completed ? 'done' : 'waiting' },
  ];
}

function phaseStatus(key: CustomerPhaseKey, currentBucket: CustomerPhaseKey, input: { completed: boolean; paused: boolean }): CustomerPhase['status'] {
  if (input.completed) return 'done';
  if (currentBucket === key) return input.paused ? 'paused' : 'in_work';
  if (key === 'assembly' && currentBucket === 'final_preparation') return 'done';
  return 'waiting';
}

function operationPhase(op: CustomerOrderOperationInput | null): CustomerPhaseKey {
  if (!op) return 'assembly';
  const text = `${op.name || ''} ${op.section || ''} ${op.operationCode || ''} ${op.operationId || ''}`.toLowerCase();
  if (text.includes('quality') || text.includes('qc') || text.includes('pack') || text.includes('ship') || text.includes('отк') || text.includes('контрол') || text.includes('упаков') || text.includes('отгруз')) return 'final_preparation';
  return 'assembly';
}

function etaLabel(status: CustomerOrderStatusCard['status'], remainingNormHours: number) {
  if (status === 'completed') return 'Готово';
  if (status === 'not_launched') return 'Ориентир появится после запуска производства';
  if (remainingNormHours <= 0) return 'Ориентир уточняется';
  if (remainingNormHours <= 8) return 'примерно до 1 рабочего дня';
  if (remainingNormHours <= 24) return 'примерно 1-3 рабочих дня';
  if (remainingNormHours <= 40) return 'примерно 3-5 рабочих дней';
  return `примерно ${Math.ceil(remainingNormHours / 8)}+ рабочих дней`;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0;
}

function round1(value: number) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function toIsoDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function latestTimestamp(values: Array<string | Date | null | undefined>) {
  const dates = values
    .map((value) => value instanceof Date ? value : value ? new Date(value) : null)
    .filter((value): value is Date => Boolean(value) && !Number.isNaN(value.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

function earliestIsoDate(values: Array<string | Date | null | undefined>) {
  const dates = values
    .map((value) => value instanceof Date ? value : value ? new Date(value) : null)
    .filter((value): value is Date => Boolean(value) && !Number.isNaN(value.getTime()));
  return dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))).toISOString() : null;
}
