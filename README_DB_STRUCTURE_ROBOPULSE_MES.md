# Структура базы данных RoboPulse MES

> Автоматическая человекочитаемая выгрузка фактической PostgreSQL-схемы стенда `ttm-mini`.

**База данных:** `robolabs_mes`
**Сервер проекта:** `ttm-mini`
**Дата выгрузки:** 2026-06-19 08:08:15

## 1. Сводка

| Параметр | Значение |
|---|---|
| PostgreSQL version | PostgreSQL 16.14 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit |
| Database size | 16 MB |
| Database bytes | 16612375 |
| Tables in public schema | 25 |
| Applied Prisma migrations | 12 |

## 2. Доменные зоны

| Зона | Таблицы | Назначение |
|---|---|---|
| Заказы и операции | `Order`, `OrderOperation`, `OperationEvent`, `TimeTracking`, `QualityRecord`, `ImportBatch` | Импорт, статусная модель заказа, учет времени, события и качество. |
| Справочники и маршруты | `ReferenceSection`, `ReferenceOperation`, `RouteTemplate`, `RouteOperation`, `SectionCapacity`, `Person` | Участки, операции, маршруты, исполнители и нормативные мощности. |
| Номенклатура | `NomenclatureProcessRecord` | Технологические процессы изделий и их версии. |
| Производство | `ProductionRun`, `ProductionUnit`, `ProductionUnitOperation`, `ProductionOperationEvent`, `ProductionRunRecord` | Производственные запуски, единицы продукции, операции по единицам, события и legacy forensic record. |
| Рабочие центры и смены | `WorkCenter`, `WorkShift`, `ProductionCalendarDay`, `DeviationReason` | Рабочие центры, сменный учет, календарь и причины отклонений. |
| Пользователи и аудит | `AppUser`, `AuditLog`, `_prisma_migrations` | Учетные записи, роли, terminal-only доступ, аудит и история миграций. |

## 3. Таблицы: размеры и строки

| Таблица | Точно строк | Примерно строк | Общий размер | Heap | Индексы | TOAST |
|---|---:|---:|---:|---:|---:|---:|
| `ProductionUnitOperation` | 1126 | 1126 | 3904 kB | 1200 kB | 2664 kB | 40 kB |
| `ProductionOperationEvent` | 2147 | 2142 | 1792 kB | 848 kB | 904 kB | 40 kB |
| `ProductionRunRecord` | 8 | 8 | 496 kB | 8192 bytes | 64 kB | 424 kB |
| `ReferenceOperation` | 81 | 81 | 160 kB | 72 kB | 48 kB | 40 kB |
| `AuditLog` | 49 | 49 | 136 kB | 40 kB | 64 kB | 32 kB |
| `NomenclatureProcessRecord` | 5 | 5 | 120 kB | 8192 bytes | 48 kB | 64 kB |
| `ProductionRun` | 7 | 7 | 112 kB | 8192 bytes | 96 kB | 8192 bytes |
| `ProductionUnit` | 29 | 29 | 112 kB | 8192 bytes | 64 kB | 40 kB |
| `AppUser` | 36 | 36 | 96 kB | 16 kB | 48 kB | 32 kB |
| `TimeTracking` | 20 | 20 | 96 kB | 8192 bytes | 80 kB | 8192 bytes |
| `DeviationReason` | 10 | 10 | 80 kB | 8192 bytes | 64 kB | 8192 bytes |
| `WorkCenter` | 33 | 33 | 80 kB | 8192 bytes | 64 kB | 8192 bytes |
| `WorkShift` | 18 | 18 | 80 kB | 8192 bytes | 64 kB | 8192 bytes |
| `Order` | 1 | 1 | 48 kB | 8192 bytes | 32 kB | 8192 bytes |
| `OrderOperation` | 12 | 12 | 48 kB | 8192 bytes | 32 kB | 8192 bytes |
| `ReferenceSection` | 33 | 33 | 48 kB | 8192 bytes | 32 kB | 8192 bytes |
| `RouteOperation` | 13 | 13 | 48 kB | 8192 bytes | 32 kB | 8192 bytes |
| `RouteTemplate` | 1 | 1 | 48 kB | 8192 bytes | 32 kB | 8192 bytes |
| `SectionCapacity` | 13 | 13 | 48 kB | 8192 bytes | 32 kB | 8192 bytes |
| `QualityRecord` | 0 | 0 | 40 kB | 0 bytes | 32 kB | 8192 bytes |
| `ImportBatch` | 2 | 2 | 32 kB | 8192 bytes | 16 kB | 8192 bytes |
| `OperationEvent` | 41 | 41 | 32 kB | 8192 bytes | 16 kB | 8192 bytes |
| `Person` | 25 | 25 | 32 kB | 8192 bytes | 16 kB | 8192 bytes |
| `_prisma_migrations` | 12 | 12 | 32 kB | 8192 bytes | 16 kB | 8192 bytes |
| `ProductionCalendarDay` | 0 | 0 | 24 kB | 0 bytes | 16 kB | 8192 bytes |

## 4. Таблицы и колонки

### 4.1. `AppUser`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"AppUser_id_seq"'::regclass)` | — |
| 2 | `login` | `text` | NO | — | `—` | — |
| 3 | `role` | `text` | NO | — | `—` | — |
| 4 | `displayName` | `text` | NO | — | `—` | — |
| 5 | `passwordHash` | `text` | YES | — | `—` | — |
| 6 | `terminalQrToken` | `text` | YES | — | `—` | — |
| 7 | `workCenterSection` | `text` | YES | — | `—` | — |
| 8 | `isTerminalOnly` | `boolean` | NO | — | `false` | — |
| 9 | `lastLoginAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 10 | `personId` | `integer` | YES | FK | `—` | — |
| 11 | `isActive` | `boolean` | NO | — | `true` | — |
| 12 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |

### 4.2. `AuditLog`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"AuditLog_id_seq"'::regclass)` | — |
| 2 | `entityType` | `text` | NO | — | `—` | — |
| 3 | `entityId` | `text` | NO | — | `—` | — |
| 4 | `action` | `text` | NO | — | `—` | — |
| 5 | `actor` | `text` | YES | — | `—` | — |
| 6 | `beforeJson` | `jsonb` | YES | — | `—` | — |
| 7 | `afterJson` | `jsonb` | YES | — | `—` | — |
| 8 | `comment` | `text` | YES | — | `—` | — |
| 9 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |

### 4.3. `DeviationReason`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `code` | `text` | NO | PK | `—` | — |
| 2 | `name` | `text` | NO | — | `—` | — |
| 3 | `category` | `text` | NO | — | `—` | — |
| 4 | `timeCategory` | `text` | NO | — | `—` | — |
| 5 | `affectsWorkerKpi` | `boolean` | NO | — | `true` | — |
| 6 | `requiresSupervisorNote` | `boolean` | NO | — | `false` | — |
| 7 | `isActive` | `boolean` | NO | — | `true` | — |
| 8 | `sortOrder` | `integer` | NO | — | `100` | — |
| 9 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 10 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.4. `ImportBatch`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"ImportBatch_id_seq"'::regclass)` | — |
| 2 | `fileName` | `text` | NO | — | `—` | — |
| 3 | `uploadedAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 4 | `status` | `text` | NO | — | `—` | — |
| 5 | `rowsTotal` | `integer` | NO | — | `0` | — |
| 6 | `rowsCreated` | `integer` | NO | — | `0` | — |
| 7 | `rowsUpdated` | `integer` | NO | — | `0` | — |
| 8 | `errorsJson` | `jsonb` | YES | — | `—` | — |

### 4.5. `NomenclatureProcessRecord`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `text` | NO | PK | `—` | — |
| 2 | `equipment` | `text` | NO | — | `—` | — |
| 3 | `productCode` | `text` | NO | — | `—` | — |
| 4 | `category` | `text` | NO | — | `—` | — |
| 5 | `operationsCount` | `integer` | NO | — | `0` | — |
| 6 | `totalNormHours` | `double precision` | NO | — | `0` | — |
| 7 | `confidence` | `text` | NO | — | `'manual'::text` | — |
| 8 | `data` | `jsonb` | NO | — | `—` | — |
| 9 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 10 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.6. `OperationEvent`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"OperationEvent_id_seq"'::regclass)` | — |
| 2 | `orderId` | `integer` | NO | FK | `—` | — |
| 3 | `orderOperationId` | `integer` | NO | FK | `—` | — |
| 4 | `eventType` | `text` | NO | — | `—` | — |
| 5 | `personId` | `integer` | YES | FK | `—` | — |
| 6 | `timestamp` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 7 | `payload` | `jsonb` | YES | — | `—` | — |

### 4.7. `Order`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"Order_id_seq"'::regclass)` | — |
| 2 | `orderNumber` | `text` | NO | — | `—` | — |
| 3 | `productCode` | `text` | NO | — | `—` | — |
| 4 | `productName` | `text` | YES | — | `—` | — |
| 5 | `quantity` | `integer` | NO | — | `—` | — |
| 6 | `dueDate` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 7 | `customer` | `text` | YES | — | `—` | — |
| 8 | `priority` | `text` | YES | — | `—` | — |
| 9 | `comment` | `text` | YES | — | `—` | — |
| 10 | `sourceFile` | `text` | YES | — | `—` | — |
| 11 | `status` | `text` | NO | — | `'active'::text` | — |
| 12 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 13 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.8. `OrderOperation`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"OrderOperation_id_seq"'::regclass)` | — |
| 2 | `orderId` | `integer` | NO | FK | `—` | — |
| 3 | `operationCode` | `text` | NO | — | `—` | — |
| 4 | `flow` | `text` | NO | — | `—` | — |
| 5 | `name` | `text` | NO | — | `—` | — |
| 6 | `section` | `text` | NO | — | `—` | — |
| 7 | `normHours` | `double precision` | NO | — | `—` | — |
| 8 | `previousOperationCodes` | `text[]` | YES | — | `—` | — |
| 9 | `nextOperationCodes` | `text[]` | YES | — | `—` | — |
| 10 | `sortOrder` | `integer` | NO | — | `—` | — |
| 11 | `status` | `"OperationStatus"` | NO | — | `'new'::"OperationStatus"` | — |
| 12 | `lifecycleStatus` | `text` | NO | — | `'new'::text` | — |
| 13 | `assignedPersonId` | `integer` | YES | FK | `—` | — |
| 14 | `startedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 15 | `finishedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 16 | `actualHours` | `double precision` | YES | — | `—` | — |
| 17 | `pauseHours` | `double precision` | YES | — | `0` | — |
| 18 | `comment` | `text` | YES | — | `—` | — |

### 4.9. `Person`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"Person_id_seq"'::regclass)` | — |
| 2 | `fullName` | `text` | NO | — | `—` | — |
| 3 | `section` | `text` | NO | — | `—` | — |
| 4 | `isActive` | `boolean` | NO | — | `true` | — |

### 4.10. `ProductionCalendarDay`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"ProductionCalendarDay_id_seq"'::regclass)` | — |
| 2 | `date` | `timestamp(3) without time zone` | NO | — | `—` | — |
| 3 | `dayType` | `text` | NO | — | `'workday'::text` | — |
| 4 | `startsAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 5 | `endsAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 6 | `comment` | `text` | YES | — | `—` | — |
| 7 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 8 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.11. `ProductionOperationEvent`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"ProductionOperationEvent_id_seq"'::regclass)` | — |
| 2 | `runId` | `text` | NO | FK | `—` | — |
| 3 | `unitId` | `text` | YES | FK | `—` | — |
| 4 | `operationPk` | `text` | YES | FK | `—` | — |
| 5 | `eventType` | `text` | NO | — | `—` | — |
| 6 | `actor` | `text` | YES | — | `—` | — |
| 7 | `timestamp` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 8 | `payload` | `jsonb` | YES | — | `—` | — |
| 9 | `shiftId` | `integer` | YES | FK | `—` | — |
| 10 | `reasonCode` | `text` | YES | — | `—` | — |
| 11 | `timeCategory` | `text` | YES | — | `—` | — |

