import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { MesService } from '../src/mes.service';

type FakeRecord = any;
type FakeVersion = any;

function workbookFile(process: Record<string, unknown>, operations: Array<Record<string, unknown>>, name = 'techprocess-test.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([process]), 'Process');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(operations), 'Operations');
  return {
    originalname: name,
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  } as Express.Multer.File;
}

function validFile(productCode = `TP-${Date.now()}`) {
  return workbookFile(
    { equipment: 'Тестовый узел', productCode, category: 'Тест', versionComment: 'Импорт из теста' },
    [
      { operationId: 'OP10', name: 'Резка', section: 'Лазер', normHours: 1, nextOperationCodes: 'OP20' },
      { operationId: 'OP20', name: 'Сборка', section: 'Сборка', normHours: 2, previousOperationCodes: 'OP10' },
    ],
  );
}

function fakePrisma() {
  const records = new Map<string, FakeRecord>();
  const versions = new Map<string, FakeVersion>();
  const batches: any[] = [];
  const api: any = {
    batches,
    records,
    versions,
    techProcessImportBatch: {
      create: async ({ data }: any) => {
        const batch = { id: batches.length + 1, uploadedAt: new Date(), ...data };
        batches.push(batch);
        return batch;
      },
    },
    nomenclatureProcessRecord: {
      findUnique: async ({ where }: any) => records.get(where.id) || null,
      findFirst: async ({ where }: any) => {
        const id = where?.OR?.find((item: any) => item.id)?.id;
        const productCode = where?.OR?.find((item: any) => item.productCode)?.productCode;
        return Array.from(records.values()).find((record) => record.id === id || record.productCode === productCode) || null;
      },
      findMany: async () => Array.from(records.values()),
      create: async ({ data }: any) => {
        const record = { ...data, versions: [], createdAt: new Date(), updatedAt: new Date() };
        records.set(record.id, record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const record = records.get(where.id);
        Object.assign(record, data, { updatedAt: new Date() });
        return record;
      },
    },
    nomenclatureProcessVersion: {
      create: async ({ data }: any) => {
        const version = { ...data, createdAt: new Date(), updatedAt: new Date() };
        versions.set(version.id, version);
        const record = records.get(version.processId);
        record.versions = [version, ...(record.versions || [])];
        return version;
      },
      findUnique: async ({ where }: any) => versions.get(where.id) || null,
      updateMany: async ({ where, data }: any) => {
        for (const version of versions.values()) {
          if (version.processId === where.processId && version.status === where.status && version.id !== where.NOT?.id) Object.assign(version, data, { updatedAt: new Date() });
        }
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        const version = versions.get(where.id);
        Object.assign(version, data, { updatedAt: new Date() });
        return version;
      },
    },
    $transaction: async (work: any) => work(api),
  };
  return api;
}

test('techprocess excel preview normalizes a valid workbook and records preview history', async () => {
  const prisma = fakePrisma();
  const service = new MesService(prisma);
  const result = await service.previewTechProcessExcel(validFile('TP-PREVIEW'), {}, 'Tester') as any;
  assert.equal(result.ok, true);
  assert.equal(result.process.productCode, 'TP-PREVIEW');
  assert.equal(result.summary.operationsCount, 2);
  assert.equal(result.summary.totalNormHours, 3);
  assert.equal(prisma.batches[0].status, 'preview');
  assert.equal(prisma.batches[0].productCode, 'TP-PREVIEW');
});

test('techprocess excel preview rejects missing operation links before normalization can drop them', async () => {
  const prisma = fakePrisma();
  const service = new MesService(prisma);
  const file = workbookFile(
    { equipment: 'Ошибка ссылок', productCode: 'TP-BAD-LINK' },
    [{ operationId: 'OP10', name: 'Резка', section: 'Лазер', nextOperationCodes: 'OP99' }],
  );
  const result = await service.previewTechProcessExcel(file, {}, 'Tester') as any;
  assert.equal(result.ok, false);
  assert.match(result.errors.map((issue: any) => issue.message).join('\n'), /OP99/);
  assert.equal(prisma.batches[0].status, 'preview');
});

test('techprocess excel preview rejects cycles', async () => {
  const prisma = fakePrisma();
  const service = new MesService(prisma);
  const file = workbookFile(
    { equipment: 'Цикл', productCode: 'TP-CYCLE' },
    [
      { operationId: 'OP10', name: 'Первая', section: 'A', nextOperationCodes: 'OP20' },
      { operationId: 'OP20', name: 'Вторая', section: 'B', nextOperationCodes: 'OP10' },
    ],
  );
  const result = await service.previewTechProcessExcel(file, {}, 'Tester') as any;
  assert.equal(result.ok, false);
  assert.match(result.errors.map((issue: any) => issue.message).join('\n'), /цикл/i);
});

test('techprocess excel import creates active version and completed import history in one transaction path', async () => {
  const prisma = fakePrisma();
  const service = new MesService(prisma);
  const result = await service.importTechProcessExcel(validFile('TP-ACTIVE'), { mode: 'active' }, 'Tester') as any;
  assert.equal(result.ok, true);
  assert.equal(result.process.productCode, 'TP-ACTIVE');
  assert.equal(result.version.status, 'active');
  assert.equal(result.importBatch.status, 'completed');
  assert.equal(prisma.batches[0].versionId, result.version.id);
  const record = Array.from(prisma.records.values())[0] as any;
  assert.equal(record.activeVersionId, result.version.id);
});
