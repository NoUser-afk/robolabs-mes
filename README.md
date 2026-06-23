# RoboPulse MES

Рабочая README-документация по текущему состоянию **RoboPulse MES**. Документ описывает фактическую структуру репозитория, запуск, эксплуатацию и перенос системы.

## 1. Назначение проекта

**RoboPulse MES** — система оперативного управления производством для диспетчирования заказов, запуска партий, поштучного прохождения операций по техпроцессу и контроля загрузки участков.

Основной сценарий:

1. Импорт заказа из Excel.
2. Просмотр плана производства и группировка заказов по номенклатуре.
3. Частичный запуск количества в производство.
4. Создание production run с unit-level операциями на каждую единицу изделия.
5. Диспетчеризация первого этапа и передача следующих операций в работу.
6. Выполнение операций на терминале участка: старт, пауза, возобновление, завершение.
7. Контроль графа процесса, загрузки участков и директорских KPI.

Проект находится в стадии производственной эксплуатации и активной доработки: основные сценарии работают через PostgreSQL и Docker Compose, а legacy JSON/runtime-хранилище сохранено только как переходный слой совместимости до полного SQL-first режима.

## 2. Быстрый старт

Основной проверенный способ запуска — Docker Compose.

### Windows cmd

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes
copy .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
```

Открыть интерфейс:

```text
http://localhost:8088
```

Проверить backend через nginx frontend:

```text
http://localhost:8088/api/health
```

### PowerShell

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes
Copy-Item .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
```

Для первичной инициализации новой пустой БД текущий startup не выполняет `prisma db push` автоматически. Если стенд новый и схема еще не применена, используйте миграции или контролируемую первичную инициализацию, описанную ниже в разделах про Prisma.

## 3. Актуальный стек

### Frontend

Фактический frontend-стек:

- React `^18.3.1`.
- React DOM `^18.3.1`.
- Vite `^6.0.3`.
- TypeScript `^5.7.2`.
- `@vitejs/plugin-react` `^4.3.4`.
- Nginx `1.27-alpine` как runtime-контейнер.

Ключевые файлы:

- `frontend/package.json` — зависимости и scripts `dev`, `build`, `preview`.
- `frontend/src/main.tsx` — основной React UI, вкладки и API-вызовы.
- `frontend/src/style.css` — стили.
- `frontend/Dockerfile` — multi-stage сборка Node 20 → Nginx.
- `frontend/nginx.conf` — выдача SPA и proxy `/api/` на backend.

Frontend использует `import.meta.env.VITE_API_URL || '/api'`.

### Backend

Фактический backend-стек:

- NestJS `^10.4.15`: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`.
- TypeScript `^5.7.2`, target `ES2021`, module `commonjs`.
- Prisma ORM: `@prisma/client` и `prisma` `^5.22.0`.
- PostgreSQL через `DATABASE_URL`.
- Excel import через `xlsx` `^0.18.5`.
- File upload через `multer` и `FileInterceptor`.
- `class-validator`, `class-transformer`, `rxjs`, `reflect-metadata`.
- Runtime Node.js container: `node:20-alpine`.

Ключевые файлы:

- `backend/package.json` — scripts `build`, `start`, `start:dev`, `start:prod`, `prisma:generate`, `prisma:migrate`, `prisma:seed`.
- `backend/src/main.ts` — CORS, global prefix `/api`, `ValidationPipe`, listen `0.0.0.0`.
- `backend/src/app.controller.ts` — REST endpoints.
- `backend/src/mes.service.ts` — основная бизнес-логика MES.
- `backend/prisma/schema.prisma` — Prisma-модель PostgreSQL.
- `backend/Dockerfile` — build/runtime контейнер.
- `backend/docker-entrypoint.sh` — запуск backend и optional `AUTO_DB_PUSH`.

### Database

- PostgreSQL `16-alpine`.
- Prisma datasource: `provider = "postgresql"`, URL из `DATABASE_URL`.
- Данные PostgreSQL хранятся в Docker volume `robolabs_mes_pgdata:/var/lib/postgresql/data`.
- В проекте есть миграция `backend/prisma/migrations/20260527061000_add_time_quality_role_ready/migration.sql`.
- `AUTO_DB_PUSH=false` по умолчанию: backend не выполняет `npx prisma db push` при каждом старте.

### Runtime storage

Production runs / units / unit operations для производственного сценария хранятся не в PostgreSQL, а в JSON runtime storage:

- Переменная: `PRODUCTION_RUNS_FILE`.
- Docker default: `/app/data/production-runs.json`.
- Docker volume: `robolabs_mes_runtime_data:/app/data`.
- Dev fallback без переменной: `backend/src/data/production-runs.json`.
- Legacy seed-файл копируется/используется как источник, если runtime-файл отсутствует.

Ограничение: JSON storage не заменяет транзакционную БД и не рассчитан на несколько backend replicas.

### Docker / Docker Compose

`docker-compose.yml` поднимает:

- `postgres` — PostgreSQL 16, healthcheck `pg_isready`.
- `backend` — NestJS API, порт `${BACKEND_PORT:-3000}:3000`.
- `frontend` — Nginx + SPA, порт `${FRONTEND_PORT:-8088}:80`.

Сеть: `robolabs_mes_net`.

Volumes:

- `robolabs_mes_pgdata` — PostgreSQL.
- `robolabs_mes_uploads` — uploads backend `/app/uploads`.
- `robolabs_mes_runtime_data` — runtime JSON `/app/data`.

## 4. Архитектура и схема взаимодействия

```text
Пользователь
  ↓ HTTP http://HOST:8088
Frontend / Nginx
  ├─ отдает React SPA из /usr/share/nginx/html
  └─ proxy /api/ → http://backend:3000/api/
      ↓
Backend API / NestJS
  ├─ Prisma Client → PostgreSQL
  └─ JSON runtime storage → PRODUCTION_RUNS_FILE (/app/data/production-runs.json)
```

В Docker-сценарии пользователь обычно работает через frontend port `8088`. Прямой backend port `3000` также опубликован compose-файлом, но для обычной работы достаточно frontend/nginx.

## 5. Структура проекта

```text
robolabs-mes/
├── .env.example
├── docker-compose.yml
├── FIX_PLAN.md
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │       └── 20260527061000_add_time_quality_role_ready/
│   │           └── migration.sql
│   └── src/
│       ├── app.controller.ts
│       ├── app.module.ts
│       ├── main.ts
│       ├── mes.service.ts
│       ├── prisma.service.ts
│       ├── data/
│       │   ├── products-processes.json
│       │   ├── production-runs.json
│       │   ├── route-209983.json
│       │   └── section-capacities.json
│       └── modules/
├── data/
│   └── samples/
│       ├── README.md
│       ├── orders-template.csv
│       └── test-order-0000001-3-furnaces.xlsx
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── style.css
│       └── vite-env.d.ts
└── scripts/
    ├── analyze_xlsm.py
    ├── extract_xlsm_processes.py
    ├── reset-mes.ps1
    └── reset-mes.sh
