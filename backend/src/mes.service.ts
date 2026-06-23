import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationStatus, Prisma } from '@prisma/client';
import { pbkdf2Sync, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import * as XLSX from 'xlsx';
import productsProcesses from './data/products-processes.json';
import { AuthUser } from './auth.types';
import { isBulkGroupAllowedProductionOperation, isGroupCapableEntity } from './bulk-operation.model';
import { LifecycleStatus, ProductionOperationStatus, orderOperationTransition, productionEventTypeFromTransition, productionOperationTransition } from './operation-status.model';
import { PrismaService } from './prisma.service';

type ExcelRow = Record<string, unknown>;
type TimeRow = { kind: string; startedAt: Date; endedAt: Date | null; durationMinutes: number | null };
type ProductionRunStatus = 'draft' | 'work' | 'paused' | 'done';
type ProductionPriority = 'high' | 'normal' | 'low';
type ProductionDependencyStatus = 'available' | 'blocked' | 'in_work' | 'done';
type ProcessGraphPhase = 'done' | 'current' | 'ready' | 'blocked' | 'upcoming';
const DEFAULT_SECTION_AVAILABLE_HOURS = 160;
const TERMINAL_SELECTION_TTL_MS = 45_000;
const REMOVED_REFERENCE_OPERATION_CODES = new Set(['ОР-00031']);
const SERIALIZABLE_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10000,
  timeout: 30000,
} as const;
type ProductionOperation = {
  id: string;
  operationId: string;
  sequence: number;
  level?: number;
  partOrAssembly: string;
  name: string;
  section: string;
  previousOperationCodes: string[];
  nextOperationCodes: string[];
  normHours: number;
  status: ProductionOperationStatus;
  priority?: ProductionPriority;
  priorityRank?: number;
  canStart?: boolean;
  blockedBy?: string[];
  dependencyStatus?: ProductionDependencyStatus;
  lockedBy?: string | null;
  lockedAt?: string | null;
  lockReason?: string | null;
  lockToken?: string | null;
  lockTerminalId?: string | null;
  lockClientId?: string | null;
  lockExpiresAt?: string | null;
  lockVersion?: number;
  selectedAt?: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  actualHours: number;
  shiftId?: number | null;
  pauseReasonCode?: string | null;
  deviationReasonCode?: string | null;
  timeCategory?: string | null;
  acceptedQty?: number;
  defectQty?: number;
  reworkQty?: number;
  qualityStatus?: string | null;
  groupCapable?: boolean;
};
type ProductionUnit = {
  unitId: string;
  unitNo: number;
  status: ProductionRunStatus;
  progress?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  actualDurationMinutes?: number;
  actualDurationHours?: number;
  operations: ProductionOperation[];
  dispatchStatus?: ProductionOperationStatus | null;
  dispatchOperationId?: string | null;
  dispatchCompletedAt?: string | null;
  nextReadyOperations?: ProductionOperation[];
  nextBlockedOperations?: ProductionOperation[];
  canReleaseNext?: boolean;
};
type ProductionRun = {
  id: string;
  archived?: boolean;
  testData?: boolean;
  orderId?: number | null;
  orderNumber?: string | null;
  batchNumber?: string | null;
  batchName?: string | null;
  batchCreatedBy?: string | null;
  batchSource?: string | null;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalQuantity?: number;
  launchedQuantity?: number;
  comment?: string | null;
  operator: string | null;
  status: ProductionRunStatus;
  priority?: ProductionPriority;
  priorityRank?: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  actualDurationMinutes?: number;
  actualDurationHours?: number;
  operations: ProductionOperation[];
  units?: ProductionUnit[];
  normHours: number;
};
type ProductProcess = {
  id: string;
  equipment: string;
  productCode: string;
  category: string;
  sourceFile: string;
  sourceWorkbookSheets: string[];
  sourceDimensions: Record<string, { rows: number; columns: number }>;
  summary: Record<string, string>;
  processSteps: Array<{
    sequence: number;
    operationId: string;
    level?: number;
    x?: number;
    y?: number;
    partOrAssembly: string;
    name: string;
    section: string;
    previousOperationCodes: string[];
    nextOperationCodes: string[];
    normHours: number;
    sourceSheet?: string;
    sourceRow: number;
    confidence: string;
    groupCapable?: boolean;
  }>;
  totalNormHours: number;
  confidence: string;
  notes: string[];
  extractedAt?: string;
  sourceType?: string;
};
type ManualProcessInput = {
  id?: string;
  equipment?: string;
  productCode?: string;
  category?: string;
  summary?: Record<string, string>;
  notes?: string[];
  processSteps?: Array<Partial<{
    sequence: number;
    operationId: string;
    level: number;
    x: number;
    y: number;
    partOrAssembly: string;
    name: string;
    section: string;
    previousOperationCodes: string[];
    nextOperationCodes: string[];
    normHours: number;
    sourceRow: number;
    confidence: string;
    groupCapable: boolean;
  }>>;
};
type ProductionActionBody = { operator?: string; personName?: string; lockedBy?: string; lockToken?: string; expectedVersion?: number; reasonCode?: string; comment?: string; acceptedQty?: number; defectQty?: number; reworkQty?: number };
type ProductionSelectionBody = { operator?: string; terminalId?: string; clientId?: string; lockToken?: string };
type BulkProductionUnitActionBody = {
  action?: 'start' | 'pause' | 'resume' | 'complete';
  items?: Array<{ runId?: string; unitId?: string; operationId?: string }>;
  operator?: string;
  personName?: string;
  lockedBy?: string;
  reasonCode?: string;
  comment?: string;
};

@Injectable()
export class MesService {
  private readonly productionRunsImportMarkerId = '__legacy_import_completed__';
  private readonly legacyProductionRunsPath = join(process.cwd(), 'src', 'data', 'production-runs.json');
  private readonly productionRunsPath = process.env.PRODUCTION_RUNS_FILE
    || (process.env.NODE_ENV === 'production' ? '/app/data/production-runs.json' : this.legacyProductionRunsPath);

  constructor(private readonly prisma: PrismaService) {}

  async importOrdersExcel(file?: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('Excel-файл не передан');
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
    const errors: Array<{ row: number; error: string }> = [];
    let rowsCreated = 0;
    let rowsUpdated = 0;

    const route = await this.prisma.routeTemplate.findFirst({ where: { isActive: true }, include: { operations: true } });
    if (!route) throw new BadRequestException('Активный маршрут не найден. Выполните seed.');

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const orderNumber = this.cell(row, 'orderNumber', 'НомерЗаказа', 'Заказ');
      const productCode = this.cell(row, 'productCode', 'КодИзделия', 'Код');
      const quantity = Number(this.cell(row, 'quantity', 'Количество', 'КолВо') || 0);
      if (!orderNumber || !productCode || !quantity) {
        errors.push({ row: rowNumber, error: 'Обязательны orderNumber/productCode/quantity' });
        continue;
      }
      const existing = await this.prisma.order.findUnique({ where: { orderNumber } });
      const data = {
        orderNumber,
        productCode,
        productName: this.cell(row, 'productName', 'Изделие', 'Номенклатура'),
        quantity,
        dueDate: this.dateCell(this.cellRaw(row, 'shipmentDate', 'Дата отгрузки', 'ДатаОтгрузки', 'dueDate', 'Срок', 'ДатаЗавершения')),
        customer: this.cell(row, 'customer', 'Заказчик'),
        priority: this.cell(row, 'priority', 'Приоритет'),
        comment: [this.cell(row, 'comment', 'Комментарий'), this.cell(row, 'kd', 'КД') ? `КД: ${this.cell(row, 'kd', 'КД')}` : ''].filter(Boolean).join(' · '),
        sourceFile: file.originalname,
      };
      const order = existing
        ? await this.prisma.order.update({ where: { id: existing.id }, data })
        : await this.prisma.order.create({ data });
      existing ? rowsUpdated++ : rowsCreated++;
      await this.ensureOrderOperations(order.id, route.operations);
    }

