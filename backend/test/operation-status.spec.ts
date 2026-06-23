import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalProductionOperationStatus,
  orderOperationTransition,
  productionEventTypeFromTransition,
  productionOperationTransition,
} from '../src/operation-status.model';

test('production operation cannot start while dependencies are blocked', () => {
  const result = productionOperationTransition('queued', 'start', { canStart: false, blockedBy: ['OP10'] });
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
  assert.match(result.reason, /OP10/);
});

test('production operation lifecycle allows start, pause, resume and complete only in order', () => {
  assert.deepEqual(productionOperationTransition('queued', 'start', { canStart: true }), { ok: true, nextStatus: 'work' });
  assert.deepEqual(productionOperationTransition('work', 'pause'), { ok: true, nextStatus: 'paused' });
  assert.deepEqual(productionOperationTransition('paused', 'resume'), { ok: true, nextStatus: 'work' });
  assert.deepEqual(productionOperationTransition('work', 'complete'), { ok: true, nextStatus: 'done' });

  const completeWithoutStart = productionOperationTransition('queued', 'complete');
  assert.equal(completeWithoutStart.ok, false);
  assert.equal(completeWithoutStart.conflict, true);
});

test('order operation transition rejects finishing without start', () => {
  const result = orderOperationTransition('new', 'done');
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
});

test('canonical production status exposes ready and blocked compatibility states', () => {
  assert.equal(canonicalProductionOperationStatus({ status: 'queued', canStart: true }), 'ready');
  assert.equal(canonicalProductionOperationStatus({ status: 'queued', canStart: false, blockedBy: ['OP10'] }), 'blocked');
  assert.equal(canonicalProductionOperationStatus({ status: 'work' }), 'work');
  assert.equal(canonicalProductionOperationStatus({ status: 'done' }), 'done');
});

test('production event type follows status transition', () => {
  assert.equal(productionEventTypeFromTransition('queued', 'work'), 'start');
  assert.equal(productionEventTypeFromTransition('paused', 'work'), 'resume');
  assert.equal(productionEventTypeFromTransition('work', 'paused'), 'pause');
  assert.equal(productionEventTypeFromTransition('work', 'done'), 'complete');
});