```

## 6. Основные функциональные модули

### 6.1 План производства / Диспетчерский экран

Основной экран frontend — `План производства`.

Функции:

- KPI по заказам, номенклатурам, запущенному и готовому количеству.
- Заказы и группировка по номенклатуре.
- Отображение доступного, запущенного и готового количества.
- Частичный запуск количества в производство через `POST /api/production/launch`.
- Unit-level production run: каждая единица имеет собственные операции.
- Блок `Диспетчеризация`: первый этап OP10/ОР10/ОП10 автостартуется, следующие этапы открываются после `dispatch/release`.

### 6.2 Терминал участка

Экран `Терминал участка` показывает очередь операций выбранного участка.

Функции:

- Выбор участка и исполнителя.
- Очередь операций по заказам и production units.
- Видимость заблокированных операций с причиной ожидания предшественников.
- Действия: старт, пауза, возобновление, завершение.
- Для production run unit actions используются unit endpoints.
- Для order operations используются legacy/order operation endpoints.

### 6.3 Граф процесса

Экран `Граф процесса` показывает unit-level DAG операций.

Функции:

- Получение списка доступных unit-позиций.
- Получение графа конкретной unit.
- Backend возвращает `layout`, `nodes`, `edges`, `summary`.
- Узлы имеют `level`, `row`, `x`, `y`; связи строятся по реальным node ids.
- Frontend рисует scrollable canvas без отдельной graph-библиотеки.
- Есть масштабирование, fullscreen, локальное перетаскивание узлов и сброс layout.

### 6.4 Номенклатура/техпроцессы XLSM

Техпроцессы извлечены в `backend/src/data/products-processes.json`.

Функции:

- Список номенклатуры.
- Категории.
- Карточка техпроцесса с операциями, участками, нормами, предшественниками и следующими операциями.
- Fallback aliases в backend для сопоставления `RC800`, `209983`, `Multiholder`, `231265`, `Печь`, `FURNACE-SAMPLE`.

Ограничения:

- XLSM-макросы не выполняются.
- Извлечение по workbook ограничено найденной структурой листов.
- Для production-grade справочника нужен управляемый импорт/версионирование техпроцессов в БД.

### 6.5 Директорский монитор

Экран `Директор` показывает агрегаты по заказам и JSON production runs.

Функции:

- KPI: объекты, production runs, средняя готовность, просрочки, операции в работе/паузе/готово.
- Готовность заказов/запусков.
- Загрузка участков.
- Динамика выпуска по completed operations.
- Качество из `QualityRecord`, с fallback при отсутствии записей.

### 6.6 Импорт Excel

Импорт выполняется через вкладку `Импорт Excel` и endpoint `POST /api/import/orders-excel`.

Backend читает первый лист `.xlsx`/`.xls` через `xlsx` и поддерживает tolerant-поля:

- `orderNumber`, `НомерЗаказа`, `Заказ`.
- `productCode`, `КодИзделия`, `Код`.
- `productName`, `Изделие`, `Номенклатура`.
- `quantity`, `Количество`, `КолВо`.
- `shipmentDate`, `Дата отгрузки`, `ДатаОтгрузки`, `dueDate`, `Срок`, `ДатаЗавершения`.
- `customer`, `Заказчик`.
- `priority`, `Приоритет`.
- `comment`, `Комментарий`.
- `kd`, `КД`.

Обязательные поля: `orderNumber`, `productCode`, `quantity`.

### 6.7 Дополнительные/legacy разделы

В UI сохранены дополнительные разделы:

- `Производство без заказа` — ручные production runs, legacy/run-level совместимость.
- `Заказы` — список активных заказов из PostgreSQL.
- `Исполнители` — справочник `Person`.
- `Архив` — архивированные заказы.
- Базовые dashboard endpoints `/dashboard/summary`, `/dashboard/section-load`.

Legacy endpoints оставлены для обратной совместимости и не являются основным unit-level путем.

## 7. Модель данных

### 7.1 Prisma/PostgreSQL сущности

Фактические модели в `backend/prisma/schema.prisma`:

| Сущность | Назначение |
|---|---|
| `Order` | Производственный заказ: номер, изделие, количество, срок, заказчик, приоритет, статус |
| `RouteTemplate` | Шаблон маршрута изделия |
| `RouteOperation` | Операция шаблона маршрута с участком, нормой и связями |
| `OrderOperation` | Операция конкретного заказа; статус `OperationStatus`, `lifecycleStatus`, время, исполнитель |
| `Person` | Исполнитель/сотрудник участка |
| `OperationEvent` | События операций заказа |
| `TimeTracking` | Интервалы работы/пауз по операции заказа |
| `QualityRecord` | Записи качества по операции заказа |
| `AppUser` | Role-ready пользователи без полноценной авторизации |
| `ImportBatch` | История импортов Excel |
| `SectionCapacity` | Нормативная мощность участка |

Enum `OperationStatus` содержит только `new`, `work`, `done`. Расширенные состояния `queued`, `paused`, `canceled` передаются на уровне API/UI через строковый `lifecycleStatus` и DTO-статусы.

### 7.2 SQL production runs/units

Целевое production-хранилище для `ttm-mini` — PostgreSQL, а не runtime JSON.

Основной unit-level путь должен работать через Prisma-модели:

- `ProductionRun` — запуск производства по заказу или без заказа.
- `ProductionUnit` — конкретная единица изделия внутри run.
- `ProductionUnitOperation` — операция конкретной unit.
- `ProductionOperationEvent` — журнал действий по run/unit/operation.

Ключевая структура `ProductionUnitOperation`:

- `id` — стабильный primary key операции.
- `runId`, `unitId`, `operationId`.
- `sequence`, `level`, `partOrAssembly`, `name`, `section`.
- `previousOperationCodes`, `nextOperationCodes`.
- `normHours`.
- `status`: `queued`, `work`, `paused`, `done`.
- `priority`, `priorityRank`.
- `lockedBy`, `lockedAt`, `lockReason` — текущие legacy-поля блокировки.
- `startedAt`, `pausedAt`, `completedAt`, `actualHours`.
- `acceptedQty`, `defectQty`, `reworkQty`, `qualityStatus`.

Runtime JSON `PRODUCTION_RUNS_FILE` допускается только как источник одноразовой миграции и как legacy fallback на время перехода. После переноса на `ttm-mini` новые production runs, terminal queue, dispatcher release, director dashboard и process graph должны читать и писать PostgreSQL.

### 7.3 Техпроцессы products-processes.json

`backend/src/data/products-processes.json` содержит нормализованные техпроцессы, извлеченные из XLSM:

- `sourceFile`.
- код и название изделия.
- категория по умолчанию.
- metadata workbook.
- `processSteps[]` с `sequence`, `operationId`, `level`, `partOrAssembly`, `name`, `section`, dependency arrays и `normHours`.

Именно этот файл используется для создания операций production runs/units.

### 7.4 Конкурентная блокировка terminal operations

Терминальный сценарий предполагает, что несколько физических операторов могут работать под одним терминальным аккаунтом участка. Поэтому промышленная блокировка операции не должна опираться только на `userId` или `personId`. Блокировка накладывается по факту выбора записи на терминале и представляется как lease на конкретную `ProductionUnitOperation`.

Целевая семантика:

- операция блокируется в момент выбора строки в терминальной очереди, до нажатия `start`;
- второй телефон не может выбрать уже заблокированную актуальную операцию;
- владелец блокировки определяется не пользователем, а `selectionToken`/`lockToken`, выданным backend при успешном выборе;
- если на одном телефоне операция была выбрана ранее, но потом потеряла актуальность, устаревший телефон получает конфликт при следующем действии;
- блокировка имеет TTL и продлевается heartbeat-запросами, чтобы зависшие телефоны не держали запись бесконечно;
- `start`, `pause`, `resume`, `complete`, `quality` и bulk actions должны проверять актуальность записи и владение lock token;
- если операция уже `work`, `paused` или `done`, новый выбор как `queued` запрещён и возвращает конфликт;
- если предшественники перестали быть выполненными или unit/run архивирован/отменён, действие запрещается как stale selection.

Рекомендуемые поля для добавления к `ProductionUnitOperation`:

```prisma
lockToken       String?
lockTerminalId  String?
lockClientId    String?
lockExpiresAt   DateTime?
lockVersion     Int       @default(0)
selectedAt      DateTime?
```

Назначение:

- `lockToken` — случайный UUID/crypto token, который знает только клиент, выбравший запись.
- `lockTerminalId` — логический терминал/участок, например terminal account или work center section.
- `lockClientId` — идентификатор конкретного устройства/вкладки, созданный frontend и сохранённый локально.
- `lockExpiresAt` — срок действия выбора.
- `lockVersion` — монотонная версия для optimistic concurrency.
- `selectedAt` — время первичного выбора.

Индексы:

```prisma
@@index([section, status, lockExpiresAt])
@@index([lockToken])
@@index([lockExpiresAt])
```

Рекомендуемые endpoints:

| Метод | Endpoint | Назначение |
|---|---|---|
| POST | `/me/terminal/production/unit-operations/:operationPk/select` | Выбрать операцию и получить lock token |
| POST | `/me/terminal/production/unit-operations/:operationPk/heartbeat` | Продлить lease выбранной операции |
| POST | `/me/terminal/production/unit-operations/:operationPk/release-selection` | Снять выбор без старта |

Правило атомарного выбора в PostgreSQL:

```sql
UPDATE "ProductionUnitOperation"
SET
  "lockedBy" = $terminal_label,
  "lockedAt" = now(),
  "lockReason" = 'selected',
  "lockToken" = $new_token,
  "lockTerminalId" = $terminal_id,
  "lockClientId" = $client_id,
  "lockExpiresAt" = now() + interval '45 seconds',
  "selectedAt" = coalesce("selectedAt", now()),
  "lockVersion" = "lockVersion" + 1
