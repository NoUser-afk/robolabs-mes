import { PrismaClient } from '@prisma/client';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const dataPath = (fileName: string) => {
  const sourcePath = join(__dirname, '..', 'src', 'data', fileName);
  if (existsSync(sourcePath)) return sourcePath;
  return join(process.cwd(), 'src', 'data', fileName);
};
const route = readJson(dataPath('route-209983.json'));
const capacities = readJson(dataPath('section-capacities.json'));
const productProcesses = readJson(dataPath('products-processes.json'));
const processSections = Array.from(new Set((productProcesses.products as any[]).flatMap((product) => product.processSteps.map((op: any) => op.section)))) as string[];
const normalizeSection = (section: string) => section === 'Лазер' && processSections.includes('Лазерный станок') ? 'Лазерный станок' : section;
const removedReferenceOperationCodes = ['ОР-00031'];
const passwordHash = (password: string, salt: string) => {
  const iterations = 120_000;
  const digest = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
};
const terminalQrToken = () => `rpt_${randomBytes(24).toString('base64url')}`;

async function main() {
  const legacyTemplate = await prisma.routeTemplate.findUnique({
    where: { productCode_version: { productCode: '209983', version: 'demo-1' } },
  });
  const currentTemplate = await prisma.routeTemplate.findUnique({
    where: { productCode_version: { productCode: '209983', version: 'v1' } },
  });
  if (legacyTemplate && !currentTemplate) {
    await prisma.routeTemplate.update({ where: { id: legacyTemplate.id }, data: { version: 'v1' } });
  }

  const template = await prisma.routeTemplate.upsert({
    where: { productCode_version: { productCode: '209983', version: 'v1' } },
    update: { name: 'Маршрут изделия 209983', isActive: true },
    create: { productCode: '209983', name: 'Маршрут изделия 209983', version: 'v1', isActive: true },
  });

  const operationCodes = (route as any[]).map((op) => op.id);
  await prisma.routeOperation.deleteMany({
    where: { routeTemplateId: template.id, operationCode: { notIn: operationCodes } },
  });

  for (const [index, op] of (route as any[]).entries()) {
    await prisma.routeOperation.upsert({
      where: { routeTemplateId_operationCode: { routeTemplateId: template.id, operationCode: op.id } },
      update: { flow: op.flow, name: op.name, section: op.section, normHours: op.hours, previousOperationCodes: op.prev, nextOperationCodes: op.next, sortOrder: index + 1 },
      create: { routeTemplateId: template.id, operationCode: op.id, flow: op.flow, name: op.name, section: op.section, normHours: op.hours, previousOperationCodes: op.prev, nextOperationCodes: op.next, sortOrder: index + 1 },
    });
  }

  const sections = (capacities as any[]).map((cap) => normalizeSection(cap.section));
  await prisma.sectionCapacity.deleteMany({
    where: { period: 'month', section: { notIn: sections } },
  });

  for (const cap of capacities as any[]) {
    const section = normalizeSection(cap.section);
    await prisma.sectionCapacity.upsert({
      where: { section_period: { section, period: 'month' } },
      update: { availableHours: cap.availableHours, weldHours: cap.weldHours },
      create: { section, availableHours: cap.availableHours, weldHours: cap.weldHours, period: 'month' },
    });
  }

  for (const [index, op] of (route as any[]).entries()) {
    const section = normalizeSection(op.section);
    await prisma.person.upsert({
      where: { id: 100000 + index + 1 },
      update: { fullName: op.name, section, isActive: true },
      create: { id: 100000 + index + 1, fullName: op.name, section, isActive: true },
    });
  }

  const routeTerminalSections = (Array.from(new Set((route as any[]).map((op) => op.section))).slice(2) as string[])
    .map(normalizeSection);
  const capacitySections = (capacities as any[]).map((cap) => normalizeSection(cap.section));
  const terminalSections = Array.from(new Set([...routeTerminalSections, ...capacitySections, ...processSections].filter(Boolean)));

  for (const user of [
    { login: 'dispatcher', role: 'dispatcher', displayName: 'Диспетчер' },
    { login: 'technologist', role: 'technologist', displayName: 'Технолог' },
    { login: 'operator', role: 'operator', displayName: 'Оператор участка' },
    { login: 'director', role: 'director', displayName: 'Директор' },
    { login: 'admin', role: 'admin', displayName: 'Администратор' },
  ]) {
    await prisma.appUser.upsert({ where: { login: user.login }, update: user, create: user });
  }

  await prisma.appUser.update({
    where: { login: 'dispatcher' },
    data: { passwordHash: passwordHash('dispatcher', 'dispatcher'), isTerminalOnly: false },
  });
  await prisma.appUser.update({
    where: { login: 'operator' },
    data: {
      passwordHash: passwordHash('1234', 'operator'),
      workCenterSection: terminalSections[0],
      isTerminalOnly: true,
    },
  });
  await prisma.appUser.update({
    where: { login: 'director' },
    data: { passwordHash: passwordHash('director', 'director'), isTerminalOnly: false },
  });
  await prisma.appUser.update({
    where: { login: 'technologist' },
    data: { passwordHash: passwordHash('technologist', 'technologist'), isTerminalOnly: false },
  });
  await prisma.appUser.update({
    where: { login: 'admin' },
    data: { passwordHash: passwordHash('admin', 'admin'), isTerminalOnly: false },
  });
  await prisma.appUser.updateMany({
    where: { login: { in: ['dispatcher.demo', 'technologist.demo', 'operator.demo', 'director.demo', 'admin.demo'] } },
    data: { isActive: false },
  });

  const terminalLogins = terminalSections.map((_, index) => `terminal.${String(index + 1).padStart(2, '0')}`);

  for (const section of terminalSections) {
    await prisma.referenceSection.upsert({
      where: { name: section },
      update: { isActive: true },
      create: { name: section, isActive: true },
    });
  }

  await prisma.appUser.updateMany({
    where: { role: 'terminal', login: { startsWith: 'terminal.', notIn: terminalLogins } },
    data: { isActive: false },
  });

  for (const [index, section] of terminalSections.entries()) {
    const login = `terminal.${String(index + 1).padStart(2, '0')}`;
    const existing = await prisma.appUser.findUnique({ where: { login }, select: { terminalQrToken: true } });
    const data = {
      login,
      role: 'terminal',
      displayName: `Terminal: ${section}`,
      passwordHash: passwordHash('1234', login),
      terminalQrToken: existing?.terminalQrToken || terminalQrToken(),
      workCenterSection: section,
      isTerminalOnly: true,
      isActive: true,
    };
    await prisma.appUser.upsert({ where: { login }, update: data, create: data });
  }

  await prisma.referenceOperation.updateMany({
    where: { operationCode: { in: removedReferenceOperationCodes } },
    data: { isActive: false },
  });
}

main().finally(() => prisma.$disconnect());