### 4.12. `ProductionRun`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `text` | NO | PK | `—` | — |
| 2 | `legacyRecordId` | `text` | YES | — | `—` | — |
| 3 | `orderId` | `integer` | YES | — | `—` | — |
| 4 | `orderNumber` | `character varying(20)` | YES | — | `—` | — |
| 5 | `batchNumber` | `text` | YES | — | `—` | — |
| 6 | `batchName` | `text` | YES | — | `—` | — |
| 7 | `batchCreatedBy` | `text` | YES | — | `—` | — |
| 8 | `batchSource` | `text` | YES | — | `—` | — |
| 9 | `productId` | `text` | NO | — | `—` | — |
| 10 | `productCode` | `text` | NO | — | `—` | — |
| 11 | `productName` | `text` | NO | — | `—` | — |
| 12 | `quantity` | `integer` | NO | — | `—` | — |
| 13 | `totalQuantity` | `integer` | YES | — | `—` | — |
| 14 | `launchedQuantity` | `integer` | YES | — | `—` | — |
| 15 | `status` | `text` | NO | — | `'draft'::text` | — |
| 16 | `priority` | `text` | NO | — | `'normal'::text` | — |
| 17 | `priorityRank` | `integer` | YES | — | `—` | — |
| 18 | `operator` | `text` | YES | — | `—` | — |
| 19 | `comment` | `text` | YES | — | `—` | — |
| 20 | `archived` | `boolean` | NO | — | `false` | — |
| 21 | `testData` | `boolean` | NO | — | `false` | — |
| 22 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 23 | `startedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 24 | `completedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 25 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.13. `ProductionRunRecord`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `text` | NO | PK | `—` | — |
| 2 | `orderId` | `integer` | YES | — | `—` | — |
| 3 | `orderNumber` | `character varying(20)` | YES | — | `—` | — |
| 4 | `productId` | `text` | YES | — | `—` | — |
| 5 | `productCode` | `text` | YES | — | `—` | — |
| 6 | `productName` | `text` | YES | — | `—` | — |
| 7 | `quantity` | `integer` | YES | — | `—` | — |
| 8 | `status` | `text` | YES | — | `—` | — |
| 9 | `priority` | `text` | YES | — | `—` | — |
| 10 | `operator` | `text` | YES | — | `—` | — |
| 11 | `startedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 12 | `completedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 13 | `data` | `jsonb` | NO | — | `—` | — |
| 14 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 15 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.14. `ProductionUnit`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `text` | NO | PK | `—` | — |
| 2 | `runId` | `text` | NO | FK | `—` | — |
| 3 | `unitNo` | `integer` | NO | — | `—` | — |
| 4 | `status` | `text` | NO | — | `'draft'::text` | — |
| 5 | `progress` | `double precision` | NO | — | `0` | — |
| 6 | `startedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 7 | `completedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 8 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 9 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.15. `ProductionUnitOperation`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `text` | NO | PK | `—` | — |
| 2 | `runId` | `text` | NO | FK | `—` | — |
| 3 | `unitId` | `text` | YES | FK | `—` | — |
| 4 | `operationId` | `text` | NO | — | `—` | — |
| 5 | `sequence` | `integer` | NO | — | `—` | — |
| 6 | `level` | `integer` | YES | — | `—` | — |
| 7 | `partOrAssembly` | `text` | NO | — | `—` | — |
| 8 | `name` | `text` | NO | — | `—` | — |
| 9 | `section` | `text` | NO | — | `—` | — |
| 10 | `previousOperationCodes` | `text[]` | YES | — | `—` | — |
| 11 | `nextOperationCodes` | `text[]` | YES | — | `—` | — |
| 12 | `normHours` | `double precision` | NO | — | `—` | — |
| 13 | `status` | `text` | NO | — | `'queued'::text` | — |
| 14 | `priority` | `text` | NO | — | `'normal'::text` | — |
| 15 | `priorityRank` | `integer` | YES | — | `—` | — |
| 16 | `lockedBy` | `text` | YES | — | `—` | — |
| 17 | `lockedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 18 | `lockReason` | `text` | YES | — | `—` | — |
| 19 | `lockToken` | `text` | YES | — | `—` | — |
| 20 | `lockTerminalId` | `text` | YES | — | `—` | — |
| 21 | `lockClientId` | `text` | YES | — | `—` | — |
| 22 | `lockExpiresAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 23 | `lockVersion` | `integer` | NO | — | `0` | — |
| 24 | `selectedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 25 | `startedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 26 | `pausedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 27 | `completedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 28 | `actualHours` | `double precision` | NO | — | `0` | — |
| 29 | `shiftId` | `integer` | YES | FK | `—` | — |
| 30 | `pauseReasonCode` | `text` | YES | — | `—` | — |
| 31 | `deviationReasonCode` | `text` | YES | — | `—` | — |
| 32 | `timeCategory` | `text` | YES | — | `—` | — |
| 33 | `acceptedQty` | `integer` | NO | — | `0` | — |
| 34 | `defectQty` | `integer` | NO | — | `0` | — |
| 35 | `reworkQty` | `integer` | NO | — | `0` | — |
| 36 | `qualityStatus` | `text` | YES | — | `—` | — |
| 37 | `groupCapable` | `boolean` | NO | — | `false` | — |
| 38 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 39 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.16. `QualityRecord`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"QualityRecord_id_seq"'::regclass)` | — |
| 2 | `orderOperationId` | `integer` | NO | FK | `—` | — |
| 3 | `orderId` | `integer` | NO | FK | `—` | — |
| 4 | `personId` | `integer` | YES | FK | `—` | — |
| 5 | `checkedQty` | `integer` | NO | — | `0` | — |
| 6 | `acceptedQty` | `integer` | NO | — | `0` | — |
| 7 | `defectQty` | `integer` | NO | — | `0` | — |
| 8 | `reworkQty` | `integer` | NO | — | `0` | — |
| 9 | `defectReason` | `text` | YES | — | `—` | — |
| 10 | `reasonCode` | `text` | YES | — | `—` | — |
| 11 | `responsibleOperationCode` | `text` | YES | — | `—` | — |
| 12 | `inspector` | `text` | YES | — | `—` | — |
| 13 | `status` | `text` | NO | — | `'recorded'::text` | — |
| 14 | `comment` | `text` | YES | — | `—` | — |
| 15 | `recordedAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |

### 4.17. `ReferenceOperation`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"ReferenceOperation_id_seq"'::regclass)` | — |
| 2 | `operationCode` | `text` | NO | — | `—` | — |
| 3 | `name` | `text` | NO | — | `—` | — |
| 4 | `defaultSection` | `text` | YES | — | `—` | — |
| 5 | `defaultNormHours` | `double precision` | YES | — | `—` | — |
| 6 | `partOrAssembly` | `text` | YES | — | `—` | — |
| 7 | `isActive` | `boolean` | NO | — | `true` | — |
| 8 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 9 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.18. `ReferenceSection`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"ReferenceSection_id_seq"'::regclass)` | — |
| 2 | `name` | `text` | NO | — | `—` | — |
| 3 | `isActive` | `boolean` | NO | — | `true` | — |
| 4 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 5 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.19. `RouteOperation`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"RouteOperation_id_seq"'::regclass)` | — |
| 2 | `routeTemplateId` | `integer` | NO | FK | `—` | — |
| 3 | `operationCode` | `text` | NO | — | `—` | — |
| 4 | `flow` | `text` | NO | — | `—` | — |
| 5 | `name` | `text` | NO | — | `—` | — |
| 6 | `section` | `text` | NO | — | `—` | — |
| 7 | `normHours` | `double precision` | NO | — | `—` | — |
| 8 | `previousOperationCodes` | `text[]` | YES | — | `—` | — |
| 9 | `nextOperationCodes` | `text[]` | YES | — | `—` | — |
| 10 | `sortOrder` | `integer` | NO | — | `—` | — |

