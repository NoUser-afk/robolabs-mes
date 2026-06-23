import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:8088';
const HTTPS_URL = process.env.SMOKE_HTTPS_URL || 'https://localhost:8443';

function consoleGuard(page: Page, allowedPatterns: RegExp[] = []) {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text());
  });
  page.on('pageerror', (error) => messages.push(error.message));
  return async () => {
    await page.waitForTimeout(300);
    assertNoConsoleErrors(messages, allowedPatterns);
  };
}

function assertNoConsoleErrors(messages: string[], allowedPatterns: RegExp[] = []) {
  const relevant = messages.filter((message) => {
    if (/favicon|ResizeObserver loop|401 \(Unauthorized\)/i.test(message)) return false;
    return !allowedPatterns.some((pattern) => pattern.test(message));
  });
  expect(relevant, relevant.join('\n')).toEqual([]);
}

async function loginByApi(page: Page, login: string, password: string, url = BASE_URL) {
  await page.goto(url);
  const result = await page.evaluate(async ({ login, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    const payload = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, payload };
  }, { login, password });
  expect(result.ok, JSON.stringify(result)).toBeTruthy();
  await page.goto(url);
}

async function expectNoRootOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  expect(overflow).toBeLessThanOrEqual(2);
}

function firstQrString() {
  if (process.env.SMOKE_QR_STRING) return process.env.SMOKE_QR_STRING;
  try {
    const token = execFileSync('docker', [
      'exec',
      'robolabs-mes-postgres',
      'psql',
      '-U',
      'robolabs',
      '-d',
      'robolabs_mes',
      '-t',
      '-A',
      '-c',
      'select "terminalQrToken" from "AppUser" where role = \'terminal\' and "isTerminalOnly" = true and "terminalQrToken" is not null order by login limit 1;',
    ], { encoding: 'utf8' }).trim();
    if (token) return `robopulse://terminal/${token}`;
  } catch {
    // Fall back to the printed QR document for non-Docker local runs.
  }
  const doc = readFileSync(resolve(process.cwd(), '../TERMINAL_QR_CODES_2026-06-11.md'), 'utf8');
  const match = doc.match(/`(robopulse:\/\/terminal\/[^`]+)`/);
  if (!match) throw new Error('QR строка не найдена в TERMINAL_QR_CODES_2026-06-11.md');
  return match[1];
}

function execSmokeSql(sql: string) {
  execFileSync('docker', [
    'exec',
    'robolabs-mes-postgres',
    'psql',
    '-U',
    'robolabs',
    '-d',
    'robolabs_mes',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ], { encoding: 'utf8' });
}

function sqlLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function cleanupSmokeOrder(orderNumber: string) {
  execSmokeSql(`
    delete from "ProductionRun" where "orderNumber" = ${sqlLiteral(orderNumber)};
    delete from "ProductionRunRecord" where "orderNumber" = ${sqlLiteral(orderNumber)};
    delete from "Order" where "orderNumber" = ${sqlLiteral(orderNumber)};
  `);
}

test('login screen renders optimized entry motion without console errors', async ({ page }) => {
  const finishConsole = consoleGuard(page);
  await page.goto(BASE_URL);
  await expect(page.getByRole('heading', { name: /Вход на рабочее место|Выбор терминала/ })).toBeVisible();
  const motion = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.auth-panel')!, '::before');
    return { name: style.animationName, duration: style.animationDuration };
  });
  expect(motion.name).toBe('authScopeTrace');
  expect(parseFloat(motion.duration)).toBeGreaterThanOrEqual(4);
  await expectNoRootOverflow(page);
  const serviceLogin = page.getByRole('button', { name: 'Служебный вход' });
  if (await serviceLogin.count()) await serviceLogin.click();
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.locator('.pulse-intro:not(.pulse-intro-overlay)')).toBeVisible();
  const introMotion = await page.evaluate(() => {
    const intro = document.querySelector('.pulse-intro:not(.pulse-intro-overlay)')!;
    const grid = intro.querySelector('.pulse-grid')!;
    const core = intro.querySelector('.pulse-core i')!;
    const bars = Array.from(intro.querySelectorAll('.pulse-bars span')).map((bar) => {
      const style = getComputedStyle(bar);
      return { name: style.animationName, peak: style.getPropertyValue('--bar-high').trim() };
    });
    return {
      gridName: getComputedStyle(grid).animationName,
      gridDuration: getComputedStyle(grid).animationDuration,
      coreName: getComputedStyle(core).animationName,
      bars,
    };
  });
  expect(introMotion.gridName).toBe('gridDrift');
  expect(parseFloat(introMotion.gridDuration)).toBeGreaterThanOrEqual(18);
  expect(introMotion.coreName).toBe('coreBeat');
  expect(introMotion.bars.every(bar => bar.name === 'barWave')).toBeTruthy();
  expect(new Set(introMotion.bars.map(bar => bar.peak)).size).toBeGreaterThan(1);
  await expect(page.getByText(/Рабочее место диспетчера|План производства|Архив/).first()).toBeVisible();
  await expect(page.locator('.pulse-intro-overlay')).toHaveCount(0);
  const screenAnimation = await page.evaluate(() => getComputedStyle(document.querySelector('.screen-enter')!).animationName);
  expect(screenAnimation).toBe('none');
  await finishConsole();
});

test('terminal app mode shows QR login entry on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const finishConsole = consoleGuard(page);
  await page.goto(`${BASE_URL}?terminal-app=1`);
  await expect(page.getByRole('heading', { name: 'Выбор терминала' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Войти по QR-коду' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сервер' })).toBeVisible();
  await expect(page.getByText('Все профили для отладки')).toHaveCount(0);
  await page.getByRole('button', { name: 'Войти по QR-коду' }).click();
  await expect(page.getByRole('heading', { name: 'Вход по QR-коду' })).toBeVisible();
  await expect(page.locator('.qr-video-box')).toBeVisible();
  await expectNoRootOverflow(page);
  await finishConsole();
});

test('role entry smoke: dispatcher, director, technologist and logout', async ({ browser }) => {
  const roles = [
    { login: 'dispatcher.demo', password: 'dispatcher', text: /Рабочее место диспетчера|План производства/ },
    { login: 'director.demo', password: 'director', text: /Дашборд директора/ },
    { login: 'technologist.demo', password: 'technologist', text: /Номенклатура/ },
  ];
  for (const role of roles) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const finishConsole = consoleGuard(page);
    await loginByApi(page, role.login, role.password);
    await expect(page.getByText(role.text).first()).toBeVisible();
    await expectNoRootOverflow(page);
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('heading', { name: /Вход на рабочее место|Выбор терминала/ })).toBeVisible();
    await finishConsole();
    await page.close();
  }
});

test('terminal PIN login opens only terminal workspace', async ({ page }) => {
  const finishConsole = consoleGuard(page);
  await page.goto(BASE_URL);
  const terminal = await page.evaluate(async () => {
    const res = await fetch('/api/auth/terminals', { credentials: 'include' });
    const payload = await res.json();
    return payload.users?.[0];
  });
  expect(terminal?.login).toBeTruthy();
  const result = await page.evaluate(async (login) => {
    const res = await fetch('/api/auth/terminal-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password: '1234' }),
    });
    return { ok: res.ok, status: res.status, payload: await res.json().catch(() => ({})) };
  }, terminal.login);
  expect(result.ok, JSON.stringify(result)).toBeTruthy();
  await page.goto(BASE_URL);
  await expect(page.locator('.terminal-shell')).toBeVisible();
  await expect(page.getByText(/Текущая операция|Очередь/).first()).toBeVisible();
  await finishConsole();
});

test('HTTPS QR login opens strict terminal workspace', async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const finishConsole = consoleGuard(page);
  await page.goto(HTTPS_URL);
  const qr = process.env.SMOKE_QR_STRING || firstQrString();
  const result = await page.evaluate(async (qr) => {
    const res = await fetch('/api/auth/terminal-qr-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr }),
    });
    return { ok: res.ok, status: res.status, payload: await res.json().catch(() => ({})) };
  }, qr);
  expect(result.ok, JSON.stringify(result)).toBeTruthy();
  await page.goto(HTTPS_URL);
  await expect(page.locator('.terminal-shell')).toBeVisible();
  await expectNoRootOverflow(page);
  await page.screenshot({ path: test.info().outputPath('terminal-mobile-390.png'), fullPage: true });
  await finishConsole();
  await context.close();
});

test('visual smoke for director dashboard at 1440 and 375 widths', async ({ browser }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    const page = await browser.newPage({ viewport });
    const finishConsole = consoleGuard(page);
    await loginByApi(page, 'director.demo', 'director');
    await expect(page.getByText(/Дашборд директора/).first()).toBeVisible();
    await expectNoRootOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`director-${viewport.width}.png`), fullPage: true });
    await finishConsole();
    await page.close();
  }
});

test('dispatcher can launch one unit, cannot exceed order balance, and can release next process', async ({ page }) => {
  const finishConsole = consoleGuard(page, [/400 \(Bad Request\)/i]);
  await loginByApi(page, 'dispatcher.demo', 'dispatcher');
  const product = await page.evaluate(async () => {
    const res = await fetch('/api/nomenclature', { credentials: 'include' });
    const payload = await res.json();
    return payload.products?.[0];
  });
  expect(product?.productCode, JSON.stringify(product)).toBeTruthy();

  const orderNumber = 'SMOKE-E2E-001';
  cleanupSmokeOrder(orderNumber);
  try {
  execSmokeSql(`
    insert into "Order" ("orderNumber","productCode","productName","quantity","dueDate","customer","priority","comment","sourceFile","status","createdAt","updatedAt")
    values (${sqlLiteral(orderNumber)}, ${sqlLiteral(product.productCode)}, ${sqlLiteral(product.equipment || product.productName || product.productCode)}, 1, now() + interval '7 days', 'Smoke', 'normal', 'Smoke order', 'playwright-smoke', 'active', now(), now());
  `);

  const launched = await page.evaluate(async ({ orderNumber, productCode }) => {
    const res = await fetch('/api/production/launch', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, productCode, quantity: 1, operator: 'Smoke' }),
    });
    return { ok: res.ok, status: res.status, payload: await res.json().catch(() => ({})) };
  }, { orderNumber, productCode: product.productCode });
  expect(launched.ok, JSON.stringify(launched)).toBeTruthy();
  expect(launched.payload.id).toBeTruthy();

  const overLaunch = await page.evaluate(async ({ orderNumber, productCode }) => {
    const res = await fetch('/api/production/launch', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, productCode, quantity: 1, operator: 'Smoke' }),
    });
    return { ok: res.ok, status: res.status, payload: await res.json().catch(() => ({})) };
  }, { orderNumber, productCode: product.productCode });
  expect(overLaunch.ok).toBeFalsy();
  expect(JSON.stringify(overLaunch.payload)).toMatch(/Нельзя запустить больше остатка/);

  const release = await page.evaluate(async (runId) => {
    const runRes = await fetch(`/api/production/runs/${encodeURIComponent(runId)}`, { credentials: 'include' });
    const run = await runRes.json();
    const unit = run.units?.[0];
    const res = await fetch(`/api/production/runs/${encodeURIComponent(run.id)}/units/${encodeURIComponent(unit.unitId)}/dispatch/release`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: 'Smoke' }),
    });
    const released = await res.json().catch(() => ({}));
    const refreshedRes = await fetch(`/api/production/runs/${encodeURIComponent(run.id)}`, { credentials: 'include' });
    const refreshed = await refreshedRes.json();
    const refreshedUnit = refreshed.units?.[0];
    const next = refreshedUnit?.nextReadyOperations?.[0] || refreshedUnit?.operations?.find((operation: any) => operation.status !== 'done');
    const terminalRes = next?.section ? await fetch(`/api/work-centers/${encodeURIComponent(next.section)}/terminal`, { credentials: 'include' }) : null;
    const terminal = terminalRes ? await terminalRes.json() : null;
    return {
      ok: res.ok,
      status: res.status,
      released,
      runId: refreshed.id,
      unitId: refreshedUnit?.unitId,
      nextSection: next?.section,
      terminalHasRun: Boolean(terminal?.queue?.some((operation: any) => operation.runId === refreshed.id || operation.displayId === refreshed.id)),
    };
  }, launched.payload.id);
  expect(release.ok, JSON.stringify(release)).toBeTruthy();
  expect(release.nextSection, JSON.stringify(release)).toBeTruthy();
  expect(release.terminalHasRun, JSON.stringify(release)).toBeTruthy();
  await finishConsole();
  } finally {
    cleanupSmokeOrder(orderNumber);
  }
});

test('technologist save process updates nomenclature card data', async ({ page }) => {
  const finishConsole = consoleGuard(page);
  await loginByApi(page, 'technologist.demo', 'technologist');
  const saved = await page.evaluate(async () => {
    const listRes = await fetch('/api/nomenclature', { credentials: 'include' });
    const list = await listRes.json();
    const item = list.products?.[0];
    const processRes = await fetch(`/api/nomenclature/${encodeURIComponent(item.id)}/process`, { credentials: 'include' });
    const process = await processRes.json();
    const marker = `Smoke save ${Date.now()}`;
    const res = await fetch('/api/nomenclature/processes', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: process.id,
        equipment: process.equipment,
        productCode: process.productCode,
        category: process.category || 'Smoke',
        notes: [...(process.notes || []), marker],
        summary: process.summary || {},
        processSteps: process.processSteps,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    const cardRes = await fetch(`/api/nomenclature/${encodeURIComponent(payload.id || process.id)}/process`, { credentials: 'include' });
    const card = await cardRes.json();
    return { ok: res.ok, status: res.status, marker, payload, card };
  });
  expect(saved.ok, JSON.stringify(saved)).toBeTruthy();
  expect(saved.card.notes).toContain(saved.marker);
  await finishConsole();
});