WHERE
  "id" = $operation_pk
  AND "section" = $terminal_section
  AND "status" = 'queued'
  AND ("lockToken" IS NULL OR "lockExpiresAt" < now())
RETURNING *;
```

Если `UPDATE ... RETURNING` вернул 0 строк, backend должен перечитать операцию и вернуть одну из причин:

- `409 CONFLICT locked` — операция уже выбрана другим устройством и lease ещё живой;
- `409 CONFLICT stale` — операция уже не `queued`, завершена, в работе, на паузе, архивирована или потеряла доступность;
- `423 LOCKED` можно использовать вместо `409 locked`, если frontend готов обрабатывать этот код;
- `404 NOT_FOUND` — операция не найдена или не принадлежит участку текущего терминала.

Heartbeat должен выполняться только владельцем token:

```sql
UPDATE "ProductionUnitOperation"
SET
  "lockExpiresAt" = now() + interval '45 seconds',
  "lockVersion" = "lockVersion" + 1
WHERE
  "id" = $operation_pk
  AND "lockToken" = $lock_token
  AND "status" = 'queued'
  AND "lockExpiresAt" >= now()
RETURNING *;
```

Если heartbeat не продлил запись, frontend обязан закрыть карточку операции, показать сообщение `Операция потеряла актуальность` и обновить очередь.

`start` должен быть атомарным переходом из выбранного `queued` в `work`:

```sql
UPDATE "ProductionUnitOperation"
SET
  "status" = 'work',
  "startedAt" = coalesce("startedAt", now()),
  "lockedBy" = $terminal_label,
  "lockedAt" = now(),
  "lockReason" = 'work',
  "lockExpiresAt" = NULL,
  "lockVersion" = "lockVersion" + 1
WHERE
  "id" = $operation_pk
  AND "lockToken" = $lock_token
  AND "status" = 'queued'
  AND "lockExpiresAt" >= now()
RETURNING *;
```

После `start` lock token можно оставить как audit-context или очистить. Для простоты UI рекомендуется вернуть новый `operationVersion`/`lockVersion`, а дальнейшие `pause/resume/complete` валидировать по `id + expectedVersion` или по текущему статусу. Если нужно строго связать work-сессию с выбранным телефоном, оставить `lockToken` до `complete`, но не использовать `userId` как единственный владелец.

Очистка истёкших выборов:

- отдельный cron не обязателен, потому что выбор новой операции игнорирует истёкший `lockExpiresAt`;
- для чистоты UI можно периодически выполнять `UPDATE ... SET lockToken = NULL, lockedBy = NULL, lockedAt = NULL, lockReason = NULL, lockTerminalId = NULL, lockClientId = NULL, lockExpiresAt = NULL WHERE status = 'queued' AND lockExpiresAt < now()`;
- истёкшие lease не должны блокировать старт другой сменой/телефоном.

Журналировать события в `ProductionOperationEvent`:

- `selected`;
- `selection_heartbeat`;
- `selection_released`;
- `selection_expired` опционально;
- `selection_conflict` опционально;
- `started`, `paused`, `resumed`, `completed`.

### 7.5 План миграции runtime JSON в PostgreSQL

Переход на `ttm-mini` следует делать сразу в SQL-first режиме. Цель миграции — загрузить все актуальные `production-runs.json` данные в `ProductionRun`, `ProductionUnit`, `ProductionUnitOperation`, `ProductionOperationEvent`, затем отключить запись новых данных в JSON.

Порядок работ для агента:

1. Сделать backup PostgreSQL и `PRODUCTION_RUNS_FILE`.
2. Проверить, что миграции Prisma применены и таблицы `ProductionRun`, `ProductionUnit`, `ProductionUnitOperation`, `ProductionOperationEvent` существуют.
3. Написать идемпотентный скрипт `backend/prisma/migrate-production-runs-json.ts` или отдельный CLI в `scripts/`.
4. Скрипт должен читать JSON из `PRODUCTION_RUNS_FILE` или явно переданного пути.
5. Для каждого run выполнять `upsert` по `ProductionRun.id`.
6. Для каждой unit выполнять `upsert` по `ProductionUnit.id`, сохраняя `runId`, `unitNo`, `status`, `progress`, timestamps.
7. Для каждой unit operation выполнять `upsert` по `ProductionUnitOperation.id`; если `id` отсутствует, строить стабильный id из `runId`, `unitId`, `operationId`.
8. Legacy `run.operations` переносить либо как операции с `unitId = null`, либо архивировать в `ProductionRunRecord.data`, если они не участвуют в текущем unit-level сценарии.
9. Сохранить исходный JSON целиком в `ProductionRunRecord.data` для forensic/debug совместимости.
10. Перенести события, если они есть в JSON; если событий нет, создать минимальные synthetic events для уже начатых/завершённых операций.
11. После миграции сравнить counts: runs, units, operations, done/work/paused/queued counts.
12. Переключить backend reads на PostgreSQL для terminal queue, process graph, director dashboard, dispatcher release и operation actions.
13. Оставить JSON read-only fallback только на один релиз или удалить после проверки.
14. На `ttm-mini` не включать `AUTO_DB_PUSH`; использовать только `npx prisma migrate deploy`.

Минимальные проверки после миграции:

```sql
select count(*) from "ProductionRun";
select count(*) from "ProductionUnit";
select status, count(*) from "ProductionUnitOperation" group by status order by status;
select section, status, count(*) from "ProductionUnitOperation" group by section, status order by section, status;
```

Функциональные проверки:

- терминальная очередь показывает те же операции, что были в JSON;
- диспетчеризация unit открывает следующие операции;
- старт/пауза/возобновление/завершение меняют SQL-записи;
- директорский dashboard считается по SQL;
- после `docker compose restart` состояние не меняется;
- `production-runs.json` больше не является источником новых изменений.

### 7.6 Ограничения текущей модели

- Production runs/units синхронизируются в PostgreSQL-модели и legacy JSON/runtime-хранилище для совместимости рабочих сценариев.
- JSON/runtime storage не заменяет полноценную транзакционную производственную модель для нескольких backend replicas.
- `ProductionRun`, `ProductionUnit`, `ProductionUnitOperation`, `WorkCenter` и связанные события выделены как Prisma-модели; часть legacy endpoints сохранена для обратной совместимости.
- Авторизация реализована через пользователей, хеши паролей и cookie-сессию; debug-login отключен по умолчанию.
- `OperationStatus` в PostgreSQL ограничен `new/work/done`.
- Часть run-level endpoints остается legacy.
- Seed содержит операции пересоздания справочников и должен запускаться только осознанно.

## 8. API endpoints

Все endpoints имеют глобальный префикс `/api`.

### 8.1 Health/import

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/health` | Проверка backend |
| POST | `/import/orders-excel` | Импорт заказов из Excel, multipart field `file` |
| GET | `/import/batches` | История импортов |

