import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBulkGroupAllowedProductionOperation,
  isGroupCapableEntity,
  isGroupCapableText,
} from '../src/bulk-operation.model';

test('bulk group text accepts only approved production operation families', () => {
  assert.equal(isGroupCapableText('Лазерная резка'), true);
  assert.equal(isGroupCapableText('Зачистка на станке'), true);
  assert.equal(isGroupCapableText('Пробивной станок'), true);
  assert.equal(isGroupCapableText('Координатная пробивка'), true);
  assert.equal(isGroupCapableText('Сварка ручная'), false);
});

test('explicit groupCapable flag can enable a process step', () => {
  assert.equal(isGroupCapableEntity({ name: 'Сборка', section: 'Пост', groupCapable: true }), true);
  assert.equal(isGroupCapableEntity({ name: 'Сборка', section: 'Пост' }), false);
});

test('bulk production action is allowed only for named machine families', () => {
  assert.equal(isBulkGroupAllowedProductionOperation({ operationId: 'OP20', name: 'Лазер', section: 'Лазер' }), true);
  assert.equal(isBulkGroupAllowedProductionOperation({ operationId: 'OP30', name: 'Балансировка', section: 'Сборка' }), false);
});