### 4.20. `RouteTemplate`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"RouteTemplate_id_seq"'::regclass)` | — |
| 2 | `productCode` | `text` | NO | — | `—` | — |
| 3 | `name` | `text` | NO | — | `—` | — |
| 4 | `version` | `text` | NO | — | `—` | — |
| 5 | `isActive` | `boolean` | NO | — | `true` | — |

### 4.21. `SectionCapacity`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"SectionCapacity_id_seq"'::regclass)` | — |
| 2 | `section` | `text` | NO | — | `—` | — |
| 3 | `availableHours` | `double precision` | NO | — | `—` | — |
| 4 | `weldHours` | `double precision` | YES | — | `—` | — |
| 5 | `period` | `text` | NO | — | `'month'::text` | — |

### 4.22. `TimeTracking`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"TimeTracking_id_seq"'::regclass)` | — |
| 2 | `orderOperationId` | `integer` | NO | FK | `—` | — |
| 3 | `orderId` | `integer` | NO | FK | `—` | — |
| 4 | `personId` | `integer` | YES | FK | `—` | — |
| 5 | `kind` | `text` | NO | — | `—` | — |
| 6 | `startedAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 7 | `endedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 8 | `durationMinutes` | `integer` | YES | — | `—` | — |
| 9 | `comment` | `text` | YES | — | `—` | — |
| 10 | `reasonCode` | `text` | YES | — | `—` | — |
| 11 | `timeCategory` | `text` | YES | — | `—` | — |
| 12 | `shiftId` | `integer` | YES | FK | `—` | — |
| 13 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |

### 4.23. `WorkCenter`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"WorkCenter_id_seq"'::regclass)` | — |
| 2 | `section` | `text` | NO | FK | `—` | — |
| 3 | `name` | `text` | NO | — | `—` | — |
| 4 | `capacityHours` | `double precision` | NO | — | `8` | — |
| 5 | `workType` | `text` | YES | — | `—` | — |
| 6 | `masterPersonId` | `integer` | YES | FK | `—` | — |
| 7 | `isActive` | `boolean` | NO | — | `true` | — |
| 8 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 9 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.24. `WorkShift`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `integer` | NO | PK | `nextval('"WorkShift_id_seq"'::regclass)` | — |
| 2 | `shiftDate` | `timestamp(3) without time zone` | NO | — | `—` | — |
| 3 | `section` | `text` | NO | — | `—` | — |
| 4 | `workCenterId` | `integer` | YES | FK | `—` | — |
| 5 | `startsAt` | `timestamp(3) without time zone` | NO | — | `—` | — |
| 6 | `endsAt` | `timestamp(3) without time zone` | NO | — | `—` | — |
| 7 | `brigade` | `text` | YES | — | `—` | — |
| 8 | `master` | `text` | YES | — | `—` | — |
| 9 | `status` | `text` | NO | — | `'open'::text` | — |
| 10 | `closedAt` | `timestamp(3) without time zone` | YES | — | `—` | — |
| 11 | `closedBy` | `text` | YES | — | `—` | — |
| 12 | `closeComment` | `text` | YES | — | `—` | — |
| 13 | `disputedJson` | `jsonb` | YES | — | `—` | — |
| 14 | `createdAt` | `timestamp(3) without time zone` | NO | — | `CURRENT_TIMESTAMP` | — |
| 15 | `updatedAt` | `timestamp(3) without time zone` | NO | — | `—` | — |

### 4.25. `_prisma_migrations`

| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |
|---:|---|---|---|---|---|---|
| 1 | `id` | `character varying(36)` | NO | PK | `—` | — |
| 2 | `checksum` | `character varying(64)` | NO | — | `—` | — |
| 3 | `finished_at` | `timestamp with time zone` | YES | — | `—` | — |
| 4 | `migration_name` | `character varying(255)` | NO | — | `—` | — |
| 5 | `logs` | `text` | YES | — | `—` | — |
| 6 | `rolled_back_at` | `timestamp with time zone` | YES | — | `—` | — |
| 7 | `started_at` | `timestamp with time zone` | NO | — | `now()` | — |
| 8 | `applied_steps_count` | `integer` | NO | — | `0` | — |

## 5. Constraints