### 8.2 Заказы и операции заказов

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/orders` | Активные заказы |
| GET | `/orders/:id` | Карточка заказа |
| GET | `/orders/:id/operations` | Операции заказа |
| POST | `/orders/:id/operations/:operationId/start` | Старт операции заказа |
| POST | `/orders/:id/operations/:operationId/finish` | Завершение операции заказа |
| POST | `/orders/:id/operations/:operationId/reset` | Сброс операции заказа |
| POST | `/orders/:id/archive` | Архивировать заказ |
| GET | `/archive/orders` | Архивные заказы |

### 8.3 Production plan / launch

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/production/plan` | План производства, группы, остатки, runs, KPI |
| POST | `/production/launch` | Частичный запуск количества по заказу/номенклатуре |
| POST | `/production/batches` | Запуск партии из нескольких выбранных строк плана с общим `batchNumber` |
| GET | `/production/runs` | Список production runs |
| POST | `/production/runs` | Создать production run без заказа или совместимый run |
| GET | `/production/runs/:id` | Детали production run |
| POST | `/production/runs/:id/start` | Старт production run |

### 8.4 Unit operations

| Метод | Endpoint | Назначение |
|---|---|---|
| POST | `/production/runs/:id/units/:unitId/operations/:operationId/start` | Старт unit-operation |
| POST | `/production/runs/:id/units/:unitId/operations/:operationId/pause` | Пауза unit-operation |
| POST | `/production/runs/:id/units/:unitId/operations/:operationId/resume` | Возобновление unit-operation |
| POST | `/production/runs/:id/units/:unitId/operations/:operationId/complete` | Завершение unit-operation |
| POST | `/production/unit-operations/bulk-action` | Групповое действие по нескольким unit-operation для лазера, зачистки и пробивного станка |

### 8.5 Dispatch release

| Метод | Endpoint | Назначение |
|---|---|---|
| POST | `/production/runs/:id/units/:unitId/dispatch/release` | Завершить диспетчеризацию unit и открыть следующие операции |
| POST | `/production/runs/:id/units/:unitId/dispatch/complete` | Совместимый alias для release |

### 8.6 Terminal

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/sections` | Список участков |
| GET | `/people` | Список исполнителей |
| POST | `/people` | Добавить исполнителя |
| GET | `/work-centers/:section/terminal` | Очередь терминала участка, включая production units |
| POST | `/me/terminal/production/unit-operations/:operationPk/select` | Атомарный выбор unit-operation и выдача lock token |
| POST | `/me/terminal/production/unit-operations/:operationPk/heartbeat` | Продление lease выбранной unit-operation |
| POST | `/me/terminal/production/unit-operations/:operationPk/release-selection` | Освобождение выбранной unit-operation без старта |
| POST | `/operations/:id/start` | Старт order operation по id |
| POST | `/operations/:id/pause` | Пауза order operation |
| POST | `/operations/:id/resume` | Возобновление order operation |
| POST | `/operations/:id/complete` | Завершение order operation |
| POST | `/operations/:id/quality` | Записать качество order operation |
| POST | `/me/terminal/production/unit-operations/bulk-action` | Групповое действие терминала по выбранным unit-operation своего участка |
| GET | `/quality/summary` | Сводка качества |

### 8.7 Process graph

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/production/process-graph` | Список unit-позиций и опционально graph по `runId`, `unitId` |
| GET | `/production/runs/:id/units/:unitId/graph` | Graph конкретной unit: metadata, layout, nodes, edges, summary |

### 8.8 Nomenclature

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/nomenclature` | Список номенклатуры, query `category` |
| GET | `/nomenclature/categories` | Категории |
| GET | `/nomenclature/:id/process` | Техпроцесс по id/коду |

### 8.9 Director dashboard

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/director/dashboard` | KPI директора, готовность, загрузка, динамика, качество |
| GET | `/dispatch/dashboard` | Диспетчерская сводка для основного экрана |
| GET | `/dashboard/summary` | Legacy summary KPI |
| GET | `/dashboard/section-load` | Legacy загрузка участков |
| GET | `/events` | Последние события операций |

### 8.10 Legacy endpoints

| Метод | Endpoint | Назначение |
|---|---|---|
| POST | `/production/runs/:id/operations/:operationId/start` | Legacy run-level старт операции |
| POST | `/production/runs/:id/operations/:operationId/pause` | Legacy run-level пауза |
| POST | `/production/runs/:id/operations/:operationId/resume` | Legacy run-level возобновление |
| POST | `/production/runs/:id/operations/:operationId/complete` | Legacy run-level завершение |

## 9. Переменные окружения

| Переменная | Где используется | Значение по умолчанию / пример | Назначение |
|---|---|---|---|
| `POSTGRES_DB` | postgres container | `robolabs_mes` | Имя БД PostgreSQL |
| `POSTGRES_USER` | postgres container | `robolabs` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | postgres container | `robolabs_mes_password` | Пароль PostgreSQL; для стенда заменить |
| `DATABASE_URL` | backend / Prisma | `postgresql://robolabs:robolabs_mes_password@postgres:5432/robolabs_mes?schema=public` | Connection string Prisma |
| `NODE_ENV` | backend Dockerfile/runtime | `production` в backend image | Режим Node.js |
| `PORT` | backend app | `${BACKEND_PORT:-3000}` | Порт NestJS внутри контейнера |
| `BACKEND_PORT` | docker-compose | `3000` | Публикуемый порт backend на хосте и значение `PORT` |
| `FRONTEND_PORT` | docker-compose | `8088` | Публикуемый порт frontend/nginx на хосте |
| `VITE_API_URL` | frontend build/dev | `/api` | Base URL API для frontend; в Docker nginx проксирует `/api/` |
| `UPLOAD_DIR` | backend docker-compose | `/app/uploads` | Каталог uploads |
| `PRODUCTION_RUNS_FILE` | backend runtime | `/app/data/production-runs.json` | JSON runtime storage production runs/units |
| `AUTO_DB_PUSH` | backend entrypoint | `false` | Явное разрешение `npx prisma db push` при старте; только для контролируемой первичной инициализации |