    const batch = await this.prisma.importBatch.create({
      data: { fileName: file.originalname, status: errors.length ? 'completed_with_errors' : 'completed', rowsTotal: rows.length, rowsCreated, rowsUpdated, errorsJson: errors },
    });
    return { batch, errors };
  }

  importBatches() {
    return this.prisma.importBatch.findMany({ orderBy: { uploadedAt: 'desc' }, take: 20 });
  }

  async orders() {
    const orders = await this.prisma.order.findMany({ where: { status: { not: 'archived' } }, include: { operations: true }, orderBy: { createdAt: 'desc' } });
    return orders.map((order) => ({ ...order, progress: this.progress(order.operations) }));
  }

  async order(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { operations: { orderBy: { sortOrder: 'asc' } } } });
    if (!order) throw new NotFoundException('Заказ не найден');
    return { ...order, progress: this.progress(order.operations) };
  }

  orderOperations(id: number) {
    return this.prisma.orderOperation.findMany({ where: { orderId: id }, include: { assignedPerson: true }, orderBy: { sortOrder: 'asc' } });
  }

  async setOperationStatus(orderId: number, operationId: number, status: OperationStatus, body: { personId?: number; comment?: string }) {
    const op = await this.prisma.orderOperation.findFirst({ where: { id: operationId, orderId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    await this.assertOrderEditable(orderId);
    const targetLifecycle: LifecycleStatus = status === 'work' ? 'work' : status === 'done' ? 'done' : 'new';
    const transition = orderOperationTransition(this.effectiveStatus(op), targetLifecycle);
    if (transition.ok === false) {
      const ErrorClass = transition.conflict ? ConflictException : BadRequestException;
      throw new ErrorClass(transition.reason);
    }

    const now = new Date();
    const updated = await this.prisma.orderOperation.update({
      where: { id: op.id },
      data: {
        status,
        lifecycleStatus: targetLifecycle,
        assignedPersonId: body.personId || op.assignedPersonId,
        comment: body.comment ?? op.comment,
        startedAt: status === 'work' && !op.startedAt ? now : op.startedAt,
        finishedAt: status === 'done' ? now : (status === 'work' ? null : op.finishedAt),
      },
    });
    if (status === 'work') {
      await this.closeOpenIntervals(op.id, now);
      await this.openTimeInterval(op.id, orderId, body.personId || op.assignedPersonId, 'work', now, body.comment);
    }
    if (status === 'done') {
      await this.closeOpenIntervals(op.id, now);
      const totals = await this.operationTimeTotals(op.id);
      await this.prisma.orderOperation.update({
        where: { id: op.id },
        data: { actualHours: totals.workHours, pauseHours: totals.pauseHours, lifecycleStatus: 'done' },
      });
    }
    await this.prisma.operationEvent.create({ data: { orderId, orderOperationId: op.id, eventType: status === 'work' ? 'start' : 'finish', personId: body.personId, payload: body as object } });
    return this.enrichOperation(updated);
  }

  async resetOperationStatus(orderId: number, operationId: number) {
    const op = await this.prisma.orderOperation.findFirst({ where: { id: operationId, orderId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    await this.assertOrderEditable(orderId);
    const transition = orderOperationTransition(this.effectiveStatus(op), 'new');
    if (transition.ok === false) throw new BadRequestException(transition.reason);
    const updated = await this.prisma.orderOperation.update({
      where: { id: op.id },
      data: { status: 'new', lifecycleStatus: 'new', assignedPersonId: null, startedAt: null, finishedAt: null, actualHours: null, pauseHours: 0 },
    });
    await this.prisma.operationEvent.create({ data: { orderId, orderOperationId: op.id, eventType: 'reset', payload: {} } });
    return updated;
  }

  async archiveOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { operations: true } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (!order.operations.length || order.operations.some((op) => op.status !== 'done')) throw new BadRequestException('Заказ можно архивировать только после завершения всех этапов');
    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'archived' } });
  }

  async archiveOrders() {
    const orders = await this.prisma.order.findMany({ where: { status: 'archived' }, include: { operations: true }, orderBy: { updatedAt: 'desc' } });
    return orders.map((order) => ({ ...order, progress: this.progress(order.operations) }));
  }

  async archiveProductionRuns() {
    const runs = await this.readProductionRuns();
    return runs
      .filter((run) => !run.testData && (run.archived || run.status === 'done'))
      .map((run) => this.enrichProductionRun(run))
      .sort((a, b) => String(b.completedAt || b.createdAt).localeCompare(String(a.completedAt || a.createdAt)));
  }

  async sections() {
    await this.syncReferenceData();
    const [ops, referenceSections, capacities] = await Promise.all([
      this.prisma.routeOperation.findMany({ select: { section: true }, distinct: ['section'], orderBy: { section: 'asc' } }),
      this.prisma.referenceSection.findMany({ where: { isActive: true }, select: { name: true } }),
      this.prisma.sectionCapacity.findMany({ select: { section: true } }),
    ]);
    const runs = await this.readProductionRuns();
    const sections = new Set([
      ...ops.map((x) => x.section),
      ...referenceSections.map((x) => x.name),
      ...capacities.map((x) => x.section),
    ]);
    for (const run of this.activeProductionRuns(runs)) {
      if (run.status === 'done') continue;
      for (const op of this.productionRunWorkloadOperations(run).filter((item) => item.status !== 'done')) sections.add(op.section);
    }
    return Array.from(sections).sort();
  }

  async referenceData() {
    await this.syncReferenceData();
    const [sections, operations, terminals] = await Promise.all([
      this.prisma.referenceSection.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.referenceOperation.findMany({ orderBy: { operationCode: 'asc' } }),
      this.prisma.appUser.findMany({ where: { role: 'terminal', isActive: true }, select: { login: true, workCenterSection: true } }),
    ]);
    const terminalBySection = new Map(terminals.map((terminal) => [terminal.workCenterSection, terminal.login]));
    return { sections: sections.map((section) => ({ ...section, terminalLogin: terminalBySection.get(section.name) || null })), operations };
  }

  async addReferenceSection(body: { name?: string; availableHours?: number }) {
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Укажите название участка');
    const section = await this.prisma.referenceSection.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    await this.prisma.sectionCapacity.upsert({
      where: { section_period: { section: name, period: 'month' } },
      update: { availableHours: Number(body.availableHours || 160) },
      create: { section: name, availableHours: Number(body.availableHours || 160), period: 'month' },
    });
    await this.ensureTerminalUserForSection(name);
    return section;
  }

  async updateReferenceSection(id: number, body: { name?: string; isActive?: boolean; availableHours?: number }) {
    const existing = await this.prisma.referenceSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Участок не найден');
    const name = String(body.name || existing.name).trim();
    if (!name) throw new BadRequestException('Укажите название участка');
    const section = await this.prisma.referenceSection.update({
      where: { id },
      data: { name, isActive: body.isActive ?? existing.isActive },
    });
    if (body.availableHours !== undefined) {
      await this.prisma.sectionCapacity.upsert({
        where: { section_period: { section: name, period: 'month' } },
        update: { availableHours: Number(body.availableHours || 0) },
        create: { section: name, availableHours: Number(body.availableHours || 0), period: 'month' },
      });
    }
    if (existing.name !== name) {
      await this.prisma.appUser.updateMany({ where: { role: 'terminal', workCenterSection: existing.name }, data: { workCenterSection: name, displayName: `Terminal: ${name}` } });
    }
    if (section.isActive) await this.ensureTerminalUserForSection(name);
    if (!section.isActive) await this.prisma.appUser.updateMany({ where: { role: 'terminal', workCenterSection: name }, data: { isActive: false } });
    return section;
  }

  async addReferenceOperation(body: { operationCode?: string; name?: string; defaultSection?: string; defaultNormHours?: number; partOrAssembly?: string }) {
    const operationCode = await this.nextReferenceOperationCode();
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Укажите название операции');
    return this.prisma.referenceOperation.upsert({
      where: { operationCode },
      update: {
        name,
        defaultSection: body.defaultSection || null,
        defaultNormHours: body.defaultNormHours === undefined ? null : Number(body.defaultNormHours),
        partOrAssembly: body.partOrAssembly || null,
        isActive: true,
      },
      create: {
        operationCode,
        name,
        defaultSection: body.defaultSection || null,
        defaultNormHours: body.defaultNormHours === undefined ? null : Number(body.defaultNormHours),
        partOrAssembly: body.partOrAssembly || null,
        isActive: true,
      },
    });
  }

  async updateReferenceOperation(id: number, body: { operationCode?: string; name?: string; defaultSection?: string; defaultNormHours?: number; partOrAssembly?: string; isActive?: boolean }) {
    const existing = await this.prisma.referenceOperation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Операция не найдена');
    const name = String(body.name || existing.name).trim();
    if (!name) throw new BadRequestException('Укажите название операции');
    return this.prisma.referenceOperation.update({
      where: { id },
      data: {
        name,
        defaultSection: body.defaultSection === undefined ? existing.defaultSection : (body.defaultSection || null),
        defaultNormHours: body.defaultNormHours === undefined ? existing.defaultNormHours : Number(body.defaultNormHours),
        partOrAssembly: body.partOrAssembly === undefined ? existing.partOrAssembly : (body.partOrAssembly || null),
        isActive: body.isActive ?? existing.isActive,
      },
    });
  }

  private async nextReferenceOperationCode() {
    const operations = await this.prisma.referenceOperation.findMany({ select: { operationCode: true } });
    const maxNumber = operations.reduce((max, operation) => {
      const match = String(operation.operationCode || '').trim().match(/^ОР-(\d{5})$/u);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `ОР-${String(maxNumber + 1).padStart(5, '0')}`;
  }

  people() {
    return this.prisma.person.findMany({ where: { isActive: true }, orderBy: [{ section: 'asc' }, { fullName: 'asc' }] });
  }

  addPerson(body: { fullName: string; section: string }) {
    if (!body.fullName || !body.section) throw new BadRequestException('Заполните ФИО и участок');
    return this.prisma.person.create({ data: body });
  }

  async workCenters() {
    await this.syncReferenceData();
    await this.ensureDefaultWorkCenters();
    return this.prisma.workCenter.findMany({ include: { master: true }, orderBy: [{ section: 'asc' }, { name: 'asc' }] });
  }

  async upsertWorkCenter(body: { id?: number; section?: string; name?: string; capacityHours?: number; workType?: string; masterPersonId?: number; isActive?: boolean }) {
    const section = String(body.section || '').trim();
    const name = String(body.name || section || '').trim();
    if (!section || !name) throw new BadRequestException('section and name are required');
    await this.prisma.referenceSection.upsert({ where: { name: section }, create: { name: section }, update: { isActive: true } });
    const data = {
      section,
      name,
      capacityHours: Number.isFinite(Number(body.capacityHours)) ? Number(body.capacityHours) : 8,
      workType: String(body.workType || '').trim() || null,
      masterPersonId: body.masterPersonId ? Number(body.masterPersonId) : null,
      isActive: body.isActive ?? true,
    };
    const result = body.id
      ? await this.prisma.workCenter.update({ where: { id: Number(body.id) }, data })
      : await this.prisma.workCenter.upsert({ where: { section_name: { section, name } }, create: data, update: data });
    await this.audit('WorkCenter', String(result.id), body.id ? 'update' : 'upsert', body, result, body.name);
    return result;
  }

  shifts(query: { section?: string; date?: string; status?: string }) {
    const where: Prisma.WorkShiftWhereInput = {};
    if (query.section) where.section = String(query.section);
    if (query.status) where.status = String(query.status);
    if (query.date) {
      const day = this.parseDay(query.date);
      where.shiftDate = { gte: day.start, lt: day.end };
    }
    return this.prisma.workShift.findMany({ where, include: { workCenter: true }, orderBy: [{ shiftDate: 'desc' }, { startsAt: 'asc' }] });
  }

  async createShift(body: { shiftDate?: string; section?: string; workCenterId?: number; startsAt?: string; endsAt?: string; brigade?: string; master?: string }) {
    const section = String(body.section || '').trim();
    if (!section) throw new BadRequestException('section is required');
    const shiftDate = this.dateOnly(body.shiftDate || new Date().toISOString());
    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date(`${shiftDate}T08:00:00`);
    const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(`${shiftDate}T17:00:00`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) throw new BadRequestException('Invalid shift time range');
    await this.prisma.referenceSection.upsert({ where: { name: section }, create: { name: section }, update: { isActive: true } });
    const shift = await this.prisma.workShift.create({
      data: {
        shiftDate: new Date(`${shiftDate}T00:00:00`),
        section,
        workCenterId: body.workCenterId ? Number(body.workCenterId) : undefined,
        startsAt,
        endsAt,
        brigade: String(body.brigade || '').trim() || null,
        master: String(body.master || '').trim() || null,
      },
    });
    await this.audit('WorkShift', String(shift.id), 'create', null, shift, body.master || body.brigade);
    return shift;
  }

  async closeShift(id: number, body: { closedBy?: string; closeComment?: string; disputedJson?: unknown }) {
    const existing = await this.prisma.workShift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    const updated = await this.prisma.workShift.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedBy: String(body.closedBy || '').trim() || null,
        closeComment: String(body.closeComment || '').trim() || null,
        disputedJson: body.disputedJson === undefined ? Prisma.JsonNull : body.disputedJson as Prisma.InputJsonValue,
      },
    });
    await this.audit('WorkShift', String(id), 'close', existing, updated, body.closedBy);
    return updated;
  }

  calendar(query: { from?: string; to?: string }) {
    const where: Prisma.ProductionCalendarDayWhereInput = {};
    if (query.from || query.to) where.date = {};
    if (query.from) (where.date as Prisma.DateTimeFilter).gte = new Date(query.from);
    if (query.to) (where.date as Prisma.DateTimeFilter).lte = new Date(query.to);
    return this.prisma.productionCalendarDay.findMany({ where, orderBy: { date: 'asc' } });
  }

  async upsertCalendarDay(body: { date?: string; dayType?: string; startsAt?: string; endsAt?: string; comment?: string }) {
    if (!body.date) throw new BadRequestException('date is required');
    const date = new Date(`${this.dateOnly(body.date)}T00:00:00`);
    const data = {
      date,
      dayType: String(body.dayType || 'workday'),
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      comment: String(body.comment || '').trim() || null,
    };
    return this.prisma.productionCalendarDay.upsert({ where: { date }, create: data, update: data });
  }

  deviationReasons() {
    return this.prisma.deviationReason.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async upsertDeviationReason(body: { code?: string; name?: string; category?: string; timeCategory?: string; affectsWorkerKpi?: boolean; requiresSupervisorNote?: boolean; isActive?: boolean; sortOrder?: number }) {
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    if (!code || !name) throw new BadRequestException('code and name are required');
    const data = {
      code,
      name,
      category: String(body.category || 'other'),
      timeCategory: String(body.timeCategory || 'worker_pause'),
      affectsWorkerKpi: body.affectsWorkerKpi ?? true,
      requiresSupervisorNote: body.requiresSupervisorNote ?? false,
      isActive: body.isActive ?? true,
      sortOrder: Number(body.sortOrder || 100),
    };
    return this.prisma.deviationReason.upsert({ where: { code }, create: data, update: data });
  }

  async sectionShiftReport(query: { section?: string; shiftId?: string; date?: string }) {
    const shift = query.shiftId ? await this.prisma.workShift.findUnique({ where: { id: Number(query.shiftId) } }) : null;
    const section = String(query.section || shift?.section || '').trim();
    if (!section) throw new BadRequestException('section or shiftId is required');
    const bounds = shift ? { start: shift.startsAt, end: shift.endsAt } : this.parseDay(query.date || new Date().toISOString());
    const [orderOps, runOps, reasons] = await Promise.all([
      this.prisma.orderOperation.findMany({
        where: { section, OR: [{ startedAt: { gte: bounds.start, lt: bounds.end } }, { finishedAt: { gte: bounds.start, lt: bounds.end } }] },
        include: { assignedPerson: true, qualityRecords: true, timeTrackings: true, order: true },
      }),
      this.prisma.productionUnitOperation.findMany({
        where: { section, OR: [{ shiftId: shift?.id }, { startedAt: { gte: bounds.start, lt: bounds.end } }, { completedAt: { gte: bounds.start, lt: bounds.end } }] },
        include: { run: true, unit: true },
      }),
      this.prisma.deviationReason.findMany(),
    ]);
    const reasonByCode = new Map(reasons.map((reason) => [reason.code, reason]));
    const rows = [
      ...runOps.map((op) => this.productionReportRow(op, reasonByCode)),
      ...orderOps.map((op) => this.orderReportRow(op)),
    ];
    return this.reportFromRows({ section, shift, start: bounds.start, end: bounds.end, rows });
  }

  async workerReport(query: { person?: string; from?: string; to?: string }) {
    const person = String(query.person || '').trim();
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const [productionOps, orderOps, reasons] = await Promise.all([
      this.prisma.productionUnitOperation.findMany({
        where: { OR: [{ startedAt: { gte: from, lte: to } }, { completedAt: { gte: from, lte: to } }] },
        include: { run: true, unit: true },
      }),
      this.prisma.orderOperation.findMany({
        where: { OR: [{ startedAt: { gte: from, lte: to } }, { finishedAt: { gte: from, lte: to } }], assignedPerson: person ? { fullName: person } : undefined },
        include: { assignedPerson: true, qualityRecords: true, timeTrackings: true, order: true },
      }),
      this.prisma.deviationReason.findMany(),
    ]);
    const reasonByCode = new Map(reasons.map((reason) => [reason.code, reason]));
    const rows = [
      ...productionOps.map((op) => this.productionReportRow(op, reasonByCode)).filter((row) => !person || row.person === person),
      ...orderOps.map((op) => this.orderReportRow(op)).filter((row) => !person || row.person === person),
    ];
    return this.reportFromRows({ section: '', shift: null, start: from, end: to, rows, person });
  }

  async nomenclature(category?: string) {
    const allProducts = await this.allProductProcesses();
    const products = allProducts
      .filter((product) => !category || product.category === category)
      .map((product) => ({
        id: product.id,
        equipment: product.equipment,
        productCode: product.productCode,
        category: product.category,
        operationsCount: product.processSteps.length,
        totalNormHours: product.totalNormHours,
        confidence: product.confidence,
        notes: product.notes,
        sourceType: product.sourceType || 'imported',
      }));
    const categories = Array.from(new Set(allProducts.map((product) => product.category))).sort();
    return { products, categories, extractedAt: productsProcesses.extractedAt };
  }

  async nomenclatureCategories() {
    return Array.from(new Set((await this.allProductProcesses()).map((product) => product.category))).sort();
  }

  async nomenclatureProcess(id: string) {
    const product = (await this.allProductProcesses()).find((item) => item.id === id || item.productCode === id);
    if (!product) throw new NotFoundException('Номенклатура не найдена');
    return product;
  }

  async saveNomenclatureProcess(body: ManualProcessInput) {
    const process = this.normalizeManualProcess(body);
    await this.prisma.nomenclatureProcessRecord.upsert({
      where: { id: process.id },
      create: {
        id: process.id,
        equipment: process.equipment,
        productCode: process.productCode,
        category: process.category,
        operationsCount: process.processSteps.length,
        totalNormHours: process.totalNormHours,
        confidence: process.confidence,
        data: process as unknown as Prisma.InputJsonValue,
      },
      update: {
        equipment: process.equipment,
        productCode: process.productCode,
        category: process.category,
        operationsCount: process.processSteps.length,
        totalNormHours: process.totalNormHours,
        confidence: process.confidence,
        data: process as unknown as Prisma.InputJsonValue,
      },
    });
    return process;
  }

  async productionRuns() {
    const runs = await this.readProductionRuns();
    return this.activeProductionRuns(runs).map((run) => this.enrichProductionRun(run)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async migrateProductionRunsJson(filePath = this.productionRunsPath) {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content || '[]');
    if (!Array.isArray(parsed)) throw new BadRequestException('production-runs JSON должен быть массивом');
    const runs = parsed.map((run) => this.normalizeProductionRun(run as ProductionRun));
    return this.withSerializableRetry(async (tx) => {
      await this.writeProductionRuns(runs, tx);
      const [productionRuns, productionUnits, productionOperations] = await Promise.all([
        tx.productionRun.count(),
        tx.productionUnit.count(),
        tx.productionUnitOperation.count(),
      ]);
      const byStatus = await tx.productionUnitOperation.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } });
      return {
        ok: true,
        source: filePath,
        importedRuns: runs.length,
        productionRuns,
        productionUnits,
        productionOperations,
        operationsByStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
      };
    });
  }

  async productionPlan() {
    const [orders, runs, loads] = await Promise.all([
      this.prisma.order.findMany({ where: { status: { not: 'archived' } }, include: { operations: { orderBy: { sortOrder: 'asc' } } }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] }),
      this.readProductionRuns(),
      this.sectionLoad(),
    ]);
    const now = new Date();
    const rows = orders.map((order) => {
      const relatedRuns = this.activeProductionRuns(runs).filter((run) => run.orderNumber === order.orderNumber && run.productCode === order.productCode);
      const launched = relatedRuns.reduce((sum, run) => sum + (run.launchedQuantity || run.units?.length || run.quantity || 0), 0);
      const ready = relatedRuns.reduce((sum, run) => sum + (run.units?.filter((unit) => unit.status === 'done').length || (run.status === 'done' ? run.quantity : 0)), 0);
      const stages = this.planStages(order.operations, relatedRuns);
      const progress = relatedRuns.length ? this.average(relatedRuns.map((run) => this.enrichProductionRun(run).progress)) : this.progress(order.operations);
      return {
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        productCode: order.productCode,
        productName: order.productName,
        quantity: order.quantity,
        kd: this.extractKd(order.comment),
        comment: order.comment,
        shipmentDate: order.dueDate,
        dueDate: order.dueDate,
        priority: order.priority || 'normal',
        status: order.status,
        progress,
        availableQuantity: Math.max(0, order.quantity - launched),
        launchedQuantity: launched,
        readyQuantity: ready,
        overdue: Boolean(order.dueDate && order.dueDate < now && ready < order.quantity),
        stages,
        runs: relatedRuns.map((run) => this.enrichProductionRun(run)),
      };
    });
    const grouped = Array.from(rows.reduce((map, row) => {
      const key = row.productCode || row.productName || 'unknown';
      const group = map.get(key) || { productCode: row.productCode, productName: row.productName, quantity: 0, availableQuantity: 0, launchedQuantity: 0, readyQuantity: 0, orders: [] as any[] };
      group.quantity += row.quantity;
      group.availableQuantity += row.availableQuantity;
      group.launchedQuantity += row.launchedQuantity;
      group.readyQuantity += row.readyQuantity;
      group.orders.push(row);
      map.set(key, group);
      return map;
    }, new Map<string, any>()).values()).sort((a, b) => String(a.productName || a.productCode).localeCompare(String(b.productName || b.productCode), 'ru'));
    const allRuns = this.activeProductionRuns(runs).map((run) => this.enrichProductionRun(run));
    return {
      kpi: {
        orders: rows.length,
        nomenclatures: grouped.length,
        launched: allRuns.reduce((sum, run) => sum + (run.launchedQuantity || run.units?.length || run.quantity || 0), 0),
        ready: allRuns.reduce((sum, run) => sum + (run.units?.filter((unit: ProductionUnit) => unit.status === 'done').length || (run.status === 'done' ? run.quantity : 0)), 0),
        risks: rows.filter((row) => row.overdue).length,
        avgProgress: rows.length ? Math.round(this.average(rows.map((row) => row.progress))) : 0,
      },
      orders: rows,
      groups: grouped,
      sectionLoad: loads,
      runs: allRuns,
      generatedAt: new Date().toISOString(),
    };
  }

  async productionProcessGraph(selectedRunId?: string, selectedUnitId?: string) {
    const runs = this.activeProductionRuns(await this.readProductionRuns()).map((run) => this.enrichProductionRun(run));
    const units = runs.flatMap((run: ProductionRun & { progress?: number }) => (run.units || []).filter((unit) => unit.status !== 'done').map((unit) => ({
      runId: run.id,
      unitId: unit.unitId,
      unitNo: unit.unitNo,
      unitLabel: this.productionUnitLabel(run, unit),
      orderNumber: run.orderNumber || run.id,
      productName: run.productName,
      productCode: run.productCode,
      quantity: run.quantity,
      status: unit.status,
      progress: unit.progress || this.productionProgress(unit.operations),
      currentOperation: this.productionCurrentOperation(unit.operations),
    }))).sort((a, b) => `${a.orderNumber} ${a.unitNo}`.localeCompare(`${b.orderNumber} ${b.unitNo}`, 'ru'));
    const selectedAvailable = units.find((unit) => unit.runId === selectedRunId && unit.unitId === selectedUnitId);
    const runId = selectedAvailable?.runId || units[0]?.runId;
    const unitId = selectedAvailable?.unitId || units[0]?.unitId;
    return {
      units,
      graph: runId && unitId ? await this.productionUnitGraph(runId, unitId) : null,
      generatedAt: new Date().toISOString(),
    };
  }

  async productionUnitGraph(runId: string, unitId: string) {
    const run = this.enrichProductionRun(await this.findProductionRun(runId));
    const unit = run.units?.find((item) => item.unitId === unitId || String(item.unitNo) === unitId);
    if (!unit) throw new NotFoundException('Единица запуска производства не найдена');
    this.refreshProductionDependencies({ ...run, operations: unit.operations });
    const ordered = [...unit.operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const graphLayout = this.productionGraphLayout({ ...run, operations: ordered }, ordered);
    const nodes = ordered.map((op) => {
      const phase = this.productionGraphPhase(op);
      const position = graphLayout.positions.get(op.operationId) || { level: 1, row: 1, x: 40, y: 80 };
      return {
        id: op.id,
        operationId: op.operationId,
        sequence: op.sequence,
        level: position.level,
        row: position.row,
        x: position.x,
        y: position.y,
        title: op.name,
        section: op.section,
        part: op.partOrAssembly,
        normHours: op.normHours,
        status: op.status,
        phase,
        canStart: Boolean(op.canStart),
        blockedBy: op.blockedBy || [],
        lockedBy: op.lockedBy || null,
        startedAt: op.startedAt || null,
        completedAt: op.completedAt || null,
      };
    });
    const nodeByCode = new Map(nodes.map((node) => [node.operationId, node]));
    const edges = graphLayout.edges
      .filter((edge) => nodeByCode.has(edge.from) && nodeByCode.has(edge.to))
      .map((edge) => ({ from: nodeByCode.get(edge.from)!.id, to: nodeByCode.get(edge.to)!.id, type: edge.type, fromOperationId: edge.from, toOperationId: edge.to }));
    const summary = nodes.reduce((acc, node) => ({ ...acc, [node.phase]: acc[node.phase] + 1 }), { done: 0, current: 0, ready: 0, blocked: 0, upcoming: 0 } as Record<ProcessGraphPhase, number>);
    return {
      metadata: {
        runId: run.id,
        unitId: unit.unitId,
        unitNo: unit.unitNo,
        unitLabel: this.productionUnitLabel(run, unit),
        orderNumber: run.orderNumber || run.id,
        productName: run.productName,
        productCode: run.productCode,
        quantity: run.quantity,
        progress: unit.progress || this.productionProgress(unit.operations),
      },
      layout: graphLayout.layout,
      nodes,
      edges,
      summary,
    };
  }

  async createProductionRun(body: { orderNumber?: string; productId?: string; productCode?: string; productName?: string; quantity?: number; operator?: string; priority?: ProductionPriority; priorityRank?: number }) {
    const product = await this.findProductProcessOrThrow([body.productId, body.productCode, body.productName], 'Выберите номенклатуру для запуска производства');
    const quantity = Math.max(1, Number(body.quantity || 1));
    const orderNumber = this.normalizeProductionRunOrderNumber(body.orderNumber);
    const run = this.buildProductionRun(product, quantity, body, orderNumber ? { id: null, orderNumber } : null);
    return this.withSerializableRetry(async (tx) => {
      const runs = await this.readProductionRuns(tx);
      runs.push(run);
      await this.writeProductionRuns(runs, tx);
      return this.enrichProductionRun(run);
    });
  }

  async launchProduction(body: { orderNumber?: string; productId?: string; productCode?: string; productName?: string; quantity?: number; priority?: ProductionPriority; priorityRank?: number; comment?: string; operator?: string }) {
    const quantity = Math.max(1, Number(body.quantity || 1));
    const requestedOrderNumber = this.normalizeProductionRunOrderNumber(body.orderNumber);
    const order = requestedOrderNumber ? await this.prisma.order.findUnique({ where: { orderNumber: requestedOrderNumber } }) : null;
    const identifiers = [body.productId, body.productCode, body.productName, order?.productCode, order?.productName, order?.orderNumber];
    const product = await this.findProductProcessOrThrow(identifiers, 'Укажите заказ или номенклатуру для запуска');
    const runs = await this.readProductionRuns();
    if (order) {
      const alreadyLaunched = runs.filter((run) => run.orderNumber === order.orderNumber && run.productCode === product.productCode).reduce((sum, run) => sum + (run.launchedQuantity || run.units?.length || run.quantity || 0), 0);
      if (alreadyLaunched + quantity > order.quantity) throw new BadRequestException(`Нельзя запустить больше остатка по заказу. Доступно: ${Math.max(0, order.quantity - alreadyLaunched)}`);
    }
    const run = this.buildProductionRun(product, quantity, body, order ? { id: order.id, orderNumber: order.orderNumber } : requestedOrderNumber ? { id: null, orderNumber: requestedOrderNumber } : null);
    runs.push(run);
    await this.writeProductionRuns(runs);
    return this.enrichProductionRun(run);
  }

  async launchProductionBatch(body: { items?: Array<{ orderNumber?: string; productId?: string; productCode?: string; productName?: string; quantity?: number }>; priority?: ProductionPriority; priorityRank?: number; comment?: string; operator?: string }) {
    const items = (body.items || []).filter((item) => Number(item.quantity || 0) > 0);
    if (!items.length) throw new BadRequestException('Выберите изделия для запуска партии');
    const batchNumber = `BATCH-${Date.now()}`;
    const runs = await this.readProductionRuns();
    const created: ProductionRun[] = [];
    for (const item of items) {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const requestedOrderNumber = this.normalizeProductionRunOrderNumber(item.orderNumber);
      const order = requestedOrderNumber ? await this.prisma.order.findUnique({ where: { orderNumber: requestedOrderNumber } }) : null;
      const identifiers = [item.productId, item.productCode, item.productName, order?.productCode, order?.productName, order?.orderNumber];
      const product = await this.findProductProcessOrThrow(identifiers, 'Укажите заказ или номенклатуру для запуска партии');
      if (order) {
        const alreadyLaunched = runs.filter((run) => run.orderNumber === order.orderNumber && run.productCode === product.productCode).reduce((sum, run) => sum + (run.launchedQuantity || run.units?.length || run.quantity || 0), 0);
        const createdForOrder = created.filter((run) => run.orderNumber === order.orderNumber && run.productCode === product.productCode).reduce((sum, run) => sum + (run.launchedQuantity || run.quantity || 0), 0);
        if (alreadyLaunched + createdForOrder + quantity > order.quantity) throw new BadRequestException(`Нельзя запустить больше остатка по заказу ${order.orderNumber}. Доступно: ${Math.max(0, order.quantity - alreadyLaunched - createdForOrder)}`);
      }
      const run = this.buildProductionRun(product, quantity, body, order ? { id: order.id, orderNumber: order.orderNumber } : requestedOrderNumber ? { id: null, orderNumber: requestedOrderNumber } : null);
      run.batchNumber = batchNumber;
      run.batchName = `Партия ${batchNumber}`;
      run.batchCreatedBy = body.operator?.trim() || null;
      run.batchSource = 'multi-selection';
      created.push(run);
    }
    runs.push(...created);
    await this.writeProductionRuns(runs);
    await this.prisma.auditLog.create({
      data: {
        entityType: 'production-batch',
        entityId: batchNumber,
        action: 'launch',
        actor: body.operator || undefined,
        afterJson: { batchNumber, count: created.length, quantity: created.reduce((sum, run) => sum + run.quantity, 0), runs: created.map((run) => run.id) } as Prisma.InputJsonValue,
        comment: body.comment || null,
      },
    });
    return { batchNumber, runs: created.map((run) => this.enrichProductionRun(run)) };
  }

  async productionRun(id: string) {
    return this.enrichProductionRun(await this.findProductionRun(id));
  }

  async startProductionRun(id: string) {
    return this.updateProductionRun(id, (run, now) => {
      if (run.status === 'done') throw new BadRequestException('Завершенный запуск нельзя снова запустить');
      run.status = 'work';
      run.startedAt ||= now;
    });
  }

  async deleteProductionRun(id: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const runs = await tx.productionRun.findMany({
        where: { OR: [{ id }, { legacyRecordId: id }] },
        select: { id: true, legacyRecordId: true },
      });
      const runLegacyIds = runs.map((run) => run.legacyRecordId).filter((legacyId): legacyId is string => Boolean(legacyId));
      const legacyRecords = await tx.productionRunRecord.findMany({
        where: { id: { in: [id, ...runLegacyIds] } },
        select: { id: true },
      });
      const runIds = Array.from(new Set([id, ...runs.map((run) => run.id)]));
      const legacyIds = Array.from(new Set([id, ...runLegacyIds, ...legacyRecords.map((record) => record.id)]));
      if (!runs.length && !legacyRecords.length) throw new NotFoundException('Запуск производства не найден');

      const events = await tx.productionOperationEvent.deleteMany({ where: { runId: { in: runIds } } });
      const operations = await tx.productionUnitOperation.deleteMany({ where: { runId: { in: runIds } } });
      const units = await tx.productionUnit.deleteMany({ where: { runId: { in: runIds } } });
      const normalized = await tx.productionRun.deleteMany({ where: { id: { in: runIds } } });
      const legacy = await tx.productionRunRecord.deleteMany({
        where: { id: { in: legacyIds.filter((legacyId) => legacyId !== this.productionRunsImportMarkerId) } },
      });

      return {
        ok: true,
        id,
        deleted: {
          productionRuns: normalized.count,
          productionRunRecords: legacy.count,
          productionUnits: units.count,
          productionUnitOperations: operations.count,
          productionOperationEvents: events.count,
        },
      };
    });
    await this.ensureProductionRunsImportMarker();
    return result;
  }

  async productionRunOperationAction(runId: string, operationId: string, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionActionBody = {}) {
    return this.updateProductionRun(runId, (run, now) => {
      this.normalizeProductionRun(run);
      const op = run.operations.find((item) => item.id === operationId || item.operationId === operationId);
      if (!op) throw new NotFoundException('Операция запуска производства не найдена');
      if (run.status === 'done') throw new BadRequestException('Запуск уже завершен');
      this.applyProductionOperationAction(run, op, action, body, now);
    });
  }

  async productionUnitOperationAction(runId: string, unitId: string, operationId: string, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionActionBody = {}) {
    return this.updateProductionRun(runId, (run, now) => {
      this.normalizeProductionRun(run);
      const unit = run.units?.find((item) => item.unitId === unitId || String(item.unitNo) === unitId);
      if (!unit) throw new NotFoundException('Единица запуска производства не найдена');
      const op = unit.operations.find((item) => item.id === operationId || item.operationId === operationId);
      if (!op) throw new NotFoundException('Операция единицы производства не найдена');
      this.applyProductionOperationAction(run, op, action, body, now, unit);
    });
  }

  async releaseProductionUnitDispatch(runId: string, unitId: string, body: ProductionActionBody = {}) {
    return this.updateProductionRun(runId, (run, now) => {
      this.normalizeProductionRun(run);
      const unit = run.units?.find((item) => item.unitId === unitId || String(item.unitNo) === unitId);
      if (!unit) throw new NotFoundException('Единица запуска производства не найдена');
      const dispatch = this.findDispatchOperation(unit.operations);
      if (!dispatch) throw new NotFoundException('Операция Диспетчеризация не найдена');
      if (dispatch.status === 'queued') {
        dispatch.status = 'work';
        dispatch.startedAt ||= now;
        dispatch.lockedBy = this.productionLockOwner(body, run) || 'Диспетчер';
        dispatch.lockedAt = now;
        dispatch.lockReason = 'dispatch release';
      }
      if (dispatch.status === 'work' || dispatch.status === 'paused') {
        dispatch.status = 'done';
        dispatch.completedAt ||= now;
        dispatch.pausedAt = null;
        dispatch.actualHours = this.productionActualHours(dispatch, now);
        dispatch.lockedBy = null;
        dispatch.lockedAt = null;
        dispatch.lockReason = null;
      }
      this.refreshUnitStatus(unit);
      this.refreshRunStatus(run, now);
      this.refreshProductionDependencies({ ...run, operations: unit.operations });
    });
  }

  async dashboardSummary() {
    const orders = await this.prisma.order.findMany({ where: { status: { not: 'archived' } }, include: { operations: true } });
    const progresses = orders.map((order) => this.progress(order.operations));
    const allOps = orders.flatMap((o) => o.operations);
    return {
      orders: orders.length,
      avgProgress: progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0,
      workOps: allOps.filter((o) => this.effectiveStatus(o) === 'work').length,
      pausedOps: allOps.filter((o) => this.effectiveStatus(o) === 'paused').length,
      doneOps: allOps.filter((o) => this.effectiveStatus(o) === 'done').length,
    };
  }

  async dispatchDashboard() {
    const [orders, productionRuns] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: { not: 'archived' } },
        include: { operations: { include: { assignedPerson: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      this.readProductionRuns(),
    ]);
    const now = new Date();
    const orderRows = orders.map((order) => {
      const progress = this.progress(order.operations);
      const currentOperation = order.operations.find((op) => this.effectiveStatus(op) === 'work')
        || order.operations.find((op) => this.effectiveStatus(op) === 'paused')
        || order.operations.find((op) => this.effectiveStatus(op) !== 'done')
        || order.operations[order.operations.length - 1]
        || null;
      return {
        sourceType: 'order',
        id: order.id,
        displayId: order.orderNumber,
        orderNumber: order.orderNumber,
        code: order.productCode,
        productCode: order.productCode,
        productName: order.productName,
        quantity: order.quantity,
        dueDate: order.dueDate,
        customer: order.customer,
        priority: order.priority || 'Обычный',
        status: order.status,
        readableStatus: order.status,
        progress,
        ready: progress >= 100,
        overdue: Boolean(order.dueDate && order.dueDate < now && progress < 100),
        section: currentOperation?.section || null,
        createdAt: order.createdAt,
        operator: null,
        isWithoutOrder: false,
        currentStage: currentOperation ? {
          id: currentOperation.id,
          operationCode: currentOperation.operationCode,
          name: currentOperation.name,
          status: this.effectiveStatus(currentOperation),
          section: currentOperation.section,
          assignedPerson: currentOperation.assignedPerson?.fullName || null,
        } : null,
      };
    });
    const productionRows = this.activeProductionRuns(productionRuns).map((run) => this.productionRunDispatchRow(run));
    const rows = [...orderRows, ...productionRows];
    const loads = await this.sectionLoad(productionRuns);

    return {
      kpi: {
        orders: rows.length,
        avgProgress: rows.length ? Math.round(rows.reduce((sum, order) => sum + order.progress, 0) / rows.length) : 0,
        inWork: rows.filter((order) => order.currentStage?.status === 'work').length,
        paused: rows.filter((order) => order.currentStage?.status === 'paused').length,
        overdue: rows.filter((order) => order.overdue).length,
        ready: rows.filter((order) => order.ready).length,
      },
      orders: rows,
      sectionLoad: loads,
      generatedAt: new Date().toISOString(),
    };
  }

  async sectionLoad(productionRuns?: ProductionRun[]) {
    const runs = this.activeProductionRuns(productionRuns || await this.readProductionRuns());
    const operations = await this.prisma.orderOperation.findMany({ where: { status: { not: 'done' }, lifecycleStatus: { not: 'canceled' }, order: { status: { not: 'archived' } } }, include: { order: true } });
    const capacities = await this.prisma.sectionCapacity.findMany();
    const map = new Map<string, number>();
    for (const op of operations) map.set(op.section, (map.get(op.section) || 0) + op.normHours * op.order.quantity);
    for (const run of runs) {
      if (run.status === 'done') continue;
      for (const op of this.productionRunWorkloadOperations(run).filter((item) => item.status === 'queued' || item.status === 'work' || item.status === 'paused')) {
        map.set(op.section, (map.get(op.section) || 0) + op.normHours);
      }
    }
    return Array.from(map.entries()).sort().map(([section, remainingHours]) => {
      const capacity = capacities.find((c) => c.section.trim() === section.trim());
      const availableHours = capacity ? Number(capacity.availableHours || 0) : DEFAULT_SECTION_AVAILABLE_HOURS;
      const freeHours = Math.max(0, availableHours - remainingHours);
      return { section, remainingHours, availableHours, freeHours, loadPct: availableHours ? Math.round((remainingHours / availableHours) * 100) : 0 };
    });
  }

  async workCenterTerminal(section: string, options: { onlyAvailable?: boolean } = {}) {
    const normalizedSection = decodeURIComponent(section).trim();
    const [operations, people, productionRuns, recentEvents] = await Promise.all([
      this.prisma.orderOperation.findMany({
        where: { section: normalizedSection, status: { not: 'done' }, order: { status: { not: 'archived' } } },
        include: { order: true, assignedPerson: true, timeTrackings: true, qualityRecords: true },
        orderBy: [{ status: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.person.findMany({ where: { isActive: true, section: normalizedSection }, orderBy: { fullName: 'asc' } }),
      this.readProductionRuns(),
      this.terminalRecentEvents(normalizedSection),
    ]);
    const orderQueue = operations.map((op) => {
      const totals = this.timeTotalsFromRows(op.timeTrackings);
      return {
        sourceType: 'order',
        isWithoutOrder: false,
        displayId: op.order.orderNumber,
        id: op.id,
        orderId: op.orderId,
        orderNumber: op.order.orderNumber,
        productCode: op.order.productCode,
        productName: op.order.productName,
        quantity: op.order.quantity,
        dueDate: op.order.dueDate,
        operationCode: op.operationCode,
        operation: op.name,
        name: op.name,
        section: op.section,
        normHours: op.normHours,
        status: this.effectiveStatus(op),
        assignedPersonId: op.assignedPersonId,
        assignedPerson: op.assignedPerson?.fullName || null,
        operator: op.assignedPerson?.fullName || null,
        startedAt: op.startedAt,
        finishedAt: op.finishedAt,
        actualHours: totals.workHours || op.actualHours || 0,
        pauseHours: totals.pauseHours || op.pauseHours || 0,
        timeState: this.operationTimeState(op.timeTrackings),
        quality: this.qualityTotals(op.qualityRecords),
        comment: op.comment,
        nextOperationCodes: op.nextOperationCodes,
        previousOperationCodes: op.previousOperationCodes,
        bulkGroupAllowed: false,
      };
    });
    const productionQueue = this.activeProductionRuns(productionRuns)
      .filter((run) => run.status !== 'done')
      .flatMap((run) => run.units?.length
        ? run.units.flatMap((unit) => unit.operations.filter((op) => op.section.trim() === normalizedSection && op.status !== 'done').map((op) => this.productionRunTerminalOperation(run, op, unit)))
        : run.operations.filter((op) => op.section.trim() === normalizedSection && op.status !== 'done').map((op) => this.productionRunTerminalOperation(run, op)));
    const allQueue = [...orderQueue, ...productionQueue].sort((a: any, b: any) => this.terminalSortRank(a) - this.terminalSortRank(b));
    const queue = options.onlyAvailable ? allQueue.filter((op: any) => this.isTerminalVisibleOperation(op)) : allQueue;
    const blockedCount = allQueue.length - queue.length;
    return {
      section: normalizedSection,
      currentOperation: queue.find((op) => op.status === 'work')
        || queue.find((op) => op.status === 'paused')
        || queue[0]
        || null,
      queue,
      blockedCount,
      people,
      recentEvents,
      generatedAt: new Date().toISOString(),
    };
  }

  private async terminalRecentEvents(section: string) {
    const [orderEvents, productionEvents] = await Promise.all([
      this.prisma.operationEvent.findMany({
        where: { orderOperation: { section } },
        include: { order: true, orderOperation: true, person: true },
        orderBy: { timestamp: 'desc' },
        take: 12,
      }),
      this.prisma.productionOperationEvent.findMany({
        where: { operation: { section } },
        include: { run: true, unit: true, operation: true },
        orderBy: { timestamp: 'desc' },
        take: 12,
      }),
    ]);
    return [
      ...orderEvents.map((event) => ({
        id: `order-${event.id}`,
        sourceType: 'order',
        eventType: event.eventType,
        title: event.orderOperation.name,
        operationCode: event.orderOperation.operationCode,
        orderNumber: event.order.orderNumber,
        actor: event.person?.fullName || null,
        timestamp: event.timestamp.toISOString(),
      })),
      ...productionEvents.map((event) => ({
        id: `production-${event.id}`,
        sourceType: 'production-run',
        eventType: event.eventType,
        title: event.operation?.name || 'Операция production run',
        operationCode: event.operation?.operationId || '',
        orderNumber: event.run.orderNumber || null,
        runId: event.runId,
        unitLabel: event.unit ? `${event.unit.unitNo}/${event.run.launchedQuantity || event.run.quantity}` : null,
        actor: event.actor || null,
        timestamp: event.timestamp.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  workCenterTerminalForUser(user: AuthUser) {
    return this.workCenterTerminal(this.terminalSection(user), { onlyAvailable: true });
  }

  async terminalOrderOperationAction(user: AuthUser, operationId: number, action: 'start' | 'pause' | 'resume' | 'complete', body: { personId?: number; comment?: string }) {
    const op = await this.prisma.orderOperation.findUnique({ where: { id: operationId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    this.assertTerminalSection(user, op.section);
    const personId = body.personId || user.personId || undefined;
    if (action === 'start') return this.setOperationStatusById(operationId, 'work', { ...body, personId });
    if (action === 'pause') return this.pauseOperationById(operationId, { ...body, personId });
    if (action === 'resume') return this.resumeOperationById(operationId, { ...body, personId });
    return this.setOperationStatusById(operationId, 'done', { ...body, personId });
  }

  async selectProductionUnitOperation(user: AuthUser, operationPk: string, body: ProductionSelectionBody = {}) {
    return this.withSerializableRetry(async (tx) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TERMINAL_SELECTION_TTL_MS);
      const op = await tx.productionUnitOperation.findUnique({ where: { id: operationPk } });
      if (!op) throw new NotFoundException('Операция единицы производства не найдена');
      this.assertTerminalSection(user, op.section);
      await this.assertProductionOperationSelectable(tx, op.runId, op.unitId, op.id);

      const lockToken = randomUUID();
      const actor = this.terminalSelectionActor(user, body);
      const updated = await tx.productionUnitOperation.updateMany({
        where: {
          id: op.id,
          section: op.section,
          status: 'queued',
          OR: [{ lockToken: null }, { lockExpiresAt: { lt: now } }],
        },
        data: {
          lockedBy: actor,
          lockedAt: now,
          lockReason: 'selected',
          lockToken,
          lockTerminalId: String(body.terminalId || user.login || user.workCenterSection || '').trim() || null,
          lockClientId: String(body.clientId || '').trim() || null,
          lockExpiresAt: expiresAt,
          selectedAt: op.selectedAt || now,
          lockVersion: { increment: 1 },
        },
      });

      if (!updated.count) await this.throwProductionSelectionConflict(tx, op.id, now);
      const selected = await tx.productionUnitOperation.findUnique({ where: { id: op.id } });
      if (!selected) throw new NotFoundException('Операция единицы производства не найдена');
      await tx.productionOperationEvent.create({
        data: {
          runId: selected.runId,
          unitId: selected.unitId || undefined,
          operationPk: selected.id,
          eventType: 'selected',
          actor,
          timestamp: now,
          payload: { terminalId: body.terminalId || user.login, clientId: body.clientId || null } as Prisma.InputJsonValue,
        },
      });
      return this.productionSelectionResponse(selected);
    });
  }

  async heartbeatProductionUnitOperation(user: AuthUser, operationPk: string, body: ProductionSelectionBody = {}) {
    const token = String(body.lockToken || '').trim();
    if (!token) throw new BadRequestException('Не передан lockToken выбранной операции');
    return this.withSerializableRetry(async (tx) => {
      const now = new Date();
      const op = await tx.productionUnitOperation.findUnique({ where: { id: operationPk } });
      if (!op) throw new NotFoundException('Операция единицы производства не найдена');
      this.assertTerminalSection(user, op.section);
      const expiresAt = new Date(now.getTime() + TERMINAL_SELECTION_TTL_MS);
      const updated = await tx.productionUnitOperation.updateMany({
        where: { id: op.id, lockToken: token, status: 'queued', lockExpiresAt: { gte: now } },
        data: { lockExpiresAt: expiresAt, lockVersion: { increment: 1 } },
      });
      if (!updated.count) throw new ConflictException('Операция потеряла актуальность. Обновите очередь терминала.');
      const selected = await tx.productionUnitOperation.findUnique({ where: { id: op.id } });
      if (!selected) throw new NotFoundException('Операция единицы производства не найдена');
      await tx.productionOperationEvent.create({
        data: {
          runId: selected.runId,
          unitId: selected.unitId || undefined,
          operationPk: selected.id,
          eventType: 'selection_heartbeat',
          actor: selected.lockedBy || user.displayName,
          timestamp: now,
          payload: { terminalId: body.terminalId || user.login, clientId: body.clientId || null } as Prisma.InputJsonValue,
        },
      });
      return this.productionSelectionResponse(selected);
    });
  }

  async releaseProductionUnitOperationSelection(user: AuthUser, operationPk: string, body: ProductionSelectionBody = {}) {
    const token = String(body.lockToken || '').trim();
    if (!token) throw new BadRequestException('Не передан lockToken выбранной операции');
    return this.withSerializableRetry(async (tx) => {
      const now = new Date();
      const op = await tx.productionUnitOperation.findUnique({ where: { id: operationPk } });
      if (!op) throw new NotFoundException('Операция единицы производства не найдена');
      this.assertTerminalSection(user, op.section);
      const updated = await tx.productionUnitOperation.updateMany({
        where: { id: op.id, lockToken: token, status: 'queued' },
        data: {
          lockedBy: null,
          lockedAt: null,
          lockReason: null,
          lockToken: null,
          lockTerminalId: null,
          lockClientId: null,
          lockExpiresAt: null,
          lockVersion: { increment: 1 },
        },
      });
      if (!updated.count) throw new ConflictException('Операция потеряла актуальность. Обновите очередь терминала.');
      await tx.productionOperationEvent.create({
        data: {
          runId: op.runId,
          unitId: op.unitId || undefined,
          operationPk: op.id,
          eventType: 'selection_released',
          actor: op.lockedBy || user.displayName,
          timestamp: now,
          payload: { terminalId: body.terminalId || user.login, clientId: body.clientId || null } as Prisma.InputJsonValue,
        },
      });
      return { ok: true, id: op.id };
    });
  }

  async terminalProductionUnitOperationAction(user: AuthUser, runId: string, unitId: string, operationId: string, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionActionBody = {}) {
    return this.updateProductionRun(runId, (run, now) => {
      this.normalizeProductionRun(run);
      const unit = run.units?.find((item) => item.unitId === unitId || String(item.unitNo) === unitId);
      if (!unit) throw new NotFoundException('Единица запуска производства не найдена');
      const op = unit.operations.find((item) => item.id === operationId || item.operationId === operationId);
      if (!op) throw new NotFoundException('Операция единицы производства не найдена');
      this.assertTerminalSection(user, op.section);
      if (action === 'start' && !String(body.lockToken || '').trim()) {
        throw new ConflictException('Сначала выберите операцию в очереди терминала');
      }
      this.applyProductionOperationAction(run, op, action, {
        ...body,
        operator: body.operator || user.displayName,
        lockedBy: body.lockedBy || user.displayName,
        personName: body.personName || user.displayName,
      }, now, unit);
    });
  }

  async productionBulkUnitOperationAction(body: BulkProductionUnitActionBody, user?: AuthUser) {
    const action = body.action;
    if (!action || !['start', 'pause', 'resume', 'complete'].includes(action)) {
      throw new BadRequestException('Укажите массовое действие: start, pause, resume или complete');
    }
    const items = (body.items || [])
      .map((item) => ({
        runId: String(item.runId || '').trim(),
        unitId: String(item.unitId || '').trim(),
        operationId: String(item.operationId || '').trim(),
      }))
      .filter((item) => item.runId && item.unitId && item.operationId);
    if (items.length < 2) throw new BadRequestException('Выберите минимум две штуки для группового действия');

    const bulkActionId = `BULK-${Date.now()}`;
    const actor = user?.displayName || body.lockedBy || body.operator || body.personName || 'Групповая операция';
    const groups = items.reduce((map, item) => {
      const group = map.get(item.runId) || [];
      group.push(item);
      map.set(item.runId, group);
      return map;
    }, new Map<string, typeof items>());
    const affected: Array<{ runId: string; unitId: string; operationId: string; status: string }> = [];
    let operationCode = '';
    let section = '';

    for (const [runId, groupItems] of groups.entries()) {
      await this.updateProductionRun(runId, (run, now) => {
        this.normalizeProductionRun(run);
        for (const item of groupItems) {
          const unit = run.units?.find((candidate) => candidate.unitId === item.unitId || String(candidate.unitNo) === item.unitId);
          if (!unit) throw new NotFoundException(`Единица производства не найдена: ${item.unitId}`);
          const op = unit.operations.find((candidate) => candidate.id === item.operationId || candidate.operationId === item.operationId);
          if (!op) throw new NotFoundException(`Операция единицы производства не найдена: ${item.operationId}`);
          if (user) this.assertTerminalSection(user, op.section);
          if (!this.isBulkGroupAllowedProductionOperation(op)) {
            throw new BadRequestException(`Массовое действие для ${op.operationId} ${op.name} доступно только для лазера, зачистки и пробивного/координатного станка`);
          }
          operationCode ||= op.operationId;
          section ||= op.section;
          if (op.operationId !== operationCode || op.section !== section) {
            throw new BadRequestException('Групповое действие доступно только для одной операции и одного участка');
          }
          this.applyProductionOperationAction(run, op, action, {
            ...body,
            operator: actor,
            lockedBy: actor,
            personName: actor,
            comment: body.comment || `Групповое действие ${bulkActionId}`,
          }, now, unit);
          op.lockReason = op.status === 'done' ? op.lockReason : `bulk:${bulkActionId}`;
          affected.push({ runId: run.id, unitId: unit.unitId, operationId: op.operationId, status: op.status });
        }
      });
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'production-bulk-operation',
        entityId: bulkActionId,
        action,
        actor,
        afterJson: { operationCode, section, count: affected.length, items: affected } as Prisma.InputJsonValue,
        comment: body.comment || null,
      },
    });

    return {
      ok: true,
      bulkActionId,
      action,
      operationCode,
      section,
      count: affected.length,
      items: affected,
    };
  }

  async setOperationStatusById(operationId: number, status: OperationStatus, body: { personId?: number; comment?: string }) {
    const op = await this.prisma.orderOperation.findUnique({ where: { id: operationId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    return this.setOperationStatus(op.orderId, operationId, status, body);
  }

  async pauseOperationById(operationId: number, body: { personId?: number; comment?: string }) {
    const op = await this.prisma.orderOperation.findUnique({ where: { id: operationId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    await this.assertOrderEditable(op.orderId);
    const transition = orderOperationTransition(this.effectiveStatus(op), 'paused');
    if (transition.ok === false) throw new BadRequestException(transition.reason);
    const now = new Date();
    await this.closeOpenIntervals(op.id, now);
    await this.openTimeInterval(op.id, op.orderId, body.personId || op.assignedPersonId, 'pause', now, body.comment);
    const totals = await this.operationTimeTotals(op.id);
    const comment = body.comment ?? op.comment;
    const updated = await this.prisma.orderOperation.update({
      where: { id: operationId },
      data: { lifecycleStatus: 'paused', comment, actualHours: totals.workHours, pauseHours: totals.pauseHours },
    });
    await this.prisma.operationEvent.create({
      data: { orderId: op.orderId, orderOperationId: op.id, eventType: 'pause', personId: body.personId, payload: { ...body, lifecycleStatus: 'paused' } },
    });
    return this.enrichOperation(updated);
  }

  async resumeOperationById(operationId: number, body: { personId?: number; comment?: string }) {
    const op = await this.prisma.orderOperation.findUnique({ where: { id: operationId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    await this.assertOrderEditable(op.orderId);
    const transition = orderOperationTransition(this.effectiveStatus(op), 'work');
    if (transition.ok === false) throw new BadRequestException(transition.reason);
    const now = new Date();
    await this.closeOpenIntervals(op.id, now);
    await this.openTimeInterval(op.id, op.orderId, body.personId || op.assignedPersonId, 'work', now, body.comment);
    const totals = await this.operationTimeTotals(op.id);
    const updated = await this.prisma.orderOperation.update({
      where: { id: operationId },
      data: { status: 'work', lifecycleStatus: 'work', assignedPersonId: body.personId || op.assignedPersonId, comment: body.comment ?? op.comment, actualHours: totals.workHours, pauseHours: totals.pauseHours },
    });
    await this.prisma.operationEvent.create({
      data: { orderId: op.orderId, orderOperationId: op.id, eventType: 'resume', personId: body.personId, payload: { ...body, lifecycleStatus: 'work' } },
    });
    return this.enrichOperation(updated);
  }

  async addOperationQuality(operationId: number, body: { personId?: number; checkedQty?: number; acceptedQty?: number; defectQty?: number; defectReason?: string; comment?: string }) {
    const op = await this.prisma.orderOperation.findUnique({ where: { id: operationId } });
    if (!op) throw new NotFoundException('Операция заказа не найдена');
    await this.assertOrderEditable(op.orderId);
    const checkedQty = Math.max(0, Number(body.checkedQty ?? 0));
    const defectQty = Math.max(0, Number(body.defectQty ?? 0));
    const acceptedQty = Math.max(0, Number(body.acceptedQty ?? Math.max(checkedQty - defectQty, 0)));
    const record = await this.prisma.qualityRecord.create({
      data: { orderId: op.orderId, orderOperationId: op.id, personId: body.personId, checkedQty, acceptedQty, defectQty, defectReason: body.defectReason, comment: body.comment },
    });
    await this.prisma.operationEvent.create({
      data: { orderId: op.orderId, orderOperationId: op.id, eventType: 'quality', personId: body.personId, payload: { checkedQty, acceptedQty, defectQty, defectReason: body.defectReason, comment: body.comment } },
    });
    return record;
  }

  async qualitySummary() {
    const records = await this.prisma.qualityRecord.findMany();
    return this.qualitySummaryFromRecords(records);
  }

  async directorDashboard() {
    const [orders, loads, events, qualityRecords, productionRuns] = await Promise.all([
      this.prisma.order.findMany({ where: { status: { not: 'archived' } }, include: { operations: true }, orderBy: { createdAt: 'desc' } }),
      this.sectionLoad(),
      this.prisma.operationEvent.findMany({ include: { order: true, orderOperation: true, person: true }, orderBy: { timestamp: 'desc' }, take: 100 }),
      this.prisma.qualityRecord.findMany(),
      this.readProductionRuns(),
    ]);
    const now = new Date();
    const orderProgress = orders.map((order) => ({
      sourceType: 'order',
      id: order.id,
      displayId: order.orderNumber,
      orderNumber: order.orderNumber,
      productCode: order.productCode,
      productName: order.productName,
      dueDate: order.dueDate,
      quantity: order.quantity,
      progress: this.progress(order.operations),
      status: order.status,
      priority: order.priority || 'normal',
    }));
    const activeProductionRuns = this.activeProductionRuns(productionRuns);
    const runProgress = activeProductionRuns.map((run) => this.productionRunDirectorRow(run));
    const allProgress = [...orderProgress, ...runProgress];
    const completedEvents = events.filter((event) => event.eventType === 'finish');
    const productionDynamics = this.mergeDynamics(this.groupEventsByDay(completedEvents), this.groupProductionRunsCompletedByDay(activeProductionRuns));
    const quality = qualityRecords.length ? this.qualitySummaryFromRecords(qualityRecords) : { checked: completedEvents.length, accepted: completedEvents.length, defect: 0, defectRatePct: 0, note: 'Fallback: записей качества пока нет, завершенные операции временно считаются принятыми без брака.' };
    const flatOps = orders.flatMap((order) => order.operations);
    const flatRunOps = activeProductionRuns.flatMap((run) => this.productionRunWorkloadOperations(this.normalizeProductionRun(run)));
    const avgProgress = allProgress.length ? Math.round(allProgress.reduce((sum, order) => sum + order.progress, 0) / allProgress.length) : 0;
    const riskOperations = [
      ...orders.flatMap((order) => order.operations
        .filter((op) => this.effectiveStatus(op) !== 'done' && (this.effectiveStatus(op) === 'paused' || (order.dueDate && order.dueDate < now)))
        .map((op) => ({
          sourceType: 'order',
          orderNumber: order.orderNumber,
          productCode: order.productCode,
          productName: order.productName,
          operationId: op.operationCode,
          name: op.name,
          section: op.section,
          status: this.effectiveStatus(op),
          dueDate: order.dueDate,
          reason: this.effectiveStatus(op) === 'paused' ? 'Операция на паузе' : 'Заказ просрочен, операция не завершена',
        }))),
      ...activeProductionRuns.flatMap((run) => (run.units?.length ? run.units.flatMap((unit) => unit.operations.map((op) => ({ op, unit }))) : run.operations.map((op) => ({ op, unit: null as ProductionUnit | null })))
        .filter(({ op }) => op.status !== 'done' && (op.status === 'paused' || op.canStart === false || (op.blockedBy || []).length > 0))
        .map(({ op, unit }) => ({
          sourceType: 'production-run',
          orderNumber: run.orderNumber || null,
          runId: run.id,
          unitLabel: unit ? `${unit.unitNo}/${run.launchedQuantity || run.quantity}` : null,
          productCode: run.productCode,
          productName: run.productName,
          operationId: op.operationId,
          name: op.name,
          section: op.section,
          status: op.status,
          blockedBy: op.blockedBy || [],
          reason: op.status === 'paused' ? 'Операция на паузе' : (op.blockedBy?.length ? `Ожидает: ${op.blockedBy.join(', ')}` : 'Ожидает готовности предшествующих операций'),
        }))),
    ].slice(0, 80);

    return {
      kpi: {
        orders: allProgress.length,
        productionRuns: activeProductionRuns.length,
        avgProgress,
        overdue: allProgress.filter((order) => order.dueDate && order.dueDate < now && order.progress < 100).length,
        completedOperations: completedEvents.length + flatRunOps.filter((op) => op.status === 'done').length,
        inWorkOperations: flatOps.filter((op) => this.effectiveStatus(op) === 'work').length + flatRunOps.filter((op) => op.status === 'work').length,
        pausedOperations: flatOps.filter((op) => this.effectiveStatus(op) === 'paused').length + flatRunOps.filter((op) => op.status === 'paused').length,
        bottlenecks: loads.filter((load) => load.loadPct >= 100).length,
        ready: allProgress.filter((order) => order.progress >= 100).length,
      },
      orderProgress: allProgress,
      sectionLoad: loads,
      overdueOrders: allProgress.filter((order) => order.dueDate && order.dueDate < now && order.progress < 100),
      productionDynamics,
      quality,
      riskOperations,
      keyMetrics: [
        { label: 'Средняя готовность объектов', value: `${avgProgress}%` },
         { label: 'Production runs без заказа', value: activeProductionRuns.length },
        { label: 'Операций завершено', value: completedEvents.length + flatRunOps.filter((op) => op.status === 'done').length },
        { label: 'Участков с загрузкой > 100%', value: loads.filter((load) => load.loadPct > 100).length },
        { label: 'Качество', value: `${quality.defectRatePct}% брака` },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async events() {
    const [orderEvents, productionEvents] = await Promise.all([
      this.prisma.operationEvent.findMany({
        include: { order: true, orderOperation: true, person: true },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      this.prisma.productionOperationEvent.findMany({
        include: { run: true, unit: true, operation: true },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
    ]);
    return [
      ...orderEvents.map((event) => ({
        id: `order-${event.id}`,
        sourceType: 'order',
        eventType: event.eventType,
        title: event.orderOperation?.name || 'Операция заказа',
        operationCode: event.orderOperation?.operationCode || '',
        orderNumber: event.order?.orderNumber || null,
        actor: event.person?.fullName || null,
        timestamp: event.timestamp.toISOString(),
      })),
      ...productionEvents.map((event) => ({
        id: `production-${event.id}`,
        sourceType: 'production-run',
        eventType: event.eventType,
        title: event.operation?.name || 'Операция запуска',
        operationCode: event.operation?.operationId || '',
        orderNumber: event.run?.orderNumber || null,
        runId: event.runId,
        unitLabel: event.unit ? `${event.unit.unitNo}/${event.run?.launchedQuantity || event.run?.quantity || '?'}` : null,
        actor: event.actor || null,
        timestamp: event.timestamp.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
  }

  private async readProductionRuns(client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<ProductionRun[]> {
    const normalized = await client.productionRun.findMany({
      include: {
        operations: { where: { unitId: null }, orderBy: { sequence: 'asc' } },
        units: { include: { operations: { orderBy: { sequence: 'asc' } } }, orderBy: { unitNo: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (normalized.length) return normalized.map((record) => this.normalizeProductionRun(this.productionRunFromNormalized(record)));

    const records = await client.productionRunRecord.findMany({ orderBy: { createdAt: 'asc' } });
    const runRecords = records.filter((record) => record.id !== this.productionRunsImportMarkerId);
    if (runRecords.length) {
      const runs = runRecords.map((record) => this.normalizeProductionRun(this.productionRunFromRecord(record)));
      await this.writeProductionRuns(runs, client);
      return runs;
    }
    if (records.some((record) => record.id === this.productionRunsImportMarkerId)) return [];
    const legacyRuns = await this.readLegacyProductionRuns();
    await this.writeProductionRuns(legacyRuns, client);
    return legacyRuns;
  }

  private async readProductionRun(id: string, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<ProductionRun | null> {
    const normalized = await client.productionRun.findUnique({
      where: { id },
      include: {
        operations: { where: { unitId: null }, orderBy: { sequence: 'asc' } },
        units: { include: { operations: { orderBy: { sequence: 'asc' } } }, orderBy: { unitNo: 'asc' } },
      },
    });
    if (normalized) return this.normalizeProductionRun(this.productionRunFromNormalized(normalized));

    const legacyRecord = await client.productionRunRecord.findUnique({ where: { id } });
    if (!legacyRecord || legacyRecord.id === this.productionRunsImportMarkerId) return null;
    const run = this.normalizeProductionRun(this.productionRunFromRecord(legacyRecord));
    await this.writeProductionRun(run, client);
    return run;
  }

  private async writeProductionRuns(runs: ProductionRun[], client: Prisma.TransactionClient | PrismaService = this.prisma) {
    runs.forEach((run) => this.normalizeProductionRun(run));
    const ids = runs.map((run) => run.id);
    const retainedIds = [...ids, this.productionRunsImportMarkerId];
    await client.productionRun.deleteMany({ where: { id: { notIn: ids.length ? ids : ['__none__'] } } });
    await client.productionRunRecord.deleteMany({ where: { id: { notIn: retainedIds } } });
    for (const run of runs) await this.upsertNormalizedProductionRun(run, client);
    for (const run of runs) await this.upsertProductionRunLegacyRecord(run, client);
    await this.markProductionRunsImported(client);
  }

  private async writeProductionRun(run: ProductionRun, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    this.normalizeProductionRun(run);
    await this.upsertNormalizedProductionRun(run, client);
    await this.upsertProductionRunLegacyRecord(run, client);
    await this.markProductionRunsImported(client);
  }

  private async upsertProductionRunLegacyRecord(run: ProductionRun, client: Prisma.TransactionClient | PrismaService) {
    await client.productionRunRecord.upsert({
      where: { id: run.id },
      create: this.productionRunRecordData(run),
      update: this.productionRunRecordData(run),
    });
  }

  private async markProductionRunsImported(client: Prisma.TransactionClient | PrismaService) {
    await client.productionRunRecord.upsert({
      where: { id: this.productionRunsImportMarkerId },
      create: { id: this.productionRunsImportMarkerId, data: { type: 'legacy-import-completed' } },
      update: { data: { type: 'legacy-import-completed' } },
    });
  }

  private productionRunFromNormalized(record: any): ProductionRun {
    const units = (record.units || []).map((unit: any) => ({
      unitId: unit.id,
      unitNo: unit.unitNo,
      status: this.normalizeProductionRunStatus(unit.status),
      progress: Number(unit.progress || 0),
      startedAt: unit.startedAt ? unit.startedAt.toISOString() : null,
      completedAt: unit.completedAt ? unit.completedAt.toISOString() : null,
      operations: (unit.operations || []).map((op: any) => this.productionOperationFromNormalized(op)),
    }));
    const run: ProductionRun = {
      id: record.id,
      archived: Boolean(record.archived),
      testData: Boolean(record.testData),
      orderId: record.orderId ?? null,
      orderNumber: record.orderNumber ?? null,
      batchNumber: record.batchNumber ?? record.id,
      batchName: record.batchName ?? null,
      batchCreatedBy: record.batchCreatedBy ?? record.operator ?? null,
      batchSource: record.batchSource ?? null,
      productId: record.productId,
      productCode: record.productCode,
      productName: record.productName,
      quantity: record.quantity,
      totalQuantity: record.totalQuantity ?? record.quantity,
      launchedQuantity: record.launchedQuantity ?? (units.length || record.quantity),
      comment: record.comment ?? null,
      operator: record.operator ?? null,
      status: this.normalizeProductionRunStatus(record.status),
      priority: this.normalizeProductionPriority(record.priority),
      priorityRank: record.priorityRank ?? undefined,
      createdAt: record.createdAt.toISOString(),
      startedAt: record.startedAt ? record.startedAt.toISOString() : null,
      completedAt: record.completedAt ? record.completedAt.toISOString() : null,
      operations: (record.operations || []).map((op: any) => this.productionOperationFromNormalized(op)),
      units,
      normHours: (record.operations || []).reduce((sum: number, op: any) => sum + Number(op.normHours || 0), 0),
    };
    return run;
  }

  private productionOperationFromNormalized(op: any): ProductionOperation {
    return {
      id: op.id,
      operationId: op.operationId,
      sequence: op.sequence,
      level: op.level ?? undefined,
      partOrAssembly: op.partOrAssembly,
      name: op.name,
      section: op.section,
      previousOperationCodes: Array.isArray(op.previousOperationCodes) ? op.previousOperationCodes : [],
      nextOperationCodes: Array.isArray(op.nextOperationCodes) ? op.nextOperationCodes : [],
      normHours: Number(op.normHours || 0),
      status: this.normalizeProductionOperationStatus(op.status),
      priority: this.normalizeProductionPriority(op.priority),
      priorityRank: op.priorityRank ?? undefined,
      lockedBy: op.lockedBy ?? null,
      lockedAt: op.lockedAt ? op.lockedAt.toISOString() : null,
      lockReason: op.lockReason ?? null,
      lockToken: op.lockToken ?? null,
      lockTerminalId: op.lockTerminalId ?? null,
      lockClientId: op.lockClientId ?? null,
      lockExpiresAt: op.lockExpiresAt ? op.lockExpiresAt.toISOString() : null,
      lockVersion: Number(op.lockVersion || 0),
      selectedAt: op.selectedAt ? op.selectedAt.toISOString() : null,
      startedAt: op.startedAt ? op.startedAt.toISOString() : null,
      pausedAt: op.pausedAt ? op.pausedAt.toISOString() : null,
      completedAt: op.completedAt ? op.completedAt.toISOString() : null,
      actualHours: Number(op.actualHours || 0),
      shiftId: op.shiftId ?? null,
      pauseReasonCode: op.pauseReasonCode ?? null,
      deviationReasonCode: op.deviationReasonCode ?? null,
      timeCategory: op.timeCategory ?? null,
      acceptedQty: Number(op.acceptedQty || 0),
      defectQty: Number(op.defectQty || 0),
      reworkQty: Number(op.reworkQty || 0),
      qualityStatus: op.qualityStatus ?? null,
      groupCapable: Boolean(op.groupCapable) || this.isGroupCapableProductionOperation(op),
    };
  }

  private async upsertNormalizedProductionRun(run: ProductionRun, client: Prisma.TransactionClient | PrismaService) {
    const normalized = this.normalizeProductionRun(run);
    await this.upsertProductionRunHeader(normalized, client);
    const unitIds = normalized.units?.map((unit) => unit.unitId) || [];
    const opIds = [
      ...(normalized.operations || []).map((op) => op.id),
      ...(normalized.units || []).flatMap((unit) => unit.operations.map((op) => op.id)),
    ];
    await client.productionUnitOperation.deleteMany({ where: { runId: normalized.id, id: { notIn: opIds.length ? opIds : ['__none__'] } } });
    await client.productionUnit.deleteMany({ where: { runId: normalized.id, id: { notIn: unitIds.length ? unitIds : ['__none__'] } } });
    for (const op of normalized.operations || []) {
      await this.upsertProductionOperationRow(normalized.id, null, op, client);
    }
    for (const unit of normalized.units || []) {
      await this.upsertProductionUnitRow(normalized.id, unit, client);
      for (const op of unit.operations) await this.upsertProductionOperationRow(normalized.id, unit.unitId, op, client);
    }
  }

  private async upsertProductionRunHeader(run: ProductionRun, client: Prisma.TransactionClient | PrismaService) {
    await client.productionRun.upsert({
      where: { id: run.id },
      create: this.productionRunData(run),
      update: this.productionRunData(run),
    });
  }

  private async upsertProductionUnitRow(runId: string, unit: ProductionUnit, client: Prisma.TransactionClient | PrismaService) {
    await client.productionUnit.upsert({
      where: { id: unit.unitId },
      create: this.productionUnitData(runId, unit),
      update: this.productionUnitData(runId, unit),
    });
  }

  private async upsertProductionOperationRow(runId: string, unitId: string | null, op: ProductionOperation, client: Prisma.TransactionClient | PrismaService) {
    await client.productionUnitOperation.upsert({
      where: { id: op.id },
      create: this.productionOperationData(runId, unitId, op),
      update: this.productionOperationData(runId, unitId, op),
    });
  }

  private productionRunData(run: ProductionRun): Prisma.ProductionRunUncheckedCreateInput {
    return {
      id: run.id,
      legacyRecordId: run.id,
      orderId: run.orderId || null,
      orderNumber: run.orderNumber || null,
      batchNumber: run.batchNumber || run.id,
      batchName: run.batchName || null,
      batchCreatedBy: run.batchCreatedBy || run.operator || null,
      batchSource: run.batchSource || null,
      productId: run.productId,
      productCode: run.productCode,
      productName: run.productName,
      quantity: run.quantity,
      totalQuantity: run.totalQuantity ?? run.quantity,
      launchedQuantity: run.launchedQuantity ?? run.units?.length ?? run.quantity,
      status: run.status,
      priority: this.normalizeProductionPriority(run.priority),
      priorityRank: run.priorityRank ?? null,
      operator: run.operator || null,
      comment: run.comment || null,
      archived: Boolean(run.archived),
      testData: Boolean(run.testData),
      createdAt: run.createdAt ? new Date(run.createdAt) : new Date(),
      startedAt: run.startedAt ? new Date(run.startedAt) : null,
      completedAt: run.completedAt ? new Date(run.completedAt) : null,
    };
  }

  private productionUnitData(runId: string, unit: ProductionUnit): Prisma.ProductionUnitUncheckedCreateInput {
    return {
      id: unit.unitId,
      runId,
      unitNo: unit.unitNo,
      status: unit.status,
      progress: Number(unit.progress || 0),
      startedAt: unit.startedAt ? new Date(unit.startedAt) : null,
      completedAt: unit.completedAt ? new Date(unit.completedAt) : null,
    };
  }

  private productionOperationData(runId: string, unitId: string | null, op: ProductionOperation): Prisma.ProductionUnitOperationUncheckedCreateInput {
    return {
      id: op.id,
      runId,
      unitId,
      operationId: op.operationId,
      sequence: Number(op.sequence || 0),
      level: op.level ?? null,
      partOrAssembly: op.partOrAssembly || '',
      name: op.name,
      section: op.section,
      previousOperationCodes: op.previousOperationCodes || [],
      nextOperationCodes: op.nextOperationCodes || [],
      normHours: Number(op.normHours || 0),
      status: this.normalizeProductionOperationStatus(op.status),
      priority: this.normalizeProductionPriority(op.priority),
      priorityRank: op.priorityRank ?? null,
      lockedBy: op.lockedBy || null,
      lockedAt: op.lockedAt ? new Date(op.lockedAt) : null,
      lockReason: op.lockReason || null,
      lockToken: op.lockToken || null,
      lockTerminalId: op.lockTerminalId || null,
      lockClientId: op.lockClientId || null,
      lockExpiresAt: op.lockExpiresAt ? new Date(op.lockExpiresAt) : null,
      lockVersion: Number(op.lockVersion || 0),
      selectedAt: op.selectedAt ? new Date(op.selectedAt) : null,
      startedAt: op.startedAt ? new Date(op.startedAt) : null,
      pausedAt: op.pausedAt ? new Date(op.pausedAt) : null,
      completedAt: op.completedAt ? new Date(op.completedAt) : null,
      actualHours: Number(op.actualHours || 0),
      shiftId: op.shiftId ?? null,
      pauseReasonCode: op.pauseReasonCode || null,
      deviationReasonCode: op.deviationReasonCode || null,
      timeCategory: op.timeCategory || null,
      acceptedQty: Number(op.acceptedQty || 0),
      defectQty: Number(op.defectQty || 0),
      reworkQty: Number(op.reworkQty || 0),
      qualityStatus: op.qualityStatus || null,
      groupCapable: Boolean(op.groupCapable) || this.isGroupCapableProductionOperation(op),
    };
  }

    private productionRunFromRecord(record: {
      data: Prisma.JsonValue;
      orderId?: number | null;
      orderNumber?: string | null;
      productId?: string | null;
      productCode?: string | null;
      productName?: string | null;
      quantity?: number | null;
      status?: string | null;
      priority?: string | null;
      operator?: string | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
    }): ProductionRun {
      const run = record.data as unknown as ProductionRun;
      return {
        ...run,
        orderId: record.orderId ?? run.orderId ?? null,
        orderNumber: record.orderNumber ?? run.orderNumber ?? null,
        batchNumber: run.batchNumber || run.id,
        batchName: run.batchName || `${record.productName || run.productName} · ${record.quantity ?? run.quantity} шт.`,
        batchCreatedBy: run.batchCreatedBy || record.operator || run.operator || null,
        batchSource: run.batchSource || (record.orderNumber || run.orderNumber ? 'order-selection' : 'manual-selection'),
        productId: record.productId || run.productId,
        productCode: record.productCode || run.productCode,
        productName: record.productName || run.productName,
        quantity: record.quantity ?? run.quantity,
        status: this.normalizeProductionRunStatus(record.status || run.status),
        priority: this.normalizeProductionPriority(record.priority || run.priority),
        operator: record.operator ?? run.operator ?? null,
        startedAt: record.startedAt ? record.startedAt.toISOString() : run.startedAt,
        completedAt: record.completedAt ? record.completedAt.toISOString() : run.completedAt,
      };
    }

    private productionRunRecordData(run: ProductionRun): Prisma.ProductionRunRecordUncheckedCreateInput {
      return {
        id: run.id,
        orderId: run.orderId || null,
        orderNumber: run.orderNumber || null,
        productId: run.productId,
        productCode: run.productCode,
        productName: run.productName,
        quantity: run.quantity,
        status: run.status,
        priority: this.normalizeProductionPriority(run.priority),
        operator: run.operator || null,
        startedAt: run.startedAt ? new Date(run.startedAt) : null,
        completedAt: run.completedAt ? new Date(run.completedAt) : null,
        data: run as unknown as Prisma.InputJsonValue,
      };
    }

  private async ensureProductionRunsImportMarker() {
    await this.prisma.productionRunRecord.upsert({
      where: { id: this.productionRunsImportMarkerId },
      create: { id: this.productionRunsImportMarkerId, data: { type: 'legacy-import-completed' } },
      update: { data: { type: 'legacy-import-completed' } },
    });
  }

  private async readLegacyProductionRuns(): Promise<ProductionRun[]> {
    const candidates = Array.from(new Set([this.productionRunsPath, this.legacyProductionRunsPath]));
    for (const candidate of candidates) {
      try {
        const content = await fs.readFile(candidate, 'utf8');
        const parsed = JSON.parse(content || '[]');
        if (Array.isArray(parsed)) return parsed.map((run) => this.normalizeProductionRun(run));
      } catch (error: any) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    return [];
  }

  private async ensureProductionRunsStorage() {
    await fs.mkdir(dirname(this.productionRunsPath), { recursive: true });
    try {
      await fs.access(this.productionRunsPath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      await this.seedProductionRunsStorage();
    }
  }

  private async seedProductionRunsStorage() {
    if (this.productionRunsPath !== this.legacyProductionRunsPath) {
      try {
        await fs.copyFile(this.legacyProductionRunsPath, this.productionRunsPath);
        return;
      } catch (error: any) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    await fs.writeFile(this.productionRunsPath, '[]\n', 'utf8');
  }

  private activeProductionRuns(runs: ProductionRun[]) {
    return runs.filter((run) => !run.archived && !run.testData && run.status !== 'done');
  }

  private productionRunWorkloadOperations(run: ProductionRun) {
    return run.units?.length ? run.units.flatMap((unit) => unit.operations) : run.operations;
  }

  private async ensureDefaultWorkCenters() {
    const sections = await this.prisma.referenceSection.findMany({ where: { isActive: true } });
    for (const section of sections) {
      await this.prisma.workCenter.upsert({
        where: { section_name: { section: section.name, name: section.name } },
        create: { section: section.name, name: section.name, capacityHours: 8, workType: 'default' },
        update: {},
      });
    }
  }

  private async audit(entityType: string, entityId: string, action: string, beforeJson: unknown, afterJson: unknown, actor?: string | null) {
    await this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        actor: actor || null,
        beforeJson: beforeJson === null || beforeJson === undefined ? Prisma.JsonNull : beforeJson as Prisma.InputJsonValue,
        afterJson: afterJson === null || afterJson === undefined ? Prisma.JsonNull : afterJson as Prisma.InputJsonValue,
      },
    });
  }

  private dateOnly(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    return date.toISOString().slice(0, 10);
  }

  private parseDay(value: string) {
    const date = this.dateOnly(value);
    return { start: new Date(`${date}T00:00:00`), end: new Date(`${date}T23:59:59.999`) };
  }

  private hoursBetween(start?: Date | string | null, end?: Date | string | null) {
    if (!start) return 0;
    const startMs = new Date(start).getTime();
    const endMs = end ? new Date(end).getTime() : Date.now();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
    return Math.round(Math.max(0, endMs - startMs) / 360000) / 10;
  }

  private async shiftForOperation(section: string, timestamp: Date, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.workShift.findFirst({
      where: {
        section,
        startsAt: { lte: timestamp },
        endsAt: { gte: timestamp },
      },
      orderBy: [{ status: 'asc' }, { startsAt: 'desc' }],
    });
  }

  private productionReportRow(op: any, reasonByCode: Map<string, any>) {
    const reasonCode = op.deviationReasonCode || op.pauseReasonCode || null;
    const reason = reasonCode ? reasonByCode.get(reasonCode) : null;
    return {
      sourceType: 'production-run',
      orderNumber: op.run?.orderNumber || op.runId,
      unitId: op.unitId || null,
      operationCode: op.operationId,
      name: op.name,
      section: op.section,
      person: op.lockedBy || op.run?.operator || '',
      status: op.status,
      normHours: Number(op.normHours || 0),
      actualHours: Number(op.actualHours || 0) || this.hoursBetween(op.startedAt, op.completedAt),
      pauseHours: Number(op.pauseHours || 0),
      acceptedQty: Number(op.acceptedQty || 0),
      defectQty: Number(op.defectQty || 0),
      reworkQty: Number(op.reworkQty || 0),
      reasonCode,
      reasonName: reason?.name || '',
      reasonCategory: reason?.category || '',
      affectsWorkerKpi: reason ? Boolean(reason.affectsWorkerKpi) : true,
    };
  }

  private orderReportRow(op: any) {
    const totals = this.timeTotalsFromRows(op.timeTrackings || []);
    return {
      sourceType: 'order',
      orderNumber: op.order?.orderNumber || '',
      unitId: null,
      operationCode: op.operationCode,
      name: op.name,
      section: op.section,
      person: op.assignedPerson?.fullName || '',
      status: this.effectiveStatus(op),
      normHours: Number(op.normHours || 0),
      actualHours: Number(op.actualHours || 0) || totals.workHours,
      pauseHours: totals.pauseHours,
      acceptedQty: (op.qualityRecords || []).reduce((sum: number, record: any) => sum + Number(record.acceptedQty || 0), 0),
      defectQty: (op.qualityRecords || []).reduce((sum: number, record: any) => sum + Number(record.defectQty || 0), 0),
      reworkQty: (op.qualityRecords || []).reduce((sum: number, record: any) => sum + Number(record.reworkQty || 0), 0),
      reasonCode: null,
      reasonName: '',
      reasonCategory: '',
      affectsWorkerKpi: true,
    };
  }

  private reportFromRows(input: { section: string; shift: any; start: Date; end: Date; rows: any[]; person?: string }) {
    const rows = input.rows;
    const normHours = rows.reduce((sum, row) => sum + Number(row.normHours || 0), 0);
    const actualHours = rows.reduce((sum, row) => sum + Number(row.actualHours || 0), 0);
    const pauseHours = rows.reduce((sum, row) => sum + Number(row.pauseHours || 0), 0);
    const kpiActualHours = rows.reduce((sum, row) => sum + (row.affectsWorkerKpi ? Number(row.actualHours || 0) : 0), 0);
    const acceptedQty = rows.reduce((sum, row) => sum + Number(row.acceptedQty || 0), 0);
    const defectQty = rows.reduce((sum, row) => sum + Number(row.defectQty || 0), 0);
    const reworkQty = rows.reduce((sum, row) => sum + Number(row.reworkQty || 0), 0);
    const completed = rows.filter((row) => row.status === 'done').length;
    const inWork = rows.filter((row) => row.status === 'work' || row.status === 'paused').length;
    const paused = rows.filter((row) => row.status === 'paused').length;
    const reasonMap = new Map<string, { code: string; name: string; category: string; hours: number; count: number; affectsWorkerKpi: boolean }>();
    for (const row of rows.filter((item) => item.reasonCode)) {
      const current = reasonMap.get(row.reasonCode) || { code: row.reasonCode, name: row.reasonName || row.reasonCode, category: row.reasonCategory || 'other', hours: 0, count: 0, affectsWorkerKpi: row.affectsWorkerKpi };
      current.hours += Number(row.pauseHours || row.actualHours || 0);
      current.count += 1;
      reasonMap.set(row.reasonCode, current);
    }
    const workerMap = new Map<string, any>();
    for (const row of rows) {
      const worker = row.person || 'Не указан';
      const current = workerMap.get(worker) || { worker, operations: 0, completed: 0, normHours: 0, actualHours: 0, pauseHours: 0, acceptedQty: 0, defectQty: 0, reworkQty: 0, productivityPct: 0 };
      current.operations += 1;
      if (row.status === 'done') current.completed += 1;
      current.normHours += Number(row.normHours || 0);
      current.actualHours += Number(row.actualHours || 0);
      current.pauseHours += Number(row.pauseHours || 0);
      current.acceptedQty += Number(row.acceptedQty || 0);
      current.defectQty += Number(row.defectQty || 0);
      current.reworkQty += Number(row.reworkQty || 0);
      workerMap.set(worker, current);
    }
    const workers = Array.from(workerMap.values()).map((row) => ({
      ...row,
      normHours: Math.round(row.normHours * 10) / 10,
      actualHours: Math.round(row.actualHours * 10) / 10,
      pauseHours: Math.round(row.pauseHours * 10) / 10,
      productivityPct: row.actualHours ? Math.round((row.normHours / row.actualHours) * 1000) / 10 : 0,
    })).sort((a, b) => b.completed - a.completed || b.normHours - a.normHours);
    const productivityPct = actualHours ? Math.round((normHours / actualHours) * 1000) / 10 : 0;
    return {
      section: input.section || null,
      person: input.person || null,
      shift: input.shift,
      period: { from: input.start.toISOString(), to: input.end.toISOString() },
      kpi: {
        operations: rows.length,
        completed,
        inWork,
        paused,
        normHours: Math.round(normHours * 10) / 10,
        actualHours: Math.round(actualHours * 10) / 10,
        pauseHours: Math.round(pauseHours * 10) / 10,
        kpiActualHours: Math.round(kpiActualHours * 10) / 10,
        efficiencyPct: productivityPct,
        productivityPct,
        acceptedQty,
        defectQty,
        reworkQty,
        defectRatePct: acceptedQty + defectQty ? Math.round((defectQty / (acceptedQty + defectQty)) * 1000) / 10 : 0,
        workers: workers.length,
      },
      reasons: Array.from(reasonMap.values()).map((row) => ({ ...row, hours: Math.round(row.hours * 10) / 10 })),
      workers,
      rows,
      generatedAt: new Date().toISOString(),
    };
  }

  private productionOperationStateById(run: ProductionRun) {
    const map = new Map<string, { status: string; unitId?: string | null; operationId: string; lockedBy?: string | null; shiftId?: number | null; reasonCode?: string | null; timeCategory?: string | null }>();
    for (const op of run.operations || []) {
      map.set(op.id, { status: op.status, unitId: null, operationId: op.operationId, lockedBy: op.lockedBy || null, shiftId: op.shiftId || null, reasonCode: op.deviationReasonCode || op.pauseReasonCode || null, timeCategory: op.timeCategory || null });
    }
    for (const unit of run.units || []) {
      for (const op of unit.operations || []) {
        map.set(op.id, { status: op.status, unitId: unit.unitId, operationId: op.operationId, lockedBy: op.lockedBy || null, shiftId: op.shiftId || null, reasonCode: op.deviationReasonCode || op.pauseReasonCode || null, timeCategory: op.timeCategory || null });
      }
    }
    return map;
  }

  private assertNoConcurrentProductionStart(before: Map<string, { status: string; lockedBy?: string | null }>, after: Map<string, { status: string; lockedBy?: string | null }>) {
    for (const [id, next] of after.entries()) {
      const previous = before.get(id);
      if (next.status === 'work' && previous?.status === 'work') {
        throw new ConflictException(`РћРїРµСЂР°С†РёСЏ СѓР¶Рµ РІ СЂР°Р±РѕС‚Рµ${previous.lockedBy ? `: ${previous.lockedBy}` : ''}`);
      }
    }
  }

  private assertNoConcurrentProductionStartForUnitOperations(before: Map<string, { status: string; lockedBy?: string | null }>, after: Map<string, { status: string; lockedBy?: string | null }>) {
    for (const [id, next] of after.entries()) {
      const previous = before.get(id);
      if (next.status === 'work' && previous?.status === 'work') {
        throw new ConflictException(`Production operation is already in work${previous.lockedBy ? `: ${previous.lockedBy}` : ''}`);
      }
    }
  }

  private async recordProductionOperationEvents(
    run: ProductionRun,
    before: Map<string, { status: string; unitId?: string | null; operationId: string }>,
    after: Map<string, { status: string; unitId?: string | null; operationId: string; lockedBy?: string | null; shiftId?: number | null; reasonCode?: string | null; timeCategory?: string | null }>,
    client: Prisma.TransactionClient,
    now: string,
  ) {
    for (const [id, next] of after.entries()) {
      const previous = before.get(id);
      if (!previous || previous.status === next.status) continue;
      const eventType = this.productionEventType(previous.status, next.status);
      if (!eventType) continue;
      await client.productionOperationEvent.create({
        data: {
          runId: run.id,
          unitId: next.unitId || undefined,
          operationPk: id,
          eventType,
          actor: next.lockedBy || run.operator || undefined,
          timestamp: new Date(now),
          shiftId: next.shiftId || undefined,
          reasonCode: next.reasonCode || undefined,
          timeCategory: next.timeCategory || undefined,
          payload: { from: previous.status, to: next.status, operationId: next.operationId },
        },
      });
    }
  }

  private async assignProductionOperationShifts(run: ProductionRun, client: Prisma.TransactionClient, timestamp: Date) {
    const assign = async (op: ProductionOperation) => {
      if (op.shiftId || (op.status !== 'work' && op.status !== 'paused' && op.status !== 'done')) return;
      const shift = await this.shiftForOperation(op.section, timestamp, client);
      if (shift) op.shiftId = shift.id;
    };
    for (const op of run.operations || []) await assign(op);
    for (const unit of run.units || []) for (const op of unit.operations || []) await assign(op);
  }

  private productionEventType(previous: string, next: string) {
    return productionEventTypeFromTransition(previous, next);
  }

  private async syncReferenceData() {
    const products = await this.allProductProcesses();
    const [routeOperations, capacities] = await Promise.all([
      this.prisma.routeOperation.findMany({ where: { routeTemplate: { isActive: true } } }),
      this.prisma.sectionCapacity.findMany(),
    ]);
    const sectionNames = new Set<string>();
    const operations = new Map<string, { operationCode: string; name: string; defaultSection?: string; defaultNormHours?: number; partOrAssembly?: string }>();
    const addOperation = (operationCode: unknown, name: unknown, section: unknown, normHours?: unknown, partOrAssembly?: unknown) => {
      const code = String(operationCode || '').trim().toUpperCase();
      const title = String(name || '').trim();
      const sectionName = String(section || '').trim();
      if (!code || !title) return;
      if (REMOVED_REFERENCE_OPERATION_CODES.has(code)) return;
      if (sectionName) sectionNames.add(sectionName);
      if (!operations.has(code)) operations.set(code, {
        operationCode: code,
        name: title,
        defaultSection: sectionName || undefined,
        defaultNormHours: Number.isFinite(Number(normHours)) ? Number(normHours) : undefined,
        partOrAssembly: String(partOrAssembly || '').trim() || undefined,
      });
    };
    for (const product of products) {
      for (const step of product.processSteps) addOperation(step.operationId, step.name, step.section, step.normHours, step.partOrAssembly);
    }
    for (const operation of routeOperations) addOperation(operation.operationCode, operation.name, operation.section, operation.normHours, operation.flow);
    for (const capacity of capacities) {
      const section = String(capacity.section || '').trim();
      if (section) sectionNames.add(section);
    }
    await Promise.all(Array.from(sectionNames).map((name) => this.prisma.referenceSection.upsert({
      where: { name },
      create: { name },
      update: {},
    })));
    const operationCodes = Array.from(operations.keys());
    await Promise.all(Array.from(operations.values()).map((op) => this.prisma.referenceOperation.upsert({
      where: { operationCode: op.operationCode },
      create: op,
      update: {
        name: op.name,
        defaultSection: op.defaultSection || null,
        defaultNormHours: op.defaultNormHours ?? null,
        partOrAssembly: op.partOrAssembly || null,
        isActive: true,
      },
    })));
    if (operationCodes.length) {
      await this.prisma.referenceOperation.deleteMany({ where: { operationCode: { notIn: operationCodes } } });
    }
    await this.prisma.referenceOperation.updateMany({
      where: { operationCode: { in: Array.from(REMOVED_REFERENCE_OPERATION_CODES) } },
      data: { isActive: false },
    });
  }

  private async ensureTerminalUserForSection(section: string) {
    const existing = await this.prisma.appUser.findFirst({ where: { role: 'terminal', workCenterSection: section } });
    if (existing) {
      return this.prisma.appUser.update({
        where: { id: existing.id },
        data: {
          displayName: `Terminal: ${section}`,
          passwordHash: existing.passwordHash || this.defaultTerminalPasswordHash(existing.login),
          terminalQrToken: existing.terminalQrToken || this.terminalQrToken(),
          isTerminalOnly: true,
          isActive: true,
        },
      });
    }
    const terminals = await this.prisma.appUser.findMany({
      where: { role: 'terminal', login: { startsWith: 'terminal.' } },
      select: { login: true },
    });
    const maxIndex = terminals.reduce((max, user) => {
      const match = user.login.match(/^terminal\.(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const login = `terminal.${String(maxIndex + 1).padStart(2, '0')}`;
    return this.prisma.appUser.create({
      data: {
        login,
        role: 'terminal',
        displayName: `Terminal: ${section}`,
        passwordHash: this.defaultTerminalPasswordHash(login),
        terminalQrToken: this.terminalQrToken(),
        workCenterSection: section,
        isTerminalOnly: true,
        isActive: true,
      },
    });
  }

  private async findProductionRun(id: string) {
    const runs = await this.readProductionRuns();
    const run = runs.find((item) => item.id === id);
    if (!run) throw new NotFoundException('Запуск производства не найден');
    return run;
  }

  private async allProductProcesses(): Promise<ProductProcess[]> {
    const manual = await this.prisma.nomenclatureProcessRecord.findMany({ orderBy: { updatedAt: 'desc' } });
    const manualProcesses = manual.map((record) => ({ ...(record.data as unknown as ProductProcess), sourceType: 'manual' }));
    const unique = new Map<string, ProductProcess>();
    for (const product of [...manualProcesses, ...(productsProcesses.products as ProductProcess[]).map((product) => ({ ...product, sourceType: 'imported' }))]) {
      const key = this.productMatchKeys(product.productCode)[0] || this.productMatchKeys(product.equipment)[0] || product.id;
      if (!unique.has(key)) unique.set(key, product);
    }
    return Array.from(unique.values());
  }

  private async findProductProcessOrThrow(identifiers: Array<unknown>, emptyMessage: string): Promise<ProductProcess> {
    const keys = identifiers.map((value) => String(value || '').trim()).filter(Boolean);
    if (!keys.length) throw new BadRequestException(emptyMessage);
    const product = await this.findProductProcess(keys);
    if (product) return product;
    const requested = keys.join(', ');
    const available = await this.availableProductProcessesText();
    throw new NotFoundException(`Техпроцесс номенклатуры не найден для: ${requested}. Доступные техпроцессы: ${available}. Выберите номенклатуру из справочника или используйте fallback aliases: RC800, 209983, Multiholder, 231265, Печь, FURNACE-SAMPLE.`);
  }

  private normalizeManualProcess(body: ManualProcessInput): ProductProcess {
    const equipment = String(body.equipment || '').trim();
    const productCode = String(body.productCode || '').trim();
    const category = String(body.category || 'Ручная номенклатура').trim();
    if (!equipment) throw new BadRequestException('Заполните наименование номенклатуры');
    if (!productCode) throw new BadRequestException('Заполните код номенклатуры');
    const rawSteps = Array.isArray(body.processSteps) ? body.processSteps : [];
    if (!rawSteps.length) throw new BadRequestException('Добавьте хотя бы одну операцию техпроцесса');
    const seen = new Set<string>();
    const processSteps = rawSteps.map((step, index) => {
      const operationId = String(step.operationId || '').trim().toUpperCase();
      const name = String(step.name || '').trim();
      const section = String(step.section || '').trim();
      if (!operationId) throw new BadRequestException(`Заполните ID операции в строке ${index + 1}`);
      if (seen.has(operationId)) throw new BadRequestException(`ID операции ${operationId} повторяется`);
      seen.add(operationId);
      if (!name) throw new BadRequestException(`Заполните наименование операции ${operationId}`);
      if (!section) throw new BadRequestException(`Заполните участок операции ${operationId}`);
      const previousOperationCodes = Array.isArray(step.previousOperationCodes) ? step.previousOperationCodes.map((code) => String(code || '').trim().toUpperCase()).filter(Boolean) : [];
      const nextOperationCodes = Array.isArray(step.nextOperationCodes) ? step.nextOperationCodes.map((code) => String(code || '').trim().toUpperCase()).filter(Boolean) : [];
      return {
        sequence: index + 1,
        operationId,
        level: Math.max(1, Number(step.level || 1)),
        x: Number.isFinite(Number(step.x)) ? Math.max(0, Math.round(Number(step.x))) : undefined,
        y: Number.isFinite(Number(step.y)) ? Math.max(0, Math.round(Number(step.y))) : undefined,
        partOrAssembly: String(step.partOrAssembly || 'Общее').trim(),
        name,
        section,
        previousOperationCodes,
        nextOperationCodes,
        normHours: Math.max(0, Number(step.normHours || 0)),
        sourceSheet: 'Конструктор',
        sourceRow: index + 1,
        confidence: 'manual',
        groupCapable: this.isGroupCapableStep(step),
      };
    });
    const codes = new Set(processSteps.map((step) => step.operationId));
    for (const step of processSteps) {
      step.previousOperationCodes = step.previousOperationCodes.filter((code) => codes.has(code) && code !== step.operationId);
      step.nextOperationCodes = step.nextOperationCodes.filter((code) => codes.has(code) && code !== step.operationId);
    }
    this.assertAcyclicProcess(processSteps);
    const id = String(body.id || this.slugify(`${equipment}-${productCode}`)).trim();
    const totalNormHours = Math.round(processSteps.reduce((sum, step) => sum + Number(step.normHours || 0), 0) * 10) / 10;
    return {
      id,
      equipment,
      productCode,
      category,
      sourceFile: 'Конструктор техпроцесса',
      sourceWorkbookSheets: ['Blueprint'],
      sourceDimensions: { Blueprint: { rows: processSteps.length, columns: 11 } },
      summary: body.summary || {},
      processSteps,
      totalNormHours,
      confidence: 'manual',
      notes: Array.isArray(body.notes) && body.notes.length ? body.notes : ['Создано вручную в конструкторе техпроцесса.'],
      extractedAt: new Date().toISOString(),
      sourceType: 'manual',
    } as ProductProcess;
  }

  private slugify(value: string) {
    const ascii = value.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '');
    return ascii || `manual-${Date.now()}`;
  }

  private assertAcyclicProcess(processSteps: Array<{ operationId: string; nextOperationCodes: string[] }>) {
    const nextByCode = new Map(processSteps.map((step) => [step.operationId, step.nextOperationCodes || []]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (code: string, path: string[]) => {
      if (visiting.has(code)) throw new BadRequestException(`В техпроцессе найдена циклическая связь: ${[...path, code].join(' -> ')}`);
      if (visited.has(code)) return;
      visiting.add(code);
      for (const next of nextByCode.get(code) || []) visit(next, [...path, code]);
      visiting.delete(code);
      visited.add(code);
    };
    for (const step of processSteps) visit(step.operationId, []);
  }

  private defaultTerminalPasswordHash(login: string) {
    const iterations = 120_000;
    const salt = String(login || 'terminal');
    const digest = pbkdf2Sync('1234', salt, iterations, 32, 'sha256').toString('base64url');
    return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
  }

  private terminalQrToken() {
    return `rpt_${randomUUID().replace(/-/g, '')}`;
  }

  private normalizeProductionRunOrderNumber(value: unknown) {
    const orderNumber = String(value || '').trim();
    if (!orderNumber) return '';
    if (orderNumber.length > 20) throw new BadRequestException('Номер заказа должен быть не длиннее 20 символов');
    return orderNumber;
  }

  private async findProductProcess(identifiers: string[]): Promise<ProductProcess | undefined> {
    const requested = new Set(identifiers.flatMap((value) => this.productMatchKeys(value)));
    return (await this.allProductProcesses()).find((product) => this.productProcessMatchKeys(product).some((key) => requested.has(key)));
  }

  private productProcessMatchKeys(product: ProductProcess): string[] {
    return [product.id, product.productCode, product.equipment, ...this.fallbackProductAliases(product)].flatMap((value) => this.productMatchKeys(value));
  }

  private productMatchKeys(value: unknown): string[] {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return [];
    const compact = text.replace(/[\s\-_]+/g, '');
    return Array.from(new Set([text, compact]));
  }

  private fallbackProductAliases(product: ProductProcess): string[] {
    if (product.id === 'rc800-209983') {
      return ['RC800', '209983', 'Печь', 'Печь промышленная', 'FURNACE-SAMPLE', 'FURNACE-DEMO'];
    }
    if (product.id === 'multiholder-231265') return ['Multiholder', 'Multiholder MH-6-3-TS2', '231265'];
    return [];
  }

  private async availableProductProcessesText() {
    return (await this.allProductProcesses()).map((product) => `${product.equipment} (${product.productCode}, ${product.id})`).join('; ');
  }

  private async updateProductionRun(id: string, mutate: (run: ProductionRun, now: string) => void) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const run = await this.readProductionRun(id, tx);
          if (!run) throw new NotFoundException('Запуск производства не найден');
          const before = this.productionOperationStateById(run);
          const now = new Date().toISOString();
          mutate(run, now);
          await this.assignProductionOperationShifts(run, tx, new Date(now));
          const after = this.productionOperationStateById(run);
          await this.recordProductionOperationEvents(run, before, after, tx, now);
          await this.writeProductionRun(run, tx);
          return this.enrichProductionRun(run);
        }, SERIALIZABLE_TRANSACTION_OPTIONS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
          || message.includes('40P01')
          || message.toLowerCase().includes('deadlock detected')
          || message.toLowerCase().includes('write conflict');
        if (!retryable || attempt === maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
      }
    }
    throw new ConflictException('Production run update failed');
  }

  private async withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, SERIALIZABLE_TRANSACTION_OPTIONS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
          || message.includes('40P01')
          || message.toLowerCase().includes('deadlock detected')
          || message.toLowerCase().includes('write conflict');
        if (!retryable || attempt === maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
      }
    }
    throw new ConflictException('Production run update failed');
  }

  private buildProductionRun(product: any, quantity: number, body: { operator?: string; priority?: ProductionPriority; priorityRank?: number; comment?: string }, order: { id: number | null; orderNumber: string } | null): ProductionRun {
    const priority = this.normalizeProductionPriority(body.priority);
    const now = new Date().toISOString();
    const runId = `RUN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const units = Array.from({ length: quantity }, (_, index) => {
      const unitNo = index + 1;
      const unitId = `${runId}-U${String(unitNo).padStart(3, '0')}`;
      return {
        unitId,
        unitNo,
        status: 'draft' as ProductionRunStatus,
        progress: 0,
        operations: this.buildProductionOperations(product, priority, body.priorityRank, unitId),
      };
    });
    const run: ProductionRun = {
      id: runId,
      orderId: order?.id || null,
      orderNumber: order?.orderNumber || null,
      batchNumber: runId,
      batchName: `${product.equipment} · ${quantity} шт.`,
      batchCreatedBy: body.operator?.trim() || null,
      batchSource: order?.orderNumber ? 'order-selection' : 'manual-selection',
      productId: product.id,
      productCode: product.productCode,
      productName: product.equipment,
      quantity,
      totalQuantity: quantity,
      launchedQuantity: quantity,
      comment: body.comment?.trim() || null,
      operator: body.operator?.trim() || null,
      status: 'draft',
      priority,
      priorityRank: this.productionPriorityRank(priority, body.priorityRank),
      createdAt: now,
      startedAt: null,
      completedAt: null,
      normHours: Number(product.totalNormHours || 0),
      operations: this.buildProductionOperations(product, priority, body.priorityRank, runId),
      units,
    };
    this.autoStartInitialOperation(run, body, now);
    return run;
  }

  private buildProductionOperations(product: any, priority: ProductionPriority, priorityRank: number | undefined, scopeId: string): ProductionOperation[] {
    return product.processSteps.map((step: any) => ({
      id: `${scopeId}-${step.operationId}`,
      operationId: step.operationId,
      sequence: step.sequence,
      level: step.level,
      partOrAssembly: step.partOrAssembly,
      name: step.name,
      section: step.section,
      previousOperationCodes: step.previousOperationCodes || [],
      nextOperationCodes: step.nextOperationCodes || [],
      normHours: Number(step.normHours || 0),
      status: 'queued',
      priority,
      priorityRank: this.productionPriorityRank(priority, priorityRank),
      canStart: false,
      blockedBy: [],
      dependencyStatus: 'available',
      lockedBy: null,
      lockedAt: null,
      lockReason: null,
      lockToken: null,
      lockTerminalId: null,
      lockClientId: null,
      lockExpiresAt: null,
      lockVersion: 0,
      selectedAt: null,
      startedAt: null,
      pausedAt: null,
      completedAt: null,
      actualHours: 0,
      shiftId: null,
      pauseReasonCode: null,
      deviationReasonCode: null,
      timeCategory: null,
      acceptedQty: 0,
      defectQty: 0,
      reworkQty: 0,
      qualityStatus: null,
      groupCapable: Boolean(step.groupCapable) || this.isGroupCapableStep(step),
    }));
  }

  private applyProductionOperationAction(run: ProductionRun, op: ProductionOperation, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionActionBody, now: string, unit?: ProductionUnit) {
    const operations = unit?.operations || run.operations;
    if (run.status === 'done') throw new BadRequestException('Запуск уже завершен');
    const dependency = action === 'start' ? this.productionDependencyInfo({ ...run, operations }, op) : undefined;
    const transition = productionOperationTransition(op.status, action, { canStart: dependency?.canStart, blockedBy: dependency?.blockedBy, lockedBy: op.lockedBy });
    if (transition.ok === false) {
      const ErrorClass = transition.conflict ? ConflictException : BadRequestException;
      throw new ErrorClass(transition.reason);
    }
    if (transition.noop) return;
    if (action === 'start' && body.lockToken) {
      const token = String(body.lockToken).trim();
      const expiresAt = op.lockExpiresAt ? new Date(op.lockExpiresAt).getTime() : 0;
      if (!op.lockToken || op.lockToken !== token || !Number.isFinite(expiresAt) || expiresAt < new Date(now).getTime()) {
        throw new ConflictException('Выбор операции потерял актуальность. Обновите очередь терминала.');
      }
    }
    if (body.expectedVersion !== undefined && Number(body.expectedVersion) !== Number(op.lockVersion || 0)) {
      throw new ConflictException('Версия операции изменилась. Обновите очередь терминала.');
    }
    if (action === 'start') {
      op.status = 'work';
      op.startedAt ||= now;
      op.pausedAt = null;
	      op.lockedBy = this.productionLockOwner(body, run);
	      op.lockedAt = now;
	      op.lockReason = 'work';
      op.lockExpiresAt = null;
      op.lockVersion = Number(op.lockVersion || 0) + 1;
	      op.timeCategory = 'work';
      run.status = 'work';
      run.startedAt ||= now;
      if (unit) unit.status = 'work';
    }
    if (action === 'pause') {
      op.status = 'paused';
      op.pausedAt = now;
	      op.lockReason = 'paused';
	      op.lockedBy ||= this.productionLockOwner(body, run);
	      op.lockedAt ||= now;
	      if (body.reasonCode) op.pauseReasonCode = String(body.reasonCode).trim().toUpperCase();
	      op.timeCategory = 'worker_pause';
      op.lockVersion = Number(op.lockVersion || 0) + 1;
      run.status = 'paused';
      if (unit) unit.status = 'paused';
    }
    if (action === 'resume') {
      op.status = 'work';
      op.pausedAt = null;
      op.lockReason = 'work';
      op.lockedBy ||= this.productionLockOwner(body, run);
      op.lockedAt ||= now;
      op.lockVersion = Number(op.lockVersion || 0) + 1;
      run.status = 'work';
      if (unit) unit.status = 'work';
    }
    if (action === 'complete') {
	      op.status = 'done';
	      op.completedAt = now;
	      op.pausedAt = null;
	      op.actualHours = this.productionActualHours(op, now);
	      if (body.reasonCode && op.actualHours > Number(op.normHours || 0)) op.deviationReasonCode = String(body.reasonCode).trim().toUpperCase();
	      if (body.acceptedQty !== undefined) op.acceptedQty = Math.max(0, Number(body.acceptedQty || 0));
	      if (body.defectQty !== undefined) op.defectQty = Math.max(0, Number(body.defectQty || 0));
	      if (body.reworkQty !== undefined) op.reworkQty = Math.max(0, Number(body.reworkQty || 0));
	      if ((op.reworkQty || 0) > 0) op.qualityStatus = 'rework_required';
	      else if ((op.defectQty || 0) > 0) op.qualityStatus = 'done_with_defects';
	      else if ((op.acceptedQty || 0) > 0) op.qualityStatus = 'done';
	      op.lockedBy = null;
      op.lockedAt = null;
      op.lockReason = null;
      op.lockToken = null;
      op.lockTerminalId = null;
      op.lockClientId = null;
      op.lockExpiresAt = null;
      op.lockVersion = Number(op.lockVersion || 0) + 1;
    }
    if (unit) this.refreshUnitStatus(unit);
    this.refreshRunStatus(run, now);
  }

  private autoStartInitialOperation(run: ProductionRun, body: { operator?: string; comment?: string }, now: string) {
    const owner = String(body.operator || 'Автостарт').trim();
    const startInScope = (operations: ProductionOperation[]) => {
      const ordered = [...operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      const op = ordered.find((item) => this.isInitialOp10(item.operationId)) || ordered[0];
      if (!op || op.status !== 'queued') return;
      const dependency = this.productionDependencyInfo({ ...run, operations }, op);
      if (!dependency.canStart) return;
      const isOp10 = this.isInitialOp10(op.operationId);
      op.status = isOp10 ? 'done' : 'work';
      op.startedAt ||= now;
      op.pausedAt = null;
      op.lockedBy = owner;
      op.lockedAt = now;
      op.lockReason = isOp10 ? 'auto-complete initial operation' : 'auto-start first operation fallback';
      if (isOp10) {
        op.completedAt ||= now;
        op.actualHours = Math.max(Number(op.actualHours || 0), Math.round((Number(op.normHours || 0) || 0.1) * 10) / 10);
      }
    };
    startInScope(run.operations);
    run.units?.forEach((unit) => {
      startInScope(unit.operations);
      this.refreshUnitStatus(unit);
    });
    run.status = 'work';
    run.startedAt ||= now;
    this.refreshRunStatus(run, now);
  }

  private isInitialOp10(operationId: string) {
    const normalized = String(operationId || '').trim().toUpperCase().replace(/[Оо]/g, 'O').replace(/[Рр]/g, 'P');
    return normalized === 'OP10' || normalized === 'OP-00001';
  }

  private isGroupCapableStep(step: { name?: unknown; section?: unknown; groupCapable?: unknown }) {
    return isGroupCapableEntity(step);
  }

  private isGroupCapableProductionOperation(op: { name?: unknown; section?: unknown; groupCapable?: unknown }) {
    return isGroupCapableEntity(op);
  }

  private isBulkGroupAllowedProductionOperation(op: { operationId?: unknown; name?: unknown; section?: unknown }) {
    return isBulkGroupAllowedProductionOperation(op);
  }

  private enrichProductionRun(run: ProductionRun) {
    this.normalizeProductionRun(run);
    const progress = run.units?.length ? this.average(run.units.map((unit) => unit.progress || this.productionProgress(unit.operations))) : this.productionProgress(run.operations);
    const unitOperations = run.units?.flatMap((unit) => unit.operations.map((op) => ({ ...op, unitId: unit.unitId, unitNo: unit.unitNo }))) || [];
    const activeOperation = unitOperations.find((op) => op.status === 'work') || unitOperations.find((op) => op.status === 'paused') || unitOperations.find((op) => op.status !== 'done') || run.operations.find((op) => op.status !== 'done') || null;
    const operations = unitOperations.length ? unitOperations : run.operations;
    const startedAt = run.startedAt || this.firstProductionOperationStart(operations);
    const completedAt = run.completedAt || (run.status === 'done' ? this.lastProductionOperationFinish(operations) : null);
    const duration = this.productionDuration(startedAt, completedAt);
    return { ...run, startedAt, completedAt, actualDurationMinutes: duration.minutes, actualDurationHours: duration.hours, units: run.units?.map((unit) => this.decorateProductionUnit(run, unit)), progress: Math.round(progress * 10) / 10, activeOperation };
  }

  private productionRunDispatchRow(run: ProductionRun) {
    const enriched = this.enrichProductionRun(run) as any;
    const progress = enriched.progress;
    const currentOperation = enriched.activeOperation
      || null;
    const ready = progress >= 100 || run.status === 'done';
    return {
      sourceType: 'production-run',
      id: run.id,
      displayId: run.id,
      orderNumber: run.orderNumber || run.id,
      productCode: run.productCode,
      productName: run.productName,
      code: run.productCode,
      quantity: run.quantity,
      dueDate: null,
      customer: run.orderNumber ? 'Заказ Excel' : 'Без заказа',
      priority: run.priority || 'normal',
      priorityRank: run.priorityRank || this.productionPriorityRank(run.priority),
      status: run.status,
      readableStatus: this.productionRunReadableStatus(run.status),
      progress,
      ready,
      overdue: false,
      section: currentOperation?.section || null,
      createdAt: run.createdAt,
      operator: run.operator,
      isWithoutOrder: !run.orderNumber,
      currentStage: currentOperation ? {
        id: currentOperation.id,
        operationCode: currentOperation.operationId,
        name: currentOperation.name,
         status: currentOperation.status,
         section: currentOperation.section,
         assignedPerson: currentOperation.lockedBy || run.operator || null,
         canStart: currentOperation.canStart,
         blockedBy: currentOperation.blockedBy || [],
         dependencyStatus: currentOperation.dependencyStatus,
       } : null,
    };
  }

  private productionRunTerminalOperation(run: ProductionRun, op: ProductionOperation, unit?: ProductionUnit) {
    const dependency = this.productionDependencyInfo(unit ? { ...run, operations: unit.operations } : run, op);
    return {
      sourceType: 'production-run',
      runId: run.id,
      unitId: unit?.unitId,
      unitNo: unit?.unitNo,
      unitLabel: unit ? `${unit.unitNo}/${run.launchedQuantity || run.units?.length || run.quantity}` : null,
      operationId: op.id,
      id: op.id,
      displayId: run.id,
      orderNumber: run.orderNumber || run.id,
      isWithoutOrder: !run.orderNumber,
      productName: run.productName,
      productCode: run.productCode,
      quantity: run.quantity,
      operator: run.operator,
      priority: op.priority || run.priority || 'normal',
      priorityRank: op.priorityRank || run.priorityRank || this.productionPriorityRank(run.priority),
      section: op.section,
      operation: op.name,
      part: op.partOrAssembly,
      operationCode: op.operationId,
      name: op.name,
      normHours: op.normHours,
      status: op.status,
      canStart: dependency.canStart,
      blockedBy: dependency.blockedBy,
      dependencyStatus: dependency.dependencyStatus,
      lockedBy: op.lockedBy || null,
      lockedAt: op.lockedAt || null,
      lockReason: op.lockReason || null,
      lockExpiresAt: op.lockExpiresAt || null,
      lockVersion: Number(op.lockVersion || 0),
      selectedAt: op.selectedAt || null,
      assignedPerson: op.lockedBy || run.operator || null,
      startedAt: op.startedAt,
      finishedAt: op.completedAt,
      actualHours: op.actualHours || 0,
      pauseHours: 0,
      timeState: { workHours: op.actualHours || 0, pauseHours: 0, activeKind: op.status === 'work' ? 'work' : op.status === 'paused' ? 'pause' : null, activeStartedAt: op.status === 'work' ? op.startedAt : op.status === 'paused' ? op.pausedAt : null },
      quality: { checked: 0, accepted: 0, defect: 0, defectRatePct: 0, note: 'Качество для production run не фиксируется в терминале.' },
      nextOperationCodes: op.nextOperationCodes,
      previousOperationCodes: op.previousOperationCodes,
      groupCapable: Boolean(op.groupCapable) || this.isGroupCapableProductionOperation(op),
      bulkGroupAllowed: this.isBulkGroupAllowedProductionOperation(op),
    };
  }

  private productionUnitLabel(run: ProductionRun, unit: ProductionUnit) {
    return `${unit.unitNo}/${run.launchedQuantity || run.units?.length || run.quantity}`;
  }

  private productionCurrentOperation(operations: ProductionOperation[]) {
    const op = operations.find((item) => item.status === 'work')
      || operations.find((item) => item.status === 'paused')
      || operations.find((item) => item.status !== 'done')
      || operations[operations.length - 1]
      || null;
    return op ? { operationId: op.operationId, title: op.name, section: op.section, status: op.status, blockedBy: op.blockedBy || [] } : null;
  }

  private productionGraphPhase(op: ProductionOperation): ProcessGraphPhase {
    if (op.status === 'done') return 'done';
    if (op.status === 'work' || op.status === 'paused') return 'current';
    if (op.canStart === true) return 'ready';
    if (op.canStart === false && op.blockedBy?.length) return 'blocked';
    return 'upcoming';
  }

  private productionGraphLayout(run: ProductionRun, operations: ProductionOperation[]) {
    const columnWidth = 420;
    const rowHeight = 270;
    const nodeWidth = 280;
    const nodeHeight = 176;
    const paddingX = 72;
    const headerHeight = 72;
    const ordered = [...operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const codes = new Set(ordered.map((op) => op.operationId));
    const dependencies = new Map<string, string[]>();
    ordered.forEach((op) => {
      const previous = (op.previousOperationCodes || []).filter((code) => codes.has(code) && code !== op.operationId);
      const blockedBy = (op.blockedBy || []).filter((code) => codes.has(code) && code !== op.operationId);
      dependencies.set(op.operationId, Array.from(new Set([...previous, ...blockedBy])));
    });
    const levelCache = new Map<string, number>();
    const visiting = new Set<string>();
    const resolveLevel = (code: string): number => {
      if (levelCache.has(code)) return levelCache.get(code)!;
      if (visiting.has(code)) return 1;
      visiting.add(code);
      const previous = dependencies.get(code) || [];
      const level = previous.length ? Math.max(...previous.map(resolveLevel)) + 1 : 1;
      visiting.delete(code);
      levelCache.set(code, level);
      return level;
    };
    ordered.forEach((op) => resolveLevel(op.operationId));
    const levels = new Map<number, ProductionOperation[]>();
    ordered.forEach((op) => {
      const level = levelCache.get(op.operationId) || 1;
      const rows = levels.get(level) || [];
      rows.push(op);
      levels.set(level, rows);
    });
    const positions = new Map<string, { level: number; row: number; x: number; y: number }>();
    for (const [level, rows] of levels.entries()) {
      rows.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      rows.forEach((op, index) => positions.set(op.operationId, {
        level,
        row: index + 1,
        x: paddingX + (level - 1) * columnWidth,
        y: headerHeight + index * rowHeight,
      }));
    }
    const maxLevel = Math.max(1, ...Array.from(levels.keys()));
    const maxRows = Math.max(1, ...Array.from(levels.values()).map((rows) => rows.length));
    const edges = ordered.flatMap((op) => (dependencies.get(op.operationId) || []).map((from) => ({ from, to: op.operationId, type: 'dependency' })));
    return {
      positions,
      edges,
      layout: {
        columnWidth,
        rowHeight,
        nodeWidth,
        nodeHeight,
        canvasWidth: paddingX * 2 + maxLevel * columnWidth,
        canvasHeight: headerHeight + maxRows * rowHeight + 80,
      },
    };
  }

  private terminalSortRank(op: any) {
    const dependencyRank = op.dependencyStatus === 'blocked' || op.canStart === false ? 1_000_000 : 0;
    const statusRank = op.status === 'work' ? -300_000 : op.status === 'paused' ? -200_000 : 0;
    const priorityRank = Number(op.priorityRank || 50);
    const sequence = Number(op.sequence || op.sortOrder || op.id || 0);
    return dependencyRank + statusRank - priorityRank * 100 + sequence;
  }

  private isTerminalVisibleOperation(op: any) {
    if (op.status === 'work' || op.status === 'paused') return true;
    if (op.status === 'new' || op.status === 'queued') return op.canStart !== false;
    return false;
  }

  private terminalSection(user: AuthUser) {
    const section = String(user.workCenterSection || '').trim();
    if (!section) throw new ForbiddenException('Terminal account is not linked to a work center');
    return section;
  }

  private assertTerminalSection(user: AuthUser, section: string) {
    if (user.role === 'admin') return;
    const allowed = this.terminalSection(user);
    if (section.trim() !== allowed) throw new ForbiddenException('Operation is outside this terminal work center');
  }

  private productionRunReadableStatus(status: ProductionRunStatus) {
    return ({ draft: 'черновик', work: 'в работе', paused: 'пауза', done: 'готово' } as Record<ProductionRunStatus, string>)[status] || status;
  }

  private productionProgress(operations: ProductionOperation[]) {
    const total = operations.reduce((sum, op) => sum + op.normHours, 0);
    const done = operations.filter((op) => op.status === 'done').reduce((sum, op) => sum + op.normHours, 0);
    return total ? Math.round((done / total) * 1000) / 10 : 0;
  }

  private normalizeProductionRun(run: ProductionRun): ProductionRun {
    const priority = this.normalizeProductionPriority(run.priority);
    run.priority = priority;
    run.priorityRank = this.productionPriorityRank(priority, run.priorityRank);
    run.totalQuantity ??= run.quantity;
    run.launchedQuantity ??= run.units?.length || run.quantity;
    run.operations = (run.operations || []).map((op, index) => {
      op.priority = this.normalizeProductionPriority(op.priority || priority);
      op.priorityRank = this.productionPriorityRank(op.priority, op.priorityRank ?? run.priorityRank);
      op.previousOperationCodes = Array.isArray(op.previousOperationCodes) ? op.previousOperationCodes : [];
      op.nextOperationCodes = Array.isArray(op.nextOperationCodes) ? op.nextOperationCodes : [];
      op.lockedBy ??= null;
      op.lockedAt ??= null;
      op.lockReason ??= null;
      this.normalizeProductionOperationLease(op);
      op.shiftId ??= null;
      op.pauseReasonCode ??= null;
      op.deviationReasonCode ??= null;
      op.timeCategory ??= null;
      op.acceptedQty ??= 0;
      op.defectQty ??= 0;
      op.reworkQty ??= 0;
      op.qualityStatus ??= null;
      op.groupCapable = Boolean(op.groupCapable) || this.isGroupCapableProductionOperation(op);
      const dependency = this.productionDependencyInfo(run, op);
      op.canStart = dependency.canStart;
      op.blockedBy = dependency.blockedBy;
      op.dependencyStatus = dependency.dependencyStatus;
      return op;
    });
    if (!run.units?.length) {
      run.units = Array.from({ length: Math.max(1, Number(run.quantity || 1)) }, (_, index) => ({
        unitId: `${run.id}-U${String(index + 1).padStart(3, '0')}`,
        unitNo: index + 1,
        status: run.status,
        progress: this.productionProgress(run.operations),
        operations: run.operations.map((op) => ({ ...op, id: `${run.id}-U${String(index + 1).padStart(3, '0')}-${op.operationId}` })),
      }));
    }
    run.units.forEach((unit) => {
      unit.operations = (unit.operations || []).map((op, index) => {
        op.priority = this.normalizeProductionPriority(op.priority || priority);
        op.priorityRank = this.productionPriorityRank(op.priority, op.priorityRank ?? run.priorityRank);
        op.previousOperationCodes = Array.isArray(op.previousOperationCodes) ? op.previousOperationCodes : [];
        op.nextOperationCodes = Array.isArray(op.nextOperationCodes) ? op.nextOperationCodes : [];
        op.lockedBy ??= null;
        op.lockedAt ??= null;
        op.lockReason ??= null;
        this.normalizeProductionOperationLease(op);
        op.shiftId ??= null;
        op.pauseReasonCode ??= null;
        op.deviationReasonCode ??= null;
        op.timeCategory ??= null;
        op.acceptedQty ??= 0;
        op.defectQty ??= 0;
        op.reworkQty ??= 0;
        op.qualityStatus ??= null;
        op.groupCapable = Boolean(op.groupCapable) || this.isGroupCapableProductionOperation(op);
        const dependency = this.productionDependencyInfo({ ...run, operations: unit.operations }, op);
        op.canStart = dependency.canStart;
        op.blockedBy = dependency.blockedBy;
        op.dependencyStatus = dependency.dependencyStatus;
        return op;
      });
      this.refreshUnitStatus(unit);
    });
    this.refreshRunStatus(run);
    return run;
  }

  private normalizeProductionOperationLease(op: ProductionOperation) {
    op.lockToken ??= null;
    op.lockTerminalId ??= null;
    op.lockClientId ??= null;
    op.lockExpiresAt ??= null;
    op.lockVersion = Number(op.lockVersion || 0);
    op.selectedAt ??= null;
    if (op.status === 'queued' && op.lockExpiresAt && new Date(op.lockExpiresAt).getTime() < Date.now()) {
      op.lockedBy = null;
      op.lockedAt = null;
      op.lockReason = null;
      op.lockToken = null;
      op.lockTerminalId = null;
      op.lockClientId = null;
      op.lockExpiresAt = null;
    }
  }

  private async assertProductionOperationSelectable(client: Prisma.TransactionClient, runId: string, unitId: string | null, operationPk: string) {
    const run = await this.readProductionRun(runId, client);
    if (!run) throw new NotFoundException('Запуск производства не найден');
    const unit = unitId ? run.units?.find((item) => item.unitId === unitId) : undefined;
    const operations = unit?.operations || run.operations;
    const op = operations.find((item) => item.id === operationPk);
    if (!op) throw new NotFoundException('Операция единицы производства не найдена');
    if (run.archived || run.status === 'done' || op.status !== 'queued') {
      throw new ConflictException('Операция потеряла актуальность. Обновите очередь терминала.');
    }
    const dependency = this.productionDependencyInfo({ ...run, operations }, op);
    if (!dependency.canStart) {
      throw new ConflictException(`Операция ожидает предшественников: ${dependency.blockedBy.join(', ') || 'не готова'}`);
    }
  }

  private async throwProductionSelectionConflict(client: Prisma.TransactionClient, operationPk: string, now: Date): Promise<never> {
    const current = await client.productionUnitOperation.findUnique({ where: { id: operationPk } });
    if (!current) throw new NotFoundException('Операция единицы производства не найдена');
    if (current.status !== 'queued') throw new ConflictException('Операция потеряла актуальность. Обновите очередь терминала.');
    if (current.lockToken && current.lockExpiresAt && current.lockExpiresAt.getTime() >= now.getTime()) {
      throw new ConflictException(`Операция уже выбрана другим терминалом${current.lockedBy ? `: ${current.lockedBy}` : ''}`);
    }
    throw new ConflictException('Операция потеряла актуальность. Обновите очередь терминала.');
  }

  private terminalSelectionActor(user: AuthUser, body: ProductionSelectionBody) {
    return String(body.operator || user.displayName || user.login || 'Терминал').trim();
  }

  private productionSelectionResponse(op: any) {
    return {
      ok: true,
      id: op.id,
      runId: op.runId,
      unitId: op.unitId || null,
      operationId: op.operationId,
      status: op.status,
      lockedBy: op.lockedBy || null,
      lockToken: op.lockToken || null,
      lockExpiresAt: op.lockExpiresAt ? op.lockExpiresAt.toISOString() : null,
      lockVersion: Number(op.lockVersion || 0),
      selectedAt: op.selectedAt ? op.selectedAt.toISOString() : null,
    };
  }

  private productionDependencyInfo(run: ProductionRun, op: ProductionOperation) {
    if (op.status === 'done') return { canStart: false, blockedBy: [], dependencyStatus: 'done' as ProductionDependencyStatus };
    if (op.status === 'work' || op.status === 'paused') return { canStart: false, blockedBy: [], dependencyStatus: 'in_work' as ProductionDependencyStatus };
    const previous = this.productionPreviousCodes(run, op);
    const dispatch = this.findDispatchOperation(run.operations);
    const mustWaitDispatch = Boolean(dispatch && dispatch.id !== op.id && dispatch.operationId !== op.operationId && dispatch.status !== 'done');
    const blockedBy = previous.filter((code) => !run.operations.some((item) => item.operationId === code && item.status === 'done'));
    if (mustWaitDispatch && !blockedBy.includes(dispatch!.operationId)) blockedBy.unshift(dispatch!.operationId);
    return { canStart: blockedBy.length === 0, blockedBy, dependencyStatus: blockedBy.length ? 'blocked' as ProductionDependencyStatus : 'available' as ProductionDependencyStatus };
  }

  private refreshProductionDependencies(run: ProductionRun) {
    run.operations.forEach((op) => {
      const dependency = this.productionDependencyInfo(run, op);
      op.canStart = dependency.canStart;
      op.blockedBy = dependency.blockedBy;
      op.dependencyStatus = dependency.dependencyStatus;
    });
  }

  private decorateProductionUnit(run: ProductionRun, unit: ProductionUnit): ProductionUnit {
    this.refreshProductionDependencies({ ...run, operations: unit.operations });
    const dispatch = this.findDispatchOperation(unit.operations);
    const nextOperations = unit.operations.filter((op) => !dispatch || (op.id !== dispatch.id && op.operationId !== dispatch.operationId));
    const startedAt = this.firstProductionOperationStart(unit.operations);
    const completedAt = unit.status === 'done' ? this.lastProductionOperationFinish(unit.operations) : null;
    const duration = this.productionDuration(startedAt, completedAt);
    return {
      ...unit,
      startedAt,
      completedAt,
      actualDurationMinutes: duration.minutes,
      actualDurationHours: duration.hours,
      dispatchStatus: dispatch?.status || null,
      dispatchOperationId: dispatch?.id || null,
      dispatchCompletedAt: dispatch?.completedAt || null,
      nextReadyOperations: nextOperations.filter((op) => op.status === 'queued' && op.canStart),
      nextBlockedOperations: nextOperations.filter((op) => op.status === 'queued' && op.canStart === false),
      canReleaseNext: Boolean(dispatch && (dispatch.status === 'work' || dispatch.status === 'paused' || dispatch.status === 'queued')),
    };
  }

  private firstProductionOperationStart(operations: Array<Pick<ProductionOperation, 'startedAt'>>) {
    return operations.map((op) => op.startedAt).filter(Boolean).sort()[0] || null;
  }

  private lastProductionOperationFinish(operations: Array<Pick<ProductionOperation, 'completedAt'>>) {
    const finished = operations.map((op) => op.completedAt).filter(Boolean).sort();
    return finished[finished.length - 1] || null;
  }

  private productionDuration(startedAt?: string | null, completedAt?: string | null) {
    if (!startedAt) return { minutes: 0, hours: 0 };
    const end = completedAt || new Date().toISOString();
    const startMs = new Date(startedAt).getTime();
    const endMs = new Date(end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return { minutes: 0, hours: 0 };
    const minutes = Math.max(0, Math.round((endMs - startMs) / 60000));
    return { minutes, hours: Math.round((minutes / 60) * 100) / 100 };
  }

  private findDispatchOperation(operations: ProductionOperation[]) {
    const ordered = [...operations].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    return ordered.find((op) => this.isInitialOp10(op.operationId))
      || ordered.find((op) => `${op.name || ''} ${op.section || ''}`.toLowerCase().includes('диспетчеризац'))
      || null;
  }

  private productionPreviousCodes(run: ProductionRun, op: ProductionOperation) {
    return op.previousOperationCodes || [];
  }

  private refreshUnitStatus(unit: ProductionUnit) {
    unit.progress = this.productionProgress(unit.operations);
    if (unit.operations.every((op) => op.status === 'done')) unit.status = 'done';
    else if (unit.operations.some((op) => op.status === 'work')) unit.status = 'work';
    else if (unit.operations.some((op) => op.status === 'paused')) unit.status = 'paused';
    else if (unit.operations.some((op) => op.status === 'done')) unit.status = 'work';
    else unit.status = 'draft';
  }

  private refreshRunStatus(run: ProductionRun, now?: string) {
    if (run.units?.length) {
      run.units.forEach((unit) => this.refreshUnitStatus(unit));
      run.status = run.units.every((unit) => unit.status === 'done') ? 'done' : run.units.some((unit) => unit.status === 'work') ? 'work' : run.units.some((unit) => unit.status === 'paused') ? 'paused' : run.status === 'done' ? 'done' : run.status;
    } else if (run.operations.every((op) => op.status === 'done')) run.status = 'done';
    else if (run.operations.some((op) => op.status === 'work')) run.status = 'work';
    else if (run.operations.some((op) => op.status === 'paused')) run.status = 'paused';
    if (run.status === 'done') run.completedAt ||= now || new Date().toISOString();
  }

  private average(values: number[]) {
    return values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0;
  }

  private extractKd(comment?: string | null) {
    const match = String(comment || '').match(/КД:\s*([^·;]+)/i);
    return match?.[1]?.trim() || '';
  }

  private planStages(orderOperations: Array<any>, runs: ProductionRun[]) {
    const runOps = runs.flatMap((run) => run.units?.flatMap((unit) => unit.operations) || run.operations);
    const source = runOps.length ? runOps : orderOperations;
    return source.slice(0, 8).map((op: any) => ({ operationCode: op.operationId || op.operationCode, name: op.name, section: op.section, status: op.status || this.effectiveStatus(op) }));
  }

  private normalizeProductionPriority(priority?: string): ProductionPriority {
    return priority === 'high' || priority === 'low' ? priority : 'normal';
  }

  private normalizeProductionRunStatus(status?: string): ProductionRunStatus {
    return status === 'work' || status === 'paused' || status === 'done' ? status : 'draft';
  }

  private normalizeProductionOperationStatus(status?: string): ProductionOperationStatus {
    if (status === 'work' || status === 'paused' || status === 'done') return status;
    return 'queued';
  }

  private productionPriorityRank(priority?: string, explicitRank?: number) {
    if (Number.isFinite(Number(explicitRank))) return Number(explicitRank);
    return ({ high: 100, normal: 50, low: 10 } as Record<ProductionPriority, number>)[this.normalizeProductionPriority(priority)];
  }

  private productionLockOwner(body: { operator?: string; personName?: string; lockedBy?: string }, run: ProductionRun) {
    return String(body.lockedBy || body.personName || body.operator || run.operator || 'Оператор участка').trim();
  }

  private productionRunDirectorRow(run: ProductionRun) {
    const progress = this.enrichProductionRun(run).progress;
    const orderNumber = run.orderNumber || run.id;
    return { sourceType: 'production-run', id: run.id, displayId: orderNumber, orderNumber, productCode: run.productCode, productName: run.productName, dueDate: null, quantity: run.quantity, progress, status: run.status, priority: run.priority || 'normal', isWithoutOrder: !run.orderNumber };
  }

  private groupProductionRunsCompletedByDay(runs: ProductionRun[]) {
    const map = new Map<string, number>();
    for (const run of runs) {
      for (const op of this.productionRunWorkloadOperations(run).filter((item) => item.status === 'done' && item.completedAt)) {
        const day = String(op.completedAt).slice(0, 10);
        map.set(day, (map.get(day) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, completed]) => ({ date, completed }));
  }

  private mergeDynamics(...groups: Array<Array<{ date: string; completed: number }>>) {
    const map = new Map<string, number>();
    for (const group of groups) for (const row of group) map.set(row.date, (map.get(row.date) || 0) + row.completed);
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, completed]) => ({ date, completed }));
  }

  private productionActualHours(op: ProductionOperation, now: string) {
    if (!op.startedAt) return op.actualHours || 0;
    const minutes = Math.max(0, Math.round((new Date(now).getTime() - new Date(op.startedAt).getTime()) / 60000));
    return Math.round(minutes / 6) / 10;
  }

  private groupEventsByDay(events: Array<{ timestamp: Date }>) {
    const map = new Map<string, number>();
    for (const event of events) {
      const day = event.timestamp.toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, completed]) => ({ date, completed }));
  }

  private effectiveStatus(op: { status: OperationStatus; lifecycleStatus?: string | null }): LifecycleStatus {
    if (op.lifecycleStatus === 'paused') return 'paused';
    if (op.lifecycleStatus === 'queued') return 'queued';
    if (op.lifecycleStatus === 'canceled') return 'canceled';
    if (op.status === 'work') return 'work';
    if (op.status === 'done') return 'done';
    return 'new';
  }

  private async openTimeInterval(orderOperationId: number, orderId: number, personId: number | null | undefined, kind: 'work' | 'pause', startedAt: Date, comment?: string) {
    await this.prisma.timeTracking.create({ data: { orderOperationId, orderId, personId: personId || undefined, kind, startedAt, comment } });
  }

  private async closeOpenIntervals(orderOperationId: number, endedAt: Date) {
    const rows = await this.prisma.timeTracking.findMany({ where: { orderOperationId, endedAt: null } });
    for (const row of rows) {
      await this.prisma.timeTracking.update({
        where: { id: row.id },
        data: { endedAt, durationMinutes: this.minutesBetween(row.startedAt, endedAt) },
      });
    }
  }

  private async operationTimeTotals(orderOperationId: number) {
    const rows = await this.prisma.timeTracking.findMany({ where: { orderOperationId } });
    return this.timeTotalsFromRows(rows);
  }

  private timeTotalsFromRows(rows: TimeRow[]) {
    const now = new Date();
    let workMinutes = 0;
    let pauseMinutes = 0;
    for (const row of rows) {
      const minutes = row.durationMinutes ?? this.minutesBetween(row.startedAt, row.endedAt || now);
      if (row.kind === 'work') workMinutes += minutes;
      if (row.kind === 'pause') pauseMinutes += minutes;
    }
    return { workMinutes, pauseMinutes, workHours: Math.round(workMinutes / 6) / 10, pauseHours: Math.round(pauseMinutes / 6) / 10 };
  }

  private operationTimeState(rows: TimeRow[]) {
    const totals = this.timeTotalsFromRows(rows);
    const active = rows.find((row) => !row.endedAt);
    return { ...totals, activeKind: active?.kind || null, activeStartedAt: active?.startedAt || null };
  }

  private minutesBetween(startedAt: Date, endedAt: Date) {
    return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
  }

  private qualityTotals(records: Array<{ checkedQty: number; acceptedQty: number; defectQty: number }>) {
    return this.qualitySummaryFromRecords(records);
  }

  private qualitySummaryFromRecords(records: Array<{ checkedQty: number; acceptedQty: number; defectQty: number }>) {
    const checked = records.reduce((sum, record) => sum + record.checkedQty, 0);
    const accepted = records.reduce((sum, record) => sum + record.acceptedQty, 0);
    const defect = records.reduce((sum, record) => sum + record.defectQty, 0);
    return { checked, accepted, defect, defectRatePct: checked ? Math.round((defect / checked) * 1000) / 10 : 0, note: records.length ? 'Качество рассчитано по QualityRecord.' : 'Записей качества пока нет.' };
  }

  private async enrichOperation<T extends { id: number }>(op: T) {
    const full = await this.prisma.orderOperation.findUnique({ where: { id: op.id }, include: { timeTrackings: true, qualityRecords: true } });
    if (!full) return op;
    const totals = this.timeTotalsFromRows(full.timeTrackings);
    return { ...full, status: this.effectiveStatus(full), actualHours: totals.workHours || full.actualHours || 0, pauseHours: totals.pauseHours || full.pauseHours || 0, timeState: this.operationTimeState(full.timeTrackings), quality: this.qualityTotals(full.qualityRecords) };
  }

  private async ensureOrderOperations(orderId: number, operations: Array<any>) {
    for (const op of operations) {
      await this.prisma.orderOperation.upsert({
        where: { orderId_operationCode: { orderId, operationCode: op.operationCode } },
        update: {},
        create: { orderId, operationCode: op.operationCode, flow: op.flow, name: op.name, section: op.section, normHours: op.normHours, previousOperationCodes: op.previousOperationCodes, nextOperationCodes: op.nextOperationCodes, sortOrder: op.sortOrder },
      });
    }
  }

  private async assertOrderEditable(orderId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.status === 'archived') throw new BadRequestException('Заказ находится в архиве и заблокирован для изменений');
  }

  private progress(operations: Array<{ status: OperationStatus; normHours: number }>) {
    const total = operations.reduce((s, o) => s + o.normHours, 0);
    const done = operations.filter((o) => o.status === 'done').reduce((s, o) => s + o.normHours, 0);
    return total ? Math.round((done / total) * 1000) / 10 : 0;
  }

  private cell(row: ExcelRow, ...names: string[]) {
    const value = this.cellRaw(row, ...names);
    return value == null ? '' : String(value).trim();
  }

  private cellRaw(row: ExcelRow, ...names: string[]) {
    for (const name of names) if (row[name] !== undefined && row[name] !== '') return row[name];
    return '';
  }

  private dateCell(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