| Таблица | Имя | Тип | Определение |
|---|---|---|---|
| `AppUser` | `AppUser_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `AppUser` | `AppUser_personId_fkey` | FOREIGN KEY | `FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `AuditLog` | `AuditLog_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `DeviationReason` | `DeviationReason_pkey` | PRIMARY KEY | `PRIMARY KEY (code)` |
| `ImportBatch` | `ImportBatch_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `NomenclatureProcessRecord` | `NomenclatureProcessRecord_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `OperationEvent` | `OperationEvent_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `OperationEvent` | `OperationEvent_orderId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `OperationEvent` | `OperationEvent_orderOperationId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderOperationId") REFERENCES "OrderOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `OperationEvent` | `OperationEvent_personId_fkey` | FOREIGN KEY | `FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `Order` | `Order_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `OrderOperation` | `OrderOperation_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `OrderOperation` | `OrderOperation_assignedPersonId_fkey` | FOREIGN KEY | `FOREIGN KEY ("assignedPersonId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `OrderOperation` | `OrderOperation_orderId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `Person` | `Person_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionCalendarDay` | `ProductionCalendarDay_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionOperationEvent` | `ProductionOperationEvent_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionOperationEvent` | `ProductionOperationEvent_operationPk_fkey` | FOREIGN KEY | `FOREIGN KEY ("operationPk") REFERENCES "ProductionUnitOperation"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `ProductionOperationEvent` | `ProductionOperationEvent_runId_fkey` | FOREIGN KEY | `FOREIGN KEY ("runId") REFERENCES "ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `ProductionOperationEvent` | `ProductionOperationEvent_shiftId_fkey` | FOREIGN KEY | `FOREIGN KEY ("shiftId") REFERENCES "WorkShift"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `ProductionOperationEvent` | `ProductionOperationEvent_unitId_fkey` | FOREIGN KEY | `FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `ProductionRun` | `ProductionRun_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionRunRecord` | `ProductionRunRecord_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionUnit` | `ProductionUnit_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionUnit` | `ProductionUnit_runId_fkey` | FOREIGN KEY | `FOREIGN KEY ("runId") REFERENCES "ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `ProductionUnitOperation` | `ProductionUnitOperation_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ProductionUnitOperation` | `ProductionUnitOperation_runId_fkey` | FOREIGN KEY | `FOREIGN KEY ("runId") REFERENCES "ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `ProductionUnitOperation` | `ProductionUnitOperation_shiftId_fkey` | FOREIGN KEY | `FOREIGN KEY ("shiftId") REFERENCES "WorkShift"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `ProductionUnitOperation` | `ProductionUnitOperation_unitId_fkey` | FOREIGN KEY | `FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `QualityRecord` | `QualityRecord_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `QualityRecord` | `QualityRecord_orderId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `QualityRecord` | `QualityRecord_orderOperationId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderOperationId") REFERENCES "OrderOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `QualityRecord` | `QualityRecord_personId_fkey` | FOREIGN KEY | `FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `ReferenceOperation` | `ReferenceOperation_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `ReferenceSection` | `ReferenceSection_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `RouteOperation` | `RouteOperation_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `RouteOperation` | `RouteOperation_routeTemplateId_fkey` | FOREIGN KEY | `FOREIGN KEY ("routeTemplateId") REFERENCES "RouteTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `RouteTemplate` | `RouteTemplate_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `SectionCapacity` | `SectionCapacity_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `TimeTracking` | `TimeTracking_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `TimeTracking` | `TimeTracking_orderId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `TimeTracking` | `TimeTracking_orderOperationId_fkey` | FOREIGN KEY | `FOREIGN KEY ("orderOperationId") REFERENCES "OrderOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE` |
| `TimeTracking` | `TimeTracking_personId_fkey` | FOREIGN KEY | `FOREIGN KEY ("personId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `TimeTracking` | `TimeTracking_shiftId_fkey` | FOREIGN KEY | `FOREIGN KEY ("shiftId") REFERENCES "WorkShift"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `WorkCenter` | `WorkCenter_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `WorkCenter` | `WorkCenter_masterPersonId_fkey` | FOREIGN KEY | `FOREIGN KEY ("masterPersonId") REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `WorkCenter` | `WorkCenter_section_fkey` | FOREIGN KEY | `FOREIGN KEY (section) REFERENCES "ReferenceSection"(name) ON UPDATE CASCADE ON DELETE RESTRICT` |
| `WorkShift` | `WorkShift_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `WorkShift` | `WorkShift_workCenterId_fkey` | FOREIGN KEY | `FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| `_prisma_migrations` | `_prisma_migrations_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |

## 6. Foreign keys: карта связей

Коды действий PostgreSQL: `a` no action, `r` restrict, `c` cascade, `n` set null, `d` set default.

| Откуда | Поля | Куда | Действие update/delete |
|---|---|---|---|
| `AppUser` | `personId` | `Person`(`id`) | update=c, delete=n |
| `OperationEvent` | `orderId` | `Order`(`id`) | update=c, delete=c |
| `OperationEvent` | `orderOperationId` | `OrderOperation`(`id`) | update=c, delete=c |
| `OperationEvent` | `personId` | `Person`(`id`) | update=c, delete=n |
| `OrderOperation` | `assignedPersonId` | `Person`(`id`) | update=c, delete=n |
| `OrderOperation` | `orderId` | `Order`(`id`) | update=c, delete=c |
| `ProductionOperationEvent` | `operationPk` | `ProductionUnitOperation`(`id`) | update=c, delete=n |
| `ProductionOperationEvent` | `runId` | `ProductionRun`(`id`) | update=c, delete=c |
| `ProductionOperationEvent` | `shiftId` | `WorkShift`(`id`) | update=c, delete=n |
| `ProductionOperationEvent` | `unitId` | `ProductionUnit`(`id`) | update=c, delete=n |
| `ProductionUnit` | `runId` | `ProductionRun`(`id`) | update=c, delete=c |
| `ProductionUnitOperation` | `runId` | `ProductionRun`(`id`) | update=c, delete=c |
| `ProductionUnitOperation` | `shiftId` | `WorkShift`(`id`) | update=c, delete=n |
| `ProductionUnitOperation` | `unitId` | `ProductionUnit`(`id`) | update=c, delete=c |
| `QualityRecord` | `orderId` | `Order`(`id`) | update=c, delete=c |
| `QualityRecord` | `orderOperationId` | `OrderOperation`(`id`) | update=c, delete=c |
| `QualityRecord` | `personId` | `Person`(`id`) | update=c, delete=n |
| `RouteOperation` | `routeTemplateId` | `RouteTemplate`(`id`) | update=c, delete=c |
| `TimeTracking` | `orderId` | `Order`(`id`) | update=c, delete=c |
| `TimeTracking` | `orderOperationId` | `OrderOperation`(`id`) | update=c, delete=c |
| `TimeTracking` | `personId` | `Person`(`id`) | update=c, delete=n |
| `TimeTracking` | `shiftId` | `WorkShift`(`id`) | update=c, delete=n |
| `WorkCenter` | `masterPersonId` | `Person`(`id`) | update=c, delete=n |
| `WorkCenter` | `section` | `ReferenceSection`(`name`) | update=c, delete=r |
| `WorkShift` | `workCenterId` | `WorkCenter`(`id`) | update=c, delete=n |

## 7. Indexes

| Таблица | Индекс | Размер | Определение |
|---|---|---:|---|
| `AppUser` | `AppUser_login_key` | 16 kB | `CREATE UNIQUE INDEX "AppUser_login_key" ON public."AppUser" USING btree (login)` |
| `AppUser` | `AppUser_pkey` | 16 kB | `CREATE UNIQUE INDEX "AppUser_pkey" ON public."AppUser" USING btree (id)` |
| `AppUser` | `AppUser_terminalQrToken_key` | 16 kB | `CREATE UNIQUE INDEX "AppUser_terminalQrToken_key" ON public."AppUser" USING btree ("terminalQrToken")` |
| `AuditLog` | `AuditLog_action_idx` | 16 kB | `CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action)` |
| `AuditLog` | `AuditLog_createdAt_idx` | 16 kB | `CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt")` |
| `AuditLog` | `AuditLog_entityType_entityId_idx` | 16 kB | `CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId")` |
| `AuditLog` | `AuditLog_pkey` | 16 kB | `CREATE UNIQUE INDEX "AuditLog_pkey" ON public."AuditLog" USING btree (id)` |
| `DeviationReason` | `DeviationReason_category_idx` | 16 kB | `CREATE INDEX "DeviationReason_category_idx" ON public."DeviationReason" USING btree (category)` |
| `DeviationReason` | `DeviationReason_isActive_idx` | 16 kB | `CREATE INDEX "DeviationReason_isActive_idx" ON public."DeviationReason" USING btree ("isActive")` |
| `DeviationReason` | `DeviationReason_pkey` | 16 kB | `CREATE UNIQUE INDEX "DeviationReason_pkey" ON public."DeviationReason" USING btree (code)` |
| `DeviationReason` | `DeviationReason_timeCategory_idx` | 16 kB | `CREATE INDEX "DeviationReason_timeCategory_idx" ON public."DeviationReason" USING btree ("timeCategory")` |
| `ImportBatch` | `ImportBatch_pkey` | 16 kB | `CREATE UNIQUE INDEX "ImportBatch_pkey" ON public."ImportBatch" USING btree (id)` |
| `NomenclatureProcessRecord` | `NomenclatureProcessRecord_category_idx` | 16 kB | `CREATE INDEX "NomenclatureProcessRecord_category_idx" ON public."NomenclatureProcessRecord" USING btree (category)` |
| `NomenclatureProcessRecord` | `NomenclatureProcessRecord_pkey` | 16 kB | `CREATE UNIQUE INDEX "NomenclatureProcessRecord_pkey" ON public."NomenclatureProcessRecord" USING btree (id)` |
| `NomenclatureProcessRecord` | `NomenclatureProcessRecord_productCode_idx` | 16 kB | `CREATE INDEX "NomenclatureProcessRecord_productCode_idx" ON public."NomenclatureProcessRecord" USING btree ("productCode")` |
| `OperationEvent` | `OperationEvent_pkey` | 16 kB | `CREATE UNIQUE INDEX "OperationEvent_pkey" ON public."OperationEvent" USING btree (id)` |
| `Order` | `Order_orderNumber_key` | 16 kB | `CREATE UNIQUE INDEX "Order_orderNumber_key" ON public."Order" USING btree ("orderNumber")` |
| `Order` | `Order_pkey` | 16 kB | `CREATE UNIQUE INDEX "Order_pkey" ON public."Order" USING btree (id)` |
| `OrderOperation` | `OrderOperation_orderId_operationCode_key` | 16 kB | `CREATE UNIQUE INDEX "OrderOperation_orderId_operationCode_key" ON public."OrderOperation" USING btree ("orderId", "operationCode")` |
| `OrderOperation` | `OrderOperation_pkey` | 16 kB | `CREATE UNIQUE INDEX "OrderOperation_pkey" ON public."OrderOperation" USING btree (id)` |
| `Person` | `Person_pkey` | 16 kB | `CREATE UNIQUE INDEX "Person_pkey" ON public."Person" USING btree (id)` |
| `ProductionCalendarDay` | `ProductionCalendarDay_date_key` | 8192 bytes | `CREATE UNIQUE INDEX "ProductionCalendarDay_date_key" ON public."ProductionCalendarDay" USING btree (date)` |
| `ProductionCalendarDay` | `ProductionCalendarDay_pkey` | 8192 bytes | `CREATE UNIQUE INDEX "ProductionCalendarDay_pkey" ON public."ProductionCalendarDay" USING btree (id)` |
| `ProductionOperationEvent` | `ProductionOperationEvent_eventType_idx` | 40 kB | `CREATE INDEX "ProductionOperationEvent_eventType_idx" ON public."ProductionOperationEvent" USING btree ("eventType")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_operationPk_idx` | 112 kB | `CREATE INDEX "ProductionOperationEvent_operationPk_idx" ON public."ProductionOperationEvent" USING btree ("operationPk")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_pkey` | 64 kB | `CREATE UNIQUE INDEX "ProductionOperationEvent_pkey" ON public."ProductionOperationEvent" USING btree (id)` |
| `ProductionOperationEvent` | `ProductionOperationEvent_reasonCode_idx` | 40 kB | `CREATE INDEX "ProductionOperationEvent_reasonCode_idx" ON public."ProductionOperationEvent" USING btree ("reasonCode")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_runId_eventType_timestamp_idx` | 184 kB | `CREATE INDEX "ProductionOperationEvent_runId_eventType_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("runId", "eventType", "timestamp")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_runId_timestamp_idx` | 152 kB | `CREATE INDEX "ProductionOperationEvent_runId_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("runId", "timestamp")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_shiftId_idx` | 48 kB | `CREATE INDEX "ProductionOperationEvent_shiftId_idx" ON public."ProductionOperationEvent" USING btree ("shiftId")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_timestamp_idx` | 64 kB | `CREATE INDEX "ProductionOperationEvent_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("timestamp")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_unitId_idx` | 40 kB | `CREATE INDEX "ProductionOperationEvent_unitId_idx" ON public."ProductionOperationEvent" USING btree ("unitId")` |
| `ProductionOperationEvent` | `ProductionOperationEvent_unitId_timestamp_idx` | 160 kB | `CREATE INDEX "ProductionOperationEvent_unitId_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("unitId", "timestamp")` |
| `ProductionRun` | `ProductionRun_archived_testData_status_idx` | 16 kB | `CREATE INDEX "ProductionRun_archived_testData_status_idx" ON public."ProductionRun" USING btree (archived, "testData", status)` |
| `ProductionRun` | `ProductionRun_orderId_status_idx` | 16 kB | `CREATE INDEX "ProductionRun_orderId_status_idx" ON public."ProductionRun" USING btree ("orderId", status)` |
| `ProductionRun` | `ProductionRun_orderNumber_idx` | 16 kB | `CREATE INDEX "ProductionRun_orderNumber_idx" ON public."ProductionRun" USING btree ("orderNumber")` |
| `ProductionRun` | `ProductionRun_pkey` | 16 kB | `CREATE UNIQUE INDEX "ProductionRun_pkey" ON public."ProductionRun" USING btree (id)` |
| `ProductionRun` | `ProductionRun_productCode_idx` | 16 kB | `CREATE INDEX "ProductionRun_productCode_idx" ON public."ProductionRun" USING btree ("productCode")` |
| `ProductionRun` | `ProductionRun_status_idx` | 16 kB | `CREATE INDEX "ProductionRun_status_idx" ON public."ProductionRun" USING btree (status)` |
| `ProductionRunRecord` | `ProductionRunRecord_orderNumber_idx` | 16 kB | `CREATE INDEX "ProductionRunRecord_orderNumber_idx" ON public."ProductionRunRecord" USING btree ("orderNumber")` |
| `ProductionRunRecord` | `ProductionRunRecord_pkey` | 16 kB | `CREATE UNIQUE INDEX "ProductionRunRecord_pkey" ON public."ProductionRunRecord" USING btree (id)` |
| `ProductionRunRecord` | `ProductionRunRecord_productCode_idx` | 16 kB | `CREATE INDEX "ProductionRunRecord_productCode_idx" ON public."ProductionRunRecord" USING btree ("productCode")` |
| `ProductionRunRecord` | `ProductionRunRecord_status_idx` | 16 kB | `CREATE INDEX "ProductionRunRecord_status_idx" ON public."ProductionRunRecord" USING btree (status)` |
| `ProductionUnit` | `ProductionUnit_pkey` | 16 kB | `CREATE UNIQUE INDEX "ProductionUnit_pkey" ON public."ProductionUnit" USING btree (id)` |
| `ProductionUnit` | `ProductionUnit_runId_status_idx` | 16 kB | `CREATE INDEX "ProductionUnit_runId_status_idx" ON public."ProductionUnit" USING btree ("runId", status)` |
| `ProductionUnit` | `ProductionUnit_runId_unitNo_key` | 16 kB | `CREATE UNIQUE INDEX "ProductionUnit_runId_unitNo_key" ON public."ProductionUnit" USING btree ("runId", "unitNo")` |
| `ProductionUnit` | `ProductionUnit_status_updatedAt_idx` | 16 kB | `CREATE INDEX "ProductionUnit_status_updatedAt_idx" ON public."ProductionUnit" USING btree (status, "updatedAt")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_deviationReasonCode_idx` | 96 kB | `CREATE INDEX "ProductionUnitOperation_deviationReasonCode_idx" ON public."ProductionUnitOperation" USING btree ("deviationReasonCode")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_lockExpiresAt_idx` | 96 kB | `CREATE INDEX "ProductionUnitOperation_lockExpiresAt_idx" ON public."ProductionUnitOperation" USING btree ("lockExpiresAt")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_lockToken_idx` | 96 kB | `CREATE INDEX "ProductionUnitOperation_lockToken_idx" ON public."ProductionUnitOperation" USING btree ("lockToken")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_operationId_status_idx` | 88 kB | `CREATE INDEX "ProductionUnitOperation_operationId_status_idx" ON public."ProductionUnitOperation" USING btree ("operationId", status)` |
| `ProductionUnitOperation` | `ProductionUnitOperation_pauseReasonCode_idx` | 96 kB | `CREATE INDEX "ProductionUnitOperation_pauseReasonCode_idx" ON public."ProductionUnitOperation" USING btree ("pauseReasonCode")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_pkey` | 136 kB | `CREATE UNIQUE INDEX "ProductionUnitOperation_pkey" ON public."ProductionUnitOperation" USING btree (id)` |
| `ProductionUnitOperation` | `ProductionUnitOperation_runId_status_idx` | 184 kB | `CREATE INDEX "ProductionUnitOperation_runId_status_idx" ON public."ProductionUnitOperation" USING btree ("runId", status)` |
| `ProductionUnitOperation` | `ProductionUnitOperation_runId_unitId_operationId_key` | 176 kB | `CREATE UNIQUE INDEX "ProductionUnitOperation_runId_unitId_operationId_key" ON public."ProductionUnitOperation" USING btree ("runId", "unitId", "operationId")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_runId_unitId_status_idx` | 128 kB | `CREATE INDEX "ProductionUnitOperation_runId_unitId_status_idx" ON public."ProductionUnitOperation" USING btree ("runId", "unitId", status)` |
| `ProductionUnitOperation` | `ProductionUnitOperation_section_status_idx` | 120 kB | `CREATE INDEX "ProductionUnitOperation_section_status_idx" ON public."ProductionUnitOperation" USING btree (section, status)` |
| `ProductionUnitOperation` | `ProductionUnitOperation_section_status_lockExpiresAt_idx` | 128 kB | `CREATE INDEX "ProductionUnitOperation_section_status_lockExpiresAt_idx" ON public."ProductionUnitOperation" USING btree (section, status, "lockExpiresAt")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_section_status_updatedAt_idx` | 1016 kB | `CREATE INDEX "ProductionUnitOperation_section_status_updatedAt_idx" ON public."ProductionUnitOperation" USING btree (section, status, "updatedAt")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_shiftId_idx` | 104 kB | `CREATE INDEX "ProductionUnitOperation_shiftId_idx" ON public."ProductionUnitOperation" USING btree ("shiftId")` |
| `ProductionUnitOperation` | `ProductionUnitOperation_unitId_status_idx` | 104 kB | `CREATE INDEX "ProductionUnitOperation_unitId_status_idx" ON public."ProductionUnitOperation" USING btree ("unitId", status)` |
| `QualityRecord` | `QualityRecord_orderId_idx` | 8192 bytes | `CREATE INDEX "QualityRecord_orderId_idx" ON public."QualityRecord" USING btree ("orderId")` |
| `QualityRecord` | `QualityRecord_orderOperationId_idx` | 8192 bytes | `CREATE INDEX "QualityRecord_orderOperationId_idx" ON public."QualityRecord" USING btree ("orderOperationId")` |
| `QualityRecord` | `QualityRecord_pkey` | 8192 bytes | `CREATE UNIQUE INDEX "QualityRecord_pkey" ON public."QualityRecord" USING btree (id)` |
| `QualityRecord` | `QualityRecord_reasonCode_idx` | 8192 bytes | `CREATE INDEX "QualityRecord_reasonCode_idx" ON public."QualityRecord" USING btree ("reasonCode")` |
| `ReferenceOperation` | `ReferenceOperation_defaultSection_idx` | 16 kB | `CREATE INDEX "ReferenceOperation_defaultSection_idx" ON public."ReferenceOperation" USING btree ("defaultSection")` |
| `ReferenceOperation` | `ReferenceOperation_operationCode_key` | 16 kB | `CREATE UNIQUE INDEX "ReferenceOperation_operationCode_key" ON public."ReferenceOperation" USING btree ("operationCode")` |
| `ReferenceOperation` | `ReferenceOperation_pkey` | 16 kB | `CREATE UNIQUE INDEX "ReferenceOperation_pkey" ON public."ReferenceOperation" USING btree (id)` |
| `ReferenceSection` | `ReferenceSection_name_key` | 16 kB | `CREATE UNIQUE INDEX "ReferenceSection_name_key" ON public."ReferenceSection" USING btree (name)` |
| `ReferenceSection` | `ReferenceSection_pkey` | 16 kB | `CREATE UNIQUE INDEX "ReferenceSection_pkey" ON public."ReferenceSection" USING btree (id)` |
| `RouteOperation` | `RouteOperation_pkey` | 16 kB | `CREATE UNIQUE INDEX "RouteOperation_pkey" ON public."RouteOperation" USING btree (id)` |
| `RouteOperation` | `RouteOperation_routeTemplateId_operationCode_key` | 16 kB | `CREATE UNIQUE INDEX "RouteOperation_routeTemplateId_operationCode_key" ON public."RouteOperation" USING btree ("routeTemplateId", "operationCode")` |
| `RouteTemplate` | `RouteTemplate_pkey` | 16 kB | `CREATE UNIQUE INDEX "RouteTemplate_pkey" ON public."RouteTemplate" USING btree (id)` |
| `RouteTemplate` | `RouteTemplate_productCode_version_key` | 16 kB | `CREATE UNIQUE INDEX "RouteTemplate_productCode_version_key" ON public."RouteTemplate" USING btree ("productCode", version)` |
| `SectionCapacity` | `SectionCapacity_pkey` | 16 kB | `CREATE UNIQUE INDEX "SectionCapacity_pkey" ON public."SectionCapacity" USING btree (id)` |
| `SectionCapacity` | `SectionCapacity_section_period_key` | 16 kB | `CREATE UNIQUE INDEX "SectionCapacity_section_period_key" ON public."SectionCapacity" USING btree (section, period)` |
| `TimeTracking` | `TimeTracking_orderId_idx` | 16 kB | `CREATE INDEX "TimeTracking_orderId_idx" ON public."TimeTracking" USING btree ("orderId")` |
| `TimeTracking` | `TimeTracking_orderOperationId_kind_endedAt_idx` | 16 kB | `CREATE INDEX "TimeTracking_orderOperationId_kind_endedAt_idx" ON public."TimeTracking" USING btree ("orderOperationId", kind, "endedAt")` |
| `TimeTracking` | `TimeTracking_pkey` | 16 kB | `CREATE UNIQUE INDEX "TimeTracking_pkey" ON public."TimeTracking" USING btree (id)` |
| `TimeTracking` | `TimeTracking_reasonCode_idx` | 16 kB | `CREATE INDEX "TimeTracking_reasonCode_idx" ON public."TimeTracking" USING btree ("reasonCode")` |
| `TimeTracking` | `TimeTracking_shiftId_idx` | 16 kB | `CREATE INDEX "TimeTracking_shiftId_idx" ON public."TimeTracking" USING btree ("shiftId")` |
| `WorkCenter` | `WorkCenter_masterPersonId_idx` | 16 kB | `CREATE INDEX "WorkCenter_masterPersonId_idx" ON public."WorkCenter" USING btree ("masterPersonId")` |
| `WorkCenter` | `WorkCenter_pkey` | 16 kB | `CREATE UNIQUE INDEX "WorkCenter_pkey" ON public."WorkCenter" USING btree (id)` |
| `WorkCenter` | `WorkCenter_section_idx` | 16 kB | `CREATE INDEX "WorkCenter_section_idx" ON public."WorkCenter" USING btree (section)` |
| `WorkCenter` | `WorkCenter_section_name_key` | 16 kB | `CREATE UNIQUE INDEX "WorkCenter_section_name_key" ON public."WorkCenter" USING btree (section, name)` |
| `WorkShift` | `WorkShift_pkey` | 16 kB | `CREATE UNIQUE INDEX "WorkShift_pkey" ON public."WorkShift" USING btree (id)` |
| `WorkShift` | `WorkShift_section_startsAt_endsAt_idx` | 16 kB | `CREATE INDEX "WorkShift_section_startsAt_endsAt_idx" ON public."WorkShift" USING btree (section, "startsAt", "endsAt")` |
| `WorkShift` | `WorkShift_shiftDate_idx` | 16 kB | `CREATE INDEX "WorkShift_shiftDate_idx" ON public."WorkShift" USING btree ("shiftDate")` |
| `WorkShift` | `WorkShift_status_idx` | 16 kB | `CREATE INDEX "WorkShift_status_idx" ON public."WorkShift" USING btree (status)` |
| `_prisma_migrations` | `_prisma_migrations_pkey` | 16 kB | `CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id)` |