Nginx frontend не использует отдельные env-переменные во время runtime; конфигурация статически задана в `frontend/nginx.conf`.

## 10. Локальный запуск через Docker Compose

### Подготовка `.env`

Windows cmd:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes
copy .env.example .env
notepad .env
```

PowerShell:

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes
Copy-Item .env.example .env
notepad .env
```

Для локального стенда можно оставить стандартные значения. Для LAN/серверного стенда обязательно заменить `POSTGRES_PASSWORD` и синхронно обновить `DATABASE_URL`.

### Безопасная проверка compose

```cmd
docker compose config
```

### Запуск / пересборка без удаления данных

```cmd
docker compose up -d --build
```

### Проверка состояния

```cmd
docker compose ps
docker compose logs --tail=100 backend frontend postgres
```

### Проверка URL

```text
http://localhost:8088
http://localhost:8088/api/health
http://localhost:3000/api/health
```

## 11. Локальный запуск без Docker для разработки

Требования:

- Node.js 20.x.
- npm.
- PostgreSQL, доступный по `DATABASE_URL`.
- Примененная Prisma schema/migration.

### Backend

PowerShell пример:

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes\backend
$env:DATABASE_URL="postgresql://robolabs:robolabs_mes_password@localhost:5432/robolabs_mes?schema=public"
$env:PORT="3000"
$env:PRODUCTION_RUNS_FILE="C:\Users\zamoc\Desktop\robolabs-mes\backend\src\data\production-runs.json"
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

cmd пример:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes\backend
set DATABASE_URL=postgresql://robolabs:robolabs_mes_password@localhost:5432/robolabs_mes?schema=public
set PORT=3000
set PRODUCTION_RUNS_FILE=C:\Users\zamoc\Desktop\robolabs-mes\backend\src\data\production-runs.json
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

Если БД новая, перед стартом применить миграции:

```cmd
npm run prisma:migrate
```

Для controlled initialization можно использовать `npx prisma db push`, но не как скрытый startup на стенде с данными.

### Frontend

PowerShell:

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes\frontend
$env:VITE_API_URL="http://localhost:3000/api"
npm install
npm run dev
```

cmd:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes\frontend
set VITE_API_URL=http://localhost:3000/api
npm install
npm run dev
```

Обычно Vite dev server будет доступен на порту, который покажет `npm run dev`.

## 12. Администрирование и эксплуатация

### 12.1 Проверка состояния контейнеров

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes
docker compose ps
docker compose config
```

### 12.2 Просмотр логов

```cmd
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
docker compose logs --tail=200 postgres
docker compose logs --tail=200 backend frontend postgres
```

Следить за логами:

```cmd
docker compose logs -f --tail=100 backend frontend postgres
```

### 12.3 Безопасный перезапуск

Без удаления volumes:

```cmd
docker compose restart backend frontend
```

Пересборка и запуск без удаления volumes:

```cmd
docker compose up -d --build
```

Остановка контейнеров без удаления volumes:

```cmd
docker compose down --remove-orphans
```

### 12.4 Backup PostgreSQL

Рекомендуется делать backup перед обновлениями, миграциями и seed-операциями.

PowerShell:

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes
New-Item -ItemType Directory -Force .\backups | Out-Null
docker compose exec -T postgres pg_dump -U robolabs -d robolabs_mes > .\backups\robolabs_mes_%DATE:~-4%%DATE:~3,2%%DATE:~0,2%.sql
```

Если команда с `%DATE%` неудобна в PowerShell, используйте явное имя файла:

```powershell
docker compose exec -T postgres pg_dump -U robolabs -d robolabs_mes > .\backups\robolabs_mes_backup.sql
```

cmd:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes
if not exist backups mkdir backups
docker compose exec -T postgres pg_dump -U robolabs -d robolabs_mes > backups\robolabs_mes_backup.sql
```

Проверка, что файл создан и не пустой:

```cmd
dir backups
```

### 12.5 Backup legacy runtime JSON для миграции

Legacy runtime JSON находится внутри volume `/app/data`. В SQL-first сценарии это не целевое production-хранилище, но файл нужно сохранить как миграционный источник перед переносом на PostgreSQL.

Безопасный backup через backend container:

PowerShell:

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes
New-Item -ItemType Directory -Force .\backups | Out-Null
docker compose exec -T backend sh -c "test -f /app/data/production-runs.json && cat /app/data/production-runs.json || echo []" > .\backups\production-runs.json
```

cmd:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes
if not exist backups mkdir backups
docker compose exec -T backend sh -c "test -f /app/data/production-runs.json && cat /app/data/production-runs.json || echo []" > backups\production-runs.json
```

### 12.6 Restore: рекомендации

Restore всегда выполнять только после остановки пользователей/операторов и создания свежего backup текущего состояния.

PostgreSQL restore на существующую БД зависит от политики: полная замена, восстановление в отдельную БД или точечный импорт. Для рабочего контура безопаснее:

1. Поднять отдельный стенд или отдельную БД.
2. Проверить backup-файл.
3. Восстановить в отдельную БД.
4. Проверить `/api/health`, список заказов, план производства.
5. Только после проверки переключать рабочий стенд.

Legacy runtime JSON restore как миграционный источник:

1. Остановить backend: `docker compose stop backend`.
2. Сохранить текущий `/app/data/production-runs.json` в отдельный backup.
3. Скопировать проверенный JSON в volume.
4. Запустить backend: `docker compose start backend`.

Прямые команды restore намеренно не приведены как основной путь, чтобы не поощрять случайную перезапись данных.

### 12.7 Prisma generate / migrations

Backend package scripts:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes\backend
npm run prisma:generate
npm run prisma:migrate
```

В Docker можно выполнить после backup:

```cmd
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate deploy
```

`AUTO_DB_PUSH=true` использовать только для контролируемой первичной инициализации новой/тестовой БД. Не включать как обычный режим production-like стенда.

### 12.8 Обновление проекта

Рекомендуемый порядок:

1. Сообщить пользователям о техническом окне.
2. Сделать backup PostgreSQL.
3. Сделать backup legacy runtime JSON storage, если стенд ещё использует или недавно использовал `production-runs.json`.
4. Проверить `docker compose config`.
5. Выполнить `docker compose up -d --build`.
6. Проверить `docker compose ps`.
7. Проверить `http://localhost:8088/api/health`.
8. Проверить основные экраны: план производства, терминал участка, директор.

Команды:

```cmd
cd C:\Users\zamoc\Desktop\robolabs-mes
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend frontend postgres
```

### 12.9 Сетевой доступ LAN

Compose публикует порты на хосте:

- Frontend: `${FRONTEND_PORT:-8088}:80`.
- Backend: `${BACKEND_PORT:-3000}:3000`.

Для доступа с другого устройства в той же сети используйте IP Windows-хоста:

```text
http://<LAN_IP_ХОСТА>:8088
http://<LAN_IP_ХОСТА>:8088/api/health
```

Проверить IP в Windows:

```cmd
ipconfig
```

### 12.10 Firewall / порты

Если с самого хоста `http://localhost:8088` работает, но с другого устройства LAN не открывается:

