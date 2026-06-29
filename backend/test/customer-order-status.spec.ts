import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomerOrderStatusCard,
  buildCustomerOrderStatusResponse,
  buildCustomerProductionRunStatusResponse,
  generateCustomerAccessCode,
  hashCustomerAccessCode,
  normalizeAccessCode,
  verifyCustomerAccessCode,
} from '../src/customer-order-status.model';

test('customer access code is generated, normalized and verified by hash', () => {
  const code = generateCustomerAccessCode();
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const hash = hashCustomerAccessCode(code);
  assert.equal(verifyCustomerAccessCode(code.toLowerCase(), hash), true);
  assert.equal(verifyCustomerAccessCode('WRONG-123', hash), false);
  assert.equal(normalizeAccessCode(' abcd-2345 '), 'ABCD2345');
});

test('customer status card aggregates production data without internal fields', () => {
  const card = buildCustomerOrderStatusCard({
    generatedAt: new Date('2026-06-25T10:00:00.000Z'),
    order: {
      id: 42,
      orderNumber: 'ZK5-001',
      productCode: 'RC800',
      productName: 'Furnace',
      quantity: 2,
      dueDate: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-25T09:00:00.000Z'),
      operations: [],
    },
    runs: [{
      orderNumber: 'ZK5-001',
      productCode: 'RC800',
      quantity: 2,
      launchedQuantity: 2,
      status: 'work',
      updatedAt: '2026-06-25T09:30:00.000Z',
      units: [
        {
          status: 'done',
          progress: 100,
          operations: [
            { operationId: 'OP10', name: 'Dispatch', section: 'Dispatch', status: 'done', normHours: 1, sequence: 1 },
            { operationId: 'OP20', name: 'Assembly', section: 'Assembly', status: 'done', normHours: 4, sequence: 2 },
          ],
        },
        {
          status: 'work',
          progress: 50,
          operations: [
            { operationId: 'OP10', name: 'Dispatch', section: 'Dispatch', status: 'done', normHours: 1, sequence: 1 },
            {
              operationId: 'OP20',
              name: 'Assembly',
              section: 'Assembly',
              status: 'work',
              normHours: 4,
              sequence: 2,
              lockedBy: 'Internal Operator',
              lockToken: 'secret',
            } as any,
          ],
        },
      ],
    }],
  });

  assert.equal(card.status, 'in_work');
  assert.equal(card.progress, 60);
  assert.deepEqual(card.quantities, { ordered: 2, launched: 2, ready: 1, inWork: 1, remaining: 1 });
  assert.equal(card.currentStage?.name, 'Сборка');
  assert.equal(card.currentStage?.status, 'in_work');
  assert.equal(card.currentPhase, 'assembly');
  assert.deepEqual(card.phaseFlow.map((phase) => [phase.key, phase.status]), [
    ['ordered', 'done'],
    ['assembly', 'in_work'],
    ['final_preparation', 'waiting'],
    ['ready', 'waiting'],
  ]);
  assert.equal(card.eta.remainingNormHours, 4);
  assert.match(card.eta.label, /рабоч/);

  const serialized = JSON.stringify(card);
  assert.equal(serialized.includes('Internal Operator'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('OP20'), false);
  assert.equal(serialized.includes('lockToken'), false);
});

test('customer status card handles not launched and completed orders', () => {
  const notLaunched = buildCustomerOrderStatusCard({
    order: {
      id: 1,
      orderNumber: 'NEW-1',
      productCode: 'P1',
      quantity: 3,
      operations: [{ name: 'Laser', section: 'Laser', status: 'new', normHours: 2, sortOrder: 1 }],
    },
    runs: [],
  });
  assert.equal(notLaunched.status, 'not_launched');
  assert.equal(notLaunched.quantities.launched, 0);
  assert.deepEqual(notLaunched.phaseFlow.map((phase) => [phase.key, phase.status]), [
    ['ordered', 'in_work'],
    ['assembly', 'waiting'],
    ['final_preparation', 'waiting'],
    ['ready', 'waiting'],
  ]);
  assert.match(notLaunched.eta.label, /после запуска/);

  const completed = buildCustomerOrderStatusCard({
    order: {
      id: 2,
      orderNumber: 'DONE-1',
      productCode: 'P2',
      quantity: 1,
      operations: [],
    },
    runs: [{
      quantity: 1,
      launchedQuantity: 1,
      status: 'done',
      units: [{ status: 'done', progress: 100, operations: [{ name: 'QC', section: 'OTK', status: 'done', normHours: 1 }] }],
    }],
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.progress, 100);
  assert.equal(completed.eta.label, 'Готово');
  assert.equal(completed.currentPhase, 'ready');
});

test('customer status card uses order operations as phase hook before production run exists', () => {
  const inAssembly = buildCustomerOrderStatusCard({
    order: {
      id: 3,
      orderNumber: 'HOOK-1',
      productCode: 'P3',
      quantity: 2,
      operations: [
        { name: 'Dispatch', section: 'Dispatch', status: 'done', normHours: 1, sortOrder: 1 },
        { name: 'Assembly', section: 'Assembly', status: 'work', normHours: 4, sortOrder: 2 },
        { name: 'Final packing', section: 'Packing', status: 'new', normHours: 1, sortOrder: 3 },
      ],
    },
    runs: [],
  });
  assert.equal(inAssembly.status, 'in_work');
  assert.equal(inAssembly.currentPhase, 'assembly');
  assert.equal(inAssembly.quantities.launched, 2);
});

test('customer status response groups positions under one order code', () => {
  const first = buildCustomerOrderStatusCard({
    generatedAt: new Date('2026-06-25T10:00:00.000Z'),
    order: { id: 10, orderNumber: 'ONE-CODE', productCode: 'A', quantity: 2, dueDate: '2026-07-02T00:00:00.000Z' },
    runs: [],
  });
  const second = buildCustomerOrderStatusCard({
    generatedAt: new Date('2026-06-25T10:00:00.000Z'),
    order: { id: 11, orderNumber: 'ONE-CODE', productCode: 'B', quantity: 3, dueDate: '2026-07-01T00:00:00.000Z' },
    runs: [],
  });
  const response = buildCustomerOrderStatusResponse({ positions: [first, second], generatedAt: new Date('2026-06-25T10:00:00.000Z') });
  assert.equal(response.order.orderNumber, 'ONE-CODE');
  assert.equal(response.order.positionsCount, 2);
  assert.equal(response.order.totalQuantity, 5);
  assert.equal(response.order.dueDate, '2026-07-01T00:00:00.000Z');
  assert.deepEqual(response.positions.map((position) => position.order.productCode), ['A', 'B']);
});

test('customer production run response exposes units as customer positions', () => {
  const response = buildCustomerProductionRunStatusResponse({
    generatedAt: new Date('2026-06-25T10:00:00.000Z'),
    run: {
      id: 'RUN-CUSTOMER-1',
      orderNumber: 'RUN-ORDER-1',
      productCode: 'KIT-RUN',
      productName: 'Run Kit',
      quantity: 2,
      launchedQuantity: 2,
      status: 'work',
      units: [
        {
          unitId: 'RUN-CUSTOMER-1-U001',
          unitNo: 1,
          status: 'done',
          progress: 100,
          operations: [
            { operationId: 'OP10', name: 'Dispatch', section: 'Dispatch', status: 'done', normHours: 1, sequence: 1 },
            { operationId: 'OP20', name: 'Assembly', section: 'Assembly', status: 'done', normHours: 4, sequence: 2 },
          ],
        },
        {
          unitId: 'RUN-CUSTOMER-1-U002',
          unitNo: 2,
          status: 'work',
          progress: 50,
          operations: [
            { operationId: 'OP10', name: 'Dispatch', section: 'Dispatch', status: 'done', normHours: 1, sequence: 1 },
            { operationId: 'OP20', name: 'Assembly', section: 'Assembly', status: 'work', normHours: 4, sequence: 2, lockToken: 'secret' } as any,
          ],
        },
      ],
    },
  });
  assert.equal(response.order.orderNumber, 'RUN-ORDER-1');
  assert.equal(response.order.positionsCount, 2);
  assert.deepEqual(response.positions.map((position) => position.order.unitNo), [1, 2]);
  assert.equal(response.positions[0].status, 'completed');
  assert.equal(response.positions[1].currentPhase, 'assembly');
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes('OP20'), false);
  assert.equal(serialized.includes('secret'), false);
});
