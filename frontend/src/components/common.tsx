import type { ReactNode } from 'react';
import type { DirectorDashboardData, Operation, Order, ProductionOperation, ProductionRun, SectionLoad } from '../api/types';

export function Kpi({ title, value, tone }: { title: string; value: ReactNode; tone?: string }) {
  return <section className={`card kpi ${tone || ''}`}><div>{title}</div><b>{value}</b></section>;
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function RoleBanner({ role, note }: { role: string; note: string }) {
  return <div className="role-banner"><b>{role}</b><span>{note}</span></div>;
}

const OPERATION_STATUS_UI: Record<string, { label: string; className: string }> = {
  new: { label: 'новая', className: 'new' },
  queued: { label: 'очередь', className: 'queued' },
  ready: { label: 'готова', className: 'ready' },
  blocked: { label: 'ожидает', className: 'blocked' },
  work: { label: 'в работе', className: 'work' },
  paused: { label: 'пауза', className: 'paused' },
  done: { label: 'готово', className: 'done' },
  canceled: { label: 'отменена', className: 'cancelled' },
  cancelled: { label: 'отменена', className: 'cancelled' },
};

function operationStatusMeta(status?: string | null) {
  return OPERATION_STATUS_UI[status || 'new'] || { label: status || 'новая', className: status || 'new' };
}

export function statusLabel(status?: string | null) {
  return operationStatusMeta(status).label;
}

export function statusClass(status?: string | null) {
  return operationStatusMeta(status).className;
}

export function runStatusLabel(status: ProductionRun['status']) {
  return ({ draft: 'черновик', work: 'в работе', paused: 'пауза', done: 'готово' } as Record<ProductionRun['status'], string>)[status] || status;
}

export function priorityLabel(priority?: string) {
  return ({ high: 'Высокий', normal: 'Обычный', low: 'Низкий' } as Record<string, string>)[priority || 'normal'] || 'Обычный';
}

export function isTechnicalRunId(value?: string | null) {
  return Boolean(value && /^RUN-[A-Z0-9-]+$/i.test(value));
}

export function isTechnicalOperationCode(value?: string | null) {
  return Boolean(value && /^ОР-\d+$/i.test(value));
}

export function displayOrderNumber(value?: string | null) {
  return value && !isTechnicalRunId(value) ? value : 'номер не указан';
}

function simpleBatchCode(value?: string | null, orderNumber?: string | null, orderBatchNo?: number | null) {
  if (orderNumber && orderBatchNo) return `${orderNumber}-${orderBatchNo}`;
  if (!value) return '';
  const legacy = value.match(/^(.+)-\d{4}-P0*(\d+)$/i);
  return legacy ? `${legacy[1]}-${Number(legacy[2])}` : value;
}

export function displayRunTitle(run: Pick<ProductionRun, 'orderNumber' | 'orderBatchCode' | 'orderBatchNo' | 'batchNumber' | 'batchName' | 'createdAt'>) {
  const batchCode = simpleBatchCode(run.orderBatchCode || run.batchNumber, run.orderNumber, run.orderBatchNo);
  if (batchCode && !isTechnicalRunId(batchCode)) return batchCode;
  if (run.orderNumber) return run.orderNumber;
  if (run.batchName) return run.batchName;
  return run.createdAt ? `Партия от ${date(run.createdAt)}` : 'ручной запуск';
}

export function displayOperationBatch(op?: Pick<Operation, 'sourceType' | 'orderBatchCode' | 'orderNumber' | 'displayId'> | null) {
  if (!op) return 'номер не указан';
  if (op.sourceType === 'production-run') return simpleBatchCode(op.orderBatchCode || op.displayId, op.orderNumber) || displayOrderNumber(op.orderNumber || op.displayId);
  return displayOrderNumber(op.orderNumber || op.displayId);
}

export function displayOperationTitle(op?: Pick<Operation, 'operation' | 'name' | 'operationCode' | 'operationId'> | Pick<ProductionOperation, 'name' | 'operationId'> | null) {
  if (!op) return 'операция не определена';
  const name = 'operation' in op ? op.operation || op.name : op.name;
  if (name) return name;
  const code = 'operationCode' in op ? op.operationCode : op.operationId;
  return isTechnicalOperationCode(code) ? 'операция без названия' : code || 'операция не определена';
}

export function displayOperationDetail(op?: Pick<Operation, 'operationCode' | 'operationId' | 'name' | 'operation'> | Pick<ProductionOperation, 'operationId' | 'name'> | null) {
  if (!op) return '';
  const code = 'operationCode' in op ? op.operationCode || op.operationId : op.operationId;
  const title = displayOperationTitle(op);
  return code && !isTechnicalOperationCode(code) && code !== title ? `${code} · ${title}` : title;
}

export function displayBlockedBy(items?: Array<string | Pick<ProductionOperation, 'name' | 'operationId' | 'section'>> | null) {
  if (!items?.length) return '';
  const labels = items.slice(0, 2).map(item => {
    if (typeof item === 'string') return isTechnicalOperationCode(item) ? 'предыдущая операция' : item;
    const title = displayOperationTitle(item);
    return item.section ? `${title} · ${item.section}` : title;
  });
  const rest = items.length > labels.length ? ` +${items.length - labels.length}` : '';
  return `${labels.join(', ')}${rest}`;
}

export function technicalDetailsLabel(value?: string | null) {
  return value ? `Технический ID: ${value}` : '';
}

export function hours(value?: number) {
  return `${Number(value || 0).toFixed(1)} ч`;
}

export function loadSummary(loads: SectionLoad[]) {
  if (!loads.length) return 'Нет данных по загрузке';
  const avg = Math.round(loads.reduce((sum, load) => sum + load.loadPct, 0) / loads.length);
  return `${loads.length} участков · средняя загрузка ${avg}%`;
}

export function freeHours(load: SectionLoad) {
  return load.freeHours ?? Math.max(0, load.availableHours - load.remainingHours);
}

export function loadResourceLabel(load: SectionLoad) {
  return `загрузка ${hours(load.remainingHours)} · свободно ${hours(freeHours(load))} из ${hours(load.availableHours)}`;
}

export function loadShortLabel(load: SectionLoad) {
  return `свободно ${hours(freeHours(load))} · занято ${hours(load.remainingHours)} из ${hours(load.availableHours)}`;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="page-title"><h1>{title}</h1><p>{subtitle}</p></div>;
}

export function LoadBars({ loads }: { loads: SectionLoad[] }) {
  if (!loads.length) return <Empty text="Нет данных по загрузке участков" />;
  return <div className="load-list">{loads.map(load=><div key={load.section} className="load-row"><div><b>{load.section}</b><span>{loadResourceLabel(load)}</span></div><div className="bar big"><i style={{width:`${Math.min(load.loadPct, 160)}%`}} /></div><strong className={load.loadPct>100?'text-danger':''}>{load.loadPct}%</strong></div>)}</div>;
}

export function OrderProgress({ rows }: { rows: Array<Order & { sourceType?: string; displayId?: string; isWithoutOrder?: boolean }> }) {
  if (!rows.length) return <Empty text="Заказы и запуски отсутствуют" />;
  return <div className="order-progress">{rows.map(order=><div key={`${order.sourceType || 'order'}-${order.id}`}><span>{order.displayId || order.orderNumber}{order.isWithoutOrder ? ' · номер не указан' : ''}</span><div className="bar"><i style={{width:`${order.progress}%`}} /></div><b>{order.progress}%</b></div>)}</div>;
}

export function MiniChart({ rows }: { rows: Array<{ date: string; completed: number }> }) {
  if (!rows.length) return <Empty text="Нет завершенных операций для графика" />;
  const max = Math.max(...rows.map(row=>row.completed), 1);
  return <div className="mini-chart">{rows.map(row=><div key={row.date}><i style={{height:`${Math.max(10, row.completed / max * 100)}%`}} /><span>{new Date(row.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span><b>{row.completed}</b></div>)}</div>;
}

export function Quality({ quality }: { quality?: DirectorDashboardData['quality'] }) {
  return <div className="quality"><b>{quality ? `${quality.defectRatePct}%` : '0%'}</b><span>Брак / замечания</span><div className="quality-grid"><div><small>Проверено</small><strong>{quality?.checked || 0}</strong></div><div><small>Принято</small><strong>{quality?.accepted || 0}</strong></div><div><small>Брак</small><strong>{quality?.defect || 0}</strong></div></div><p>{quality?.note || 'Записей качества пока нет; будет использован fallback по завершенным операциям.'}</p></div>;
}

export function date(value?: string) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : 'не указан';
}

export function dateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('ru-RU') : 'не указан';
}

export function durationLabel(minutes?: number, valueHours?: number) {
  const total = Math.max(0, Number(minutes || 0));
  if (total >= 60) return `${hours(valueHours ?? total / 60)} (${total} мин)`;
  return `${total} мин`;
}