1. Проверить, что устройство в той же сети.
2. Проверить IP хоста через `ipconfig`.
3. Проверить профиль сети Windows.
4. При необходимости разрешить входящие TCP-порты `8088` и, если нужен прямой API, `3000` в Windows Firewall.

Для обычной работы пользователей в LAN достаточно открыть `8088`; backend доступен через nginx proxy `/api/`.

### 12.11 Reset scripts и опасные операции

В проекте есть scripts:

- `scripts/reset-mes.ps1`.
- `scripts/reset-mes.sh`.

Они переведены в safe mode: по умолчанию не должны удалять volumes. Удаление volumes возможно только с явными force flags:

- PowerShell: `-ForceDeleteVolumes`.
- sh: `--force-delete-volumes`.

Опасные команды, которые нельзя использовать как обычный путь на стенде с данными:

```cmd
docker compose down -v
docker volume rm robolabs_mes_pgdata
docker volume rm robolabs_mes_runtime_data
npx prisma migrate reset
```

Destructive reset допустим только для одноразового локального стенда, когда данные точно не нужны, после backup и с явным force flag.

## 13. Тестовые данные и sample Excel

В `data/samples` есть:

- `orders-template.csv` — CSV-шаблон заказов.
- `test-order-0000001-3-furnaces.xlsx` — тестовый Excel-заказ.
- `README.md` — описание sample-файла.

Sample Excel содержит тестовый заказ:

- `orderNumber`: `0000001`.
- `productCode`: `FURNACE-SAMPLE`.
- `productName`: `Печь промышленная`.
- `quantity`: `3`.
- `dueDate`: `2026-06-30`.
- `customer`: `Production sample customer`.
- `priority`: `normal`.
- `comment`: `RoboPulse MES: 3 печи, заказ 0000001`.

Импортировать sample можно через UI: `Импорт Excel` → выбрать `.xlsx` → `Импортировать`.

Важно: импорт изменяет БД, так как создает или обновляет заказ и операции заказа.

## 14. Безопасность и ограничения текущей версии

- Авторизация уже реализована через `AppUser`, cookie-сессию и роли, но production-политики прав ещё нужно формализовать и покрыть тестами.
- Терминальные аккаунты могут быть общими для участка, поэтому конкурентная защита операций должна строиться на lease-блокировке выбранной записи, а не только на `userId`.
- Пароль PostgreSQL из `.env.example` примерный и должен быть заменен на стенде.
- HTTP доступен по умолчанию; HTTPS на `8443` использует self-signed certificate, если не настроен внешний reverse proxy/сертификат.
- Frontend и backend порты публикуются на хосте; прямой backend port `3000` стоит открывать наружу только при явной необходимости.
- Production runs/units уже представлены SQL-моделями, но до завершения SQL-first переключения часть legacy-совместимости может читать/писать legacy JSON.
- Промышленная защита от конкурентных действий нескольких операторов должна быть реализована по разделу 7.4 до ввода терминалов в регулярную эксплуатацию.
- Полноценный аудит прав, смен, рабочих центров, качества и ОТК частично размечен моделями, но требует финализации регламентов.
- Часть endpoints legacy и может давать менее точную картину, чем unit-level основной путь.
- Автоматические тесты и smoke-test script есть не для всех критичных сценариев; требуется покрыть миграцию JSON → SQL и lease-блокировки.
- Backend/frontend healthchecks в compose не заданы; healthcheck есть у PostgreSQL.

## 15. Troubleshooting

### Frontend не открывается

Проверить:

```cmd
docker compose ps
docker compose logs --tail=100 frontend
```

Проверить порт:

```text
http://localhost:8088
```

Если порт изменен в `.env`, использовать значение `FRONTEND_PORT`.

### `/api/health` не отвечает через frontend

Проверить backend и nginx proxy:

```cmd
docker compose ps
docker compose logs --tail=100 backend frontend
```

Прямой backend:

```text
http://localhost:3000/api/health
```

Через nginx:

```text
http://localhost:8088/api/health
```

### Backend стартует, но ругается на БД/Prisma

Проверить PostgreSQL:

```cmd
docker compose ps postgres
docker compose logs --tail=100 postgres
```

Проверить `DATABASE_URL` в `.env`. Для новой БД применить миграции после backup/проверки:

```cmd
docker compose exec backend npx prisma migrate deploy
```

Если это одноразовая первичная инициализация, можно явно включить `AUTO_DB_PUSH=true`, но не использовать это как постоянный режим стенда с данными.

### Импорт Excel возвращает ошибку `Активный маршрут не найден. Выполните seed.`

В БД нет активного `RouteTemplate`. Возможные действия:

1. Проверить, применены ли миграции и seed.
2. Выполнять seed только осознанно: `backend/prisma/seed.ts` содержит пересоздание части справочников.
3. Перед seed сделать backup PostgreSQL.

### Терминал не дает стартовать операцию

Возможные причины:

- Операция заблокирована предшественниками (`blockedBy`).
- Не завершена диспетчеризация unit.
- Операция уже в работе.
- Попытка завершить операцию без старта.

Проверить `GET /api/work-centers/:section/terminal` и `GET /api/production/runs/:id/units/:unitId/graph`.

### Директорский монитор пустой

Проверить наличие заказов и production runs:

```text
http://localhost:8088/api/orders
http://localhost:8088/api/production/runs
http://localhost:8088/api/director/dashboard
```

Если БД пустая и нет production runs, dashboard будет показывать пустые/нулевые показатели.

### Legacy runtime JSON не сохраняется после перезапуска

Для `ttm-mini` это не должно быть production-проблемой: после SQL-first переноса состояние production runs должно храниться в PostgreSQL. Если legacy JSON всё ещё используется как fallback или миграционный источник, проверить volume и переменную:


```cmd
docker compose config
docker compose exec backend sh -c "echo $PRODUCTION_RUNS_FILE && ls -la /app/data"
```

Должно использоваться `/app/data/production-runs.json` на volume `robolabs_mes_runtime_data`.

## 16. Roadmap / связь с FIX_PLAN.md

Подробный план стабилизации находится в `FIX_PLAN.md`.

Уже зафиксировано/сделано по плану:

- Unit-level production runs стали основным путем для плана, терминала и директора.
- Ручные runs без заказа больше не уменьшают остатки заказов той же номенклатуры.
- Загрузка участков и директорские KPI считаются по unit operations.
- JSON-запись production runs выполняется через temp file + rename.
- Runtime storage вынесен в `PRODUCTION_RUNS_FILE` и Docker volume `/app/data`.
- `AUTO_DB_PUSH` по умолчанию выключен.
- Reset scripts переведены в safe mode с force flag для удаления volumes.
- Добавлены dispatcher release endpoints и graph endpoints.

Основной roadmap:

1. Завершить SQL-first переключение production runs: terminal queue, process graph, dispatcher release, director dashboard и operation actions должны писать PostgreSQL.
2. Подготовить и выполнить контролируемую миграцию JSON → PostgreSQL по плану раздела 7.5.
3. Добавить lease-блокировки выбора операций по разделу 7.4.
4. Полностью заменить startup-политику на управляемый `prisma migrate deploy` после согласования backup/restore.
5. Разделить большой `frontend/src/main.tsx` на страницы и компоненты.
6. Централизовать status mapping на frontend/backend.
7. Довести роли диспетчер, оператор, директор, администратор до production-правил.
8. Добавить backend/frontend healthchecks.
9. Добавить автоматические тесты и smoke script для сценария импорт → запуск → терминал → директор.
10. Подготовить production-grade backup/restore регламент.