## 8. Sequences

| Sequence | Тип | Start | Min | Max | Increment | Cycle |
|---|---|---:|---:|---:|---:|---|
| `AppUser_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `AuditLog_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `ImportBatch_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `OperationEvent_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `OrderOperation_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `Order_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `Person_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `ProductionCalendarDay_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `ProductionOperationEvent_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `QualityRecord_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `ReferenceOperation_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `ReferenceSection_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `RouteOperation_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `RouteTemplate_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `SectionCapacity_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `TimeTracking_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `WorkCenter_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |
| `WorkShift_id_seq` | `integer` | 1 | 1 | 2147483647 | 1 | NO |

## 9. Views

Views в `public` schema не найдены.

## 10. Enum types

| Enum | Значения |
|---|---|
| `OperationStatus` | `new, work, done` |

## 11. Prisma migrations

| Migration | Finished at | Logs | Rolled back |
|---|---|---|---|
| `20260527061000_add_time_quality_role_ready` | 2026-06-17 05:08:45.819294+00 | — | — |
| `20260602120000_terminal_accounts` | 2026-06-17 05:08:48.346171+00 | — | — |
| `20260603120000_production_runs_table` | 2026-06-17 05:08:50.872596+00 | — | — |
| `20260603133000_production_run_requisites` | 2026-06-17 05:08:53.470541+00 | — | — |
| `20260603143000_nomenclature_process_records` | 2026-06-17 05:08:56.050336+00 | — | — |
| `20260605120000_normalized_production_runs` | 2026-06-17 05:08:58.502053+00 | — | — |
| `20260605143000_shifts_reasons_workcenters` | 2026-06-17 05:09:01.044629+00 | — | — |
| `20260610161000_batches_and_group_operations` | 2026-06-17 05:09:03.674891+00 | — | — |
| `20260611100000_terminal_qr_login` | 2026-06-17 05:09:06.232036+00 | — | — |
| `20260611113000_production_runtime_indexes` | 2026-06-17 05:09:08.779692+00 | — | — |
| `20260611114000_retire_production_run_record_runtime` | 2026-06-17 05:09:11.329527+00 | — | — |
| `20260617090000_terminal_operation_leases` | 2026-06-17 05:09:13.842275+00 | — | — |

## 12. SQL-first статус production-хранилища

| Проверка | Значение |
|---|---:|
| `ProductionRun` | 7 rows |
| `ProductionUnit` | 29 rows |
| `ProductionUnitOperation` | 1126 rows |
| `ProductionOperationEvent` | 2147 rows |
| `ProductionRunRecord` legacy | 8 rows |

> Вывод: при наличии строк в `ProductionRun` backend читает production runs из нормализованных PostgreSQL-таблиц. `ProductionRunRecord` остается legacy/forensic-слоем совместимости, а не основным runtime-хранилищем.

## 13. Raw DDL

Точная schema-only SQL-выгрузка сохранена рядом: `database_schema_robolabs_mes.sql`.