## 17. План переноса на сервер `ttm-mini`

Этот раздел предназначен для ИИ-агента, который будет переносить текущий проект `RobolabsMes` на сервер, доступный по SSH alias `ttm-mini`, разворачивать стенд и настраивать его для дальнейшей эксплуатации.

### 17.1 Цель переноса

Развернуть проект на сервере `ttm-mini` в Docker Compose режиме так, чтобы:

- frontend был доступен по HTTP на порту `8088`;
- HTTPS frontend был доступен на порту `8443`, если этот порт нужен для мобильного терминала/QR-сценария;
- backend был доступен внутри compose-сети и, при необходимости, напрямую на порту `3000`;
- PostgreSQL хранил данные в Docker volume `robolabs_mes_pgdata`;
- production runs/units/operations работали из PostgreSQL, без записи новых runtime-данных в JSON;
- runtime JSON production runs использовался только как одноразовый источник миграции или временный read-only fallback;
- uploads хранились в Docker volume `robolabs_mes_uploads`;
- конфигурация сервера не зависела от локального Windows-пути разработчика.

### 17.2 Исходные данные проекта

Перед переносом агент должен учитывать текущую структуру:

- корень проекта: `robolabs-mes/`;
- compose-файл: `docker-compose.yml`;
- пример окружения: `.env.example`;
- frontend: `frontend/`, React + Vite, runtime Nginx;
- backend: `backend/`, NestJS + Prisma;
- БД: PostgreSQL 16 в контейнере `postgres`;
- важные volume: `robolabs_mes_pgdata`, `robolabs_mes_uploads`, `robolabs_mes_runtime_data`;
- legacy runtime файл производственных запусков в контейнере backend: `/app/data/production-runs.json`;
- default URL приложения после запуска: `http://<SERVER_HOST>:8088`;
- default healthcheck через frontend proxy: `http://<SERVER_HOST>:8088/api/health`.

Не переносить на сервер как обязательные артефакты:

- `frontend/node_modules/`;
- `backend/node_modules/`;
- `frontend/dist/`;
- `backend/dist/`;
- `frontend/test-results/`;
- локальные временные файлы, логи и backup-архивы, если они не нужны для восстановления данных.

### 17.3 Предварительные проверки на локальной машине

Выполнить из корня проекта:

```powershell
Set-Location C:\Users\zamoc\Desktop\robolabs-mes
docker compose config
```

Если локально доступен Docker, желательно проверить сборку:

```powershell
docker compose build
```

Проверить наличие обязательных файлов:

```powershell
Test-Path .env.example
Test-Path docker-compose.yml
Test-Path backend\Dockerfile
Test-Path frontend\Dockerfile
Test-Path backend\prisma\schema.prisma
```

Если переносится не пустой стенд, до копирования подготовить backup данных со старого окружения:

```powershell
docker compose exec postgres pg_dump -U robolabs -d robolabs_mes -Fc -f /tmp/robolabs_mes.dump
docker cp robolabs-mes-postgres:/tmp/robolabs_mes.dump .\robolabs_mes.dump
docker run --rm -v robolabs_mes_runtime_data:/data -v ${PWD}:/backup alpine sh -c "cp /data/production-runs.json /backup/production-runs.backup.json 2>/dev/null || true"
```

Если старого Docker volume нет или стенд переносится как чистый стенд, backup-шаг зафиксировать как `SKIPPED: clean deployment`.

### 17.4 Подготовка сервера `ttm-mini`

Подключиться:

```bash
ssh ttm-mini
```

Проверить ОС и доступные ресурсы:

```bash
uname -a
df -h
free -h
```

Проверить Docker и Compose:

```bash
docker --version
docker compose version
```

Если Docker или plugin `docker compose` не установлены, установить их штатным способом для ОС сервера. После установки повторить проверку. Агент не должен продолжать развёртку, пока команды `docker --version` и `docker compose version` не завершаются успешно.

Проверить занятость портов:

```bash
ss -ltnp | grep -E ':(3000|8088|8443)\s' || true
```

Если порт занят:

- для frontend изменить `FRONTEND_PORT` или `FRONTEND_HTTPS_PORT` в `.env`;
- для backend изменить `BACKEND_PORT` или убрать публикацию backend-порта, если прямой доступ к API не нужен;
- зафиксировать выбранные порты в отчёте после развёртки.

Создать каталог проекта:

```bash
sudo mkdir -p /opt/robolabs-mes
sudo chown -R "$USER":"$USER" /opt/robolabs-mes
```

### 17.5 Передача файлов на сервер

Рекомендуемый способ: `rsync` с исключением тяжёлых и пересобираемых директорий.

С локальной машины:

```bash
rsync -avz --delete \
  --exclude ".git/" \
  --exclude "frontend/node_modules/" \
  --exclude "backend/node_modules/" \
  --exclude "frontend/dist/" \
  --exclude "backend/dist/" \
  --exclude "frontend/test-results/" \
  --exclude "*.log" \
  ./ ttm-mini:/opt/robolabs-mes/
```

Если `rsync` недоступен на Windows, использовать архив:

```powershell
tar --exclude=frontend/node_modules --exclude=backend/node_modules --exclude=frontend/dist --exclude=backend/dist --exclude=frontend/test-results -czf robolabs-mes.tar.gz .
scp .\robolabs-mes.tar.gz ttm-mini:/tmp/robolabs-mes.tar.gz
ssh ttm-mini "mkdir -p /opt/robolabs-mes && tar -xzf /tmp/robolabs-mes.tar.gz -C /opt/robolabs-mes"
```

После передачи на сервере проверить:

```bash
cd /opt/robolabs-mes
ls -la
test -f docker-compose.yml
test -f .env.example
test -f backend/Dockerfile
test -f frontend/Dockerfile
```

### 17.6 Настройка `.env` на сервере

На сервере:

```bash
cd /opt/robolabs-mes
cp -n .env.example .env
```

Открыть `.env` и привести к серверному виду:

```env
POSTGRES_DB=robolabs_mes
POSTGRES_USER=robolabs
POSTGRES_PASSWORD=<STRONG_PASSWORD>
DATABASE_URL=postgresql://robolabs:<STRONG_PASSWORD>@postgres:5432/robolabs_mes?schema=public
BACKEND_PORT=3000
FRONTEND_PORT=8088
FRONTEND_HTTPS_PORT=8443
ROBO_PULSE_HTTPS_HOSTS=localhost,127.0.0.1,<TTM_MINI_LAN_IP>,ttm-mini
VITE_API_URL=/api
PRODUCTION_RUNS_FILE=/app/data/production-runs.json
AUTO_DB_PUSH=false
AUTH_SESSION_SECRET=<RANDOM_LONG_SECRET>
```

Правила для агента:

- заменить `<STRONG_PASSWORD>` на новый пароль, одинаковый в `POSTGRES_PASSWORD` и `DATABASE_URL`;
- заменить `<TTM_MINI_LAN_IP>` на фактический LAN IP сервера;
- заменить `<RANDOM_LONG_SECRET>` на случайную строку не короче 32 символов;
- не коммитить `.env` и не переносить его в публичные артефакты;
- `AUTO_DB_PUSH=false` оставить по умолчанию, миграции выполнять явно.

Узнать LAN IP сервера можно так:

```bash
hostname -I
ip -4 addr
```

### 17.7 Первый запуск

На сервере:

```bash
cd /opt/robolabs-mes
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Применить Prisma migrations:

```bash
docker compose exec backend npx prisma migrate deploy
```

Если переносится существующий стенд с runtime JSON, выполнить миграцию JSON → PostgreSQL до открытия стенда пользователям. Новый стенд на `ttm-mini` должен запускаться в SQL-first режиме.

Если это чистый стенд-стенд и нужны стартовые справочники, выполнить seed осознанно:

```bash
docker compose exec backend npm run prisma:seed
```

Важно: перед seed на стенде с ценными данными сделать backup PostgreSQL, потому что `backend/prisma/seed.ts` может пересоздавать часть справочников.

### 17.8 Восстановление данных при переносе существующего стенда

Если был подготовлен `robolabs_mes.dump`, перед восстановлением остановить backend:

```bash
cd /opt/robolabs-mes
docker compose stop backend
```

Скопировать dump на сервер, если он ещё не там:

```bash
scp robolabs_mes.dump ttm-mini:/opt/robolabs-mes/robolabs_mes.dump
```

Восстановить PostgreSQL:

```bash
cd /opt/robolabs-mes
docker cp robolabs_mes.dump robolabs-mes-postgres:/tmp/robolabs_mes.dump
docker compose exec postgres sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" --if-exists && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec postgres pg_restore -U robolabs -d robolabs_mes --clean --if-exists /tmp/robolabs_mes.dump
docker compose exec backend npx prisma migrate deploy
docker compose start backend
```

Если был подготовлен `production-runs.backup.json`, не использовать его как постоянное хранилище. Сначала восстановить файл как миграционный источник:

```bash
scp production-runs.backup.json ttm-mini:/opt/robolabs-mes/production-runs.backup.json
ssh ttm-mini "cd /opt/robolabs-mes && docker compose stop backend && docker run --rm -v robolabs_mes_runtime_data:/data -v /opt/robolabs-mes:/backup alpine sh -c 'mkdir -p /data && cp /backup/production-runs.backup.json /data/production-runs.json'"
```

Затем реализовать миграционный скрипт по разделу 7.5, добавить для него npm script, например `migrate:production-json`, выполнить миграцию JSON → PostgreSQL и только после успешной проверки запустить backend:

```bash
cd /opt/robolabs-mes
docker compose run --rm backend npm run migrate:production-json
docker compose start backend
```

После восстановления выполнить проверки из раздела 17.9.

### 17.9 Проверка после запуска

На сервере:

```bash
cd /opt/robolabs-mes
docker compose ps
docker compose logs --tail=100 postgres
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Проверить API внутри сервера:

```bash
curl -i http://localhost:8088/api/health
curl -i http://localhost:3000/api/health
```

Проверить frontend:

```bash
curl -I http://localhost:8088
```

С рабочей машины открыть:

```text
http://<TTM_MINI_LAN_IP>:8088
http://<TTM_MINI_LAN_IP>:8088/api/health
https://<TTM_MINI_LAN_IP>:8443
```

Если HTTPS использует self-signed certificate, браузер может показывать предупреждение. Для стенда это допустимо, если пользователь явно принимает сертификат. Для production-нужд настроить нормальный сертификат и reverse proxy.

### 17.10 Настройка firewall и доступа из LAN

На сервере разрешить только нужные порты. Для Ubuntu/Debian с UFW пример:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 8088/tcp
sudo ufw allow 8443/tcp
sudo ufw status verbose
```

Порт `3000` открывать наружу только если нужен прямой доступ к backend API:

```bash
sudo ufw allow 3000/tcp
```

Если сервер находится за другим firewall/router, проверить правила там отдельно.

### 17.11 Регламент обновления после первичного переноса

Для последующих обновлений кода:

```bash
cd /opt/robolabs-mes
docker compose down
```

Передать новую версию файлов тем же способом, что в разделе 17.5.

Затем:

```bash
cd /opt/robolabs-mes
docker compose config
docker compose build --no-cache backend frontend
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose ps
curl -i http://localhost:8088/api/health
```

Не удалять volumes при обычном обновлении. Не выполнять `docker compose down -v`, если цель не полный сброс данных.

### 17.12 Backup на сервере

Минимальный ручной backup:

```bash
cd /opt/robolabs-mes
mkdir -p backups
BACKUP_TS=$(date +%Y%m%d-%H%M%S)
docker compose exec postgres pg_dump -U robolabs -d robolabs_mes -Fc -f /tmp/robolabs_mes_$BACKUP_TS.dump
docker cp robolabs-mes-postgres:/tmp/robolabs_mes_$BACKUP_TS.dump backups/robolabs_mes_$BACKUP_TS.dump
docker run --rm -v robolabs_mes_runtime_data:/data -v "$PWD/backups":/backup alpine sh -c "cp /data/production-runs.json /backup/production-runs_$BACKUP_TS.json 2>/dev/null || true"
```

Проверить, что файлы появились:

```bash
ls -lh backups
```

Для production-эксплуатации добавить cron/systemd timer и копирование backup на внешний носитель или другой сервер.

### 17.13 Rollback

Если новая версия не стартует:

```bash
cd /opt/robolabs-mes
docker compose logs --tail=200 backend frontend postgres
docker compose down
```

Вернуть предыдущую версию файлов из backup/архива или предыдущего release-каталога, затем:

```bash
docker compose build
docker compose up -d
docker compose ps
curl -i http://localhost:8088/api/health
```

Если проблема в данных, восстановить PostgreSQL dump и `production-runs.json` по шагам из раздела 17.8.

### 17.14 Критерии готовности переноса

Перенос считается завершённым, когда выполнены все пункты:

- `ssh ttm-mini` работает;
- проект лежит в `/opt/robolabs-mes`;
- `.env` создан и содержит серверные значения;
- `docker compose config` проходит без ошибок;
- `docker compose ps` показывает запущенные `postgres`, `backend`, `frontend`;
- `curl -i http://localhost:8088/api/health` на сервере возвращает успешный HTTP-ответ;
- веб-интерфейс открывается с рабочей машины по `http://<TTM_MINI_LAN_IP>:8088`;
- при необходимости HTTPS открывается по `https://<TTM_MINI_LAN_IP>:8443`;
- imports/uploads сохраняются после перезапуска контейнеров;
- production runs/units/operations сохраняются в PostgreSQL после `docker compose restart`;
- runtime JSON, если он был перенесён, использован как миграционный источник и не является активным production-хранилищем;
- выбор операции на одном телефоне блокирует выбор той же операции на другом телефоне до release/start/TTL;
- устаревший выбранный экран получает конфликт и обновляет очередь, если операция потеряла актуальность;
- после перезапуска сервера `ttm-mini` контейнеры поднимаются автоматически благодаря `restart: unless-stopped`;
- агент зафиксировал в итоговом отчёте IP, порты, путь проекта, статус миграций, выполнялся ли seed, и где лежит первый backup.

## 18. Что осталось уточнить

- Целевые правила авторизации и роли пользователей.
- Политика хранения backup и ответственный за restore.
- Нужен ли прямой доступ к backend port `3000` из LAN или достаточно frontend port `8088`.
- Окончательная структура справочников Product/WorkCenter/Route/Operation для production-версии.
