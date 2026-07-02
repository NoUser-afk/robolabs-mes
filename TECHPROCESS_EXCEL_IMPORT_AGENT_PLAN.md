# План доработки: импорт техпроцессов из Excel

Дата: 2026-07-02

## Назначение документа

Это инструкция для агента, который будет реализовывать доработку на локальном стенде `localhost` в репозитории RoboPulse MES.

Задача: добавить Excel-форму для технолога и backend-механизм загрузки технологических процессов из `.xlsx/.xls` в существующую модель номенклатуры и версий техпроцессов.

Важно: этот документ не требует немедленной реализации. Сначала агент должен выполнить план, сверяясь с текущим кодом.

## Контекст проекта

SocratiCode использован для навигации по семантике проекта:

- Контекстных артефактов `.socraticodecontextartifacts.json` нет.
- Граф зависимостей готов: 67 файлов, 88 зависимостей, циклических зависимостей нет.
- Наиболее связанные файлы: `backend/src/app.controller.ts`, `backend/src/app.module.ts`, `backend/src/mes.service.ts`, `frontend/src/main.tsx`.
- Ключевые зоны для этой доработки:
  - `backend/src/app.controller.ts`
  - `backend/src/mes.service.ts`
  - `backend/src/services/nomenclature.service.ts`
  - `backend/src/dto/mes.dto.ts`
  - `backend/prisma/schema.prisma`
  - `frontend/src/main.tsx`
  - `frontend/src/features/tech-process/TechProcessBuilder.tsx`
  - `frontend/src/api/types.ts`
  - `data/samples/`

Текущая семантика:

- Заказы уже импортируются через `POST /api/import/orders-excel`, вкладку `Импорт Excel` и `MesService.importOrdersExcel()`.
- Backend уже использует пакет `xlsx`.
- Номенклатура читается через `GET /api/nomenclature` и `GET /api/nomenclature/:id/process`.
- Версии техпроцесса уже есть в Prisma:
  - `NomenclatureProcessRecord`
  - `NomenclatureProcessVersion`
- Endpoint-ы версий уже существуют:
  - `GET /api/nomenclature/:id/versions`
  - `GET /api/nomenclature/:id/versions/:versionId`
  - `POST /api/nomenclature/:id/versions`
  - `PATCH /api/nomenclature/:id/versions/:versionId`
  - `POST /api/nomenclature/:id/versions/:versionId/activate`
  - `POST /api/nomenclature/:id/versions/:versionId/copy`
  - `DELETE /api/nomenclature/:id/versions/:versionId`
- `saveNomenclatureProcess()` и `persistNomenclatureProcessVersion()` уже создают версии и умеют делать версию активной.
- `ProductionRun` хранит `processVersionId`, `processVersionNo`, `processSourceId`, `processSnapshotAt`; изменение активной версии не должно менять уже созданные партии.
- Frontend уже имеет полноэкранную карточку номенклатуры, вкладки `Карточка`, `Маршрут`, `Версии`, `Конструктор` и компонент `TechProcessBuilder`.

Вывод: не создавать отдельную новую модель БД для Excel-импорта. Импорт должен нормализовать Excel в существующий `ProductProcess`/`processSteps` и сохранять его как новую `NomenclatureProcessVersion`.

## Инженерная планка

Эту доработку нужно делать как полноценный продуктовый механизм, а не как временный импортный скрипт.

Обязательные принципы:

- Не копить технический долг ради скорости.
- Не смешивать импорт заказов и импорт техпроцессов в одной неподходящей модели данных.
- Не расширять `frontend/src/main.tsx` новой крупной логикой; новые UI-блоки выносить в feature-файлы.
- Не писать новые пользовательские строки с поврежденной кодировкой и не копировать mojibake из старого кода.
- Не делать "тихую" нормализацию опасных ошибок Excel: циклы, битые ссылки, дубли операций и пустые обязательные поля должны блокировать импорт.
- Не менять legacy JSON `backend/src/data/products-processes.json` и не использовать его как место сохранения новых загруженных техпроцессов.
- Все записи в БД выполнять транзакционно: импортная история, версия техпроцесса и активация должны быть согласованы.

## Целевой пользовательский сценарий

1. Технолог открывает локальный интерфейс на `http://localhost` или порт текущего frontend dev/proxy стенда.
2. Переходит в раздел номенклатуры или импорта.
3. Выбирает файл Excel с техпроцессом.
4. Видит предварительную проверку: изделие, код, категория, количество операций, сумма норм, ошибки и предупреждения.
5. Выбирает режим:
   - создать новую номенклатуру;
   - добавить новую версию к существующей номенклатуре по `processId` или `productCode`;
   - сохранить как черновик;
   - сохранить и сделать активной.
6. После импорта новая версия появляется во вкладке `Версии`, а активная версия используется только для новых production runs.

## Excel-форма

Нужно добавить шаблон в `data/samples/techprocess-template.xlsx` и описать его в `data/samples/README.md`.

Рекомендуемая структура workbook:

### Лист `Process`

Одна строка с реквизитами техпроцесса.

Обязательные колонки:

| Колонка | Назначение |
|---|---|
| `equipment` | Наименование номенклатуры / изделия |
| `productCode` | Код номенклатуры |

Опциональные колонки:

| Колонка | Назначение |
|---|---|
| `processId` | Явный id процесса, иначе генерировать как в `normalizeManualProcess()` |
| `category` | Категория, по умолчанию `Ручная номенклатура` |
| `versionComment` | Комментарий к версии |
| `notes` | Примечания, можно разделять переводами строк или `;` |
| `activate` | `true/false`, по умолчанию зависит от выбранного режима в UI |

### Лист `Operations`

Одна строка на операцию.

Обязательные колонки:

| Колонка | Назначение |
|---|---|
| `operationId` | Код операции, например `OP10`; нормализуется в upper-case |
| `name` | Наименование операции |
| `section` | Участок |

Опциональные колонки:

| Колонка | Назначение |
|---|---|
| `sequence` | Порядок операций; если пусто, использовать порядок строк |
| `level` | Уровень/колонка графа, минимум `1` |
| `partOrAssembly` | Деталь/узел, по умолчанию `Общее` |
| `normHours` | Норма, часы; число >= 0 |
| `previousOperationCodes` | Предыдущие операции через `,`, `;` или перевод строки |
| `nextOperationCodes` | Следующие операции через `,`, `;` или перевод строки |
| `groupCapable` | `true/false`, `да/нет`, `1/0` |
| `x` | Позиция узла на графе, если задана в Excel |
| `y` | Позиция узла на графе, если задана в Excel |

Поддержать tolerant-заголовки на русском, аналогично импорту заказов:

- `equipment`, `Номенклатура`, `Изделие`, `Наименование`
- `productCode`, `Код`, `КодИзделия`, `Код номенклатуры`
- `operationId`, `Операция`, `Код операции`, `ID операции`
- `name`, `Наименование операции`
- `section`, `Участок`
- `normHours`, `Норма`, `Норма ч`, `Норма, ч`
- `previousOperationCodes`, `Предыдущие`, `Предшественники`
- `nextOperationCodes`, `Следующие`, `Последующие`

## Backend-план

### 1. DTO

В `backend/src/dto/mes.dto.ts` добавить типы:

```ts
export type ImportTechProcessExcelMode = 'dry-run' | 'draft' | 'active';
export type ImportTechProcessExcelBody = {
  mode?: ImportTechProcessExcelMode;
  processId?: string;
  productCode?: string;
  replaceExistingProductCode?: boolean;
};
```

Multipart body приходит как строки, поэтому в контроллере/сервисе нормализовать `mode`, `activate`, `replaceExistingProductCode`.

### 2. Controller endpoints

В `backend/src/app.controller.ts` добавить endpoints рядом с текущим импортом Excel:

```http
POST /api/import/techprocess-excel/preview
POST /api/import/techprocess-excel
```

Роли:

- `technologist`
- `admin`

`preview` не пишет в БД, возвращает нормализованный `ProductProcess`, summary, warnings, errors.

`import` пишет новую версию:

- `mode=draft` создает draft-версию;
- `mode=active` создает версию и активирует ее;
- при конфликте `productCode` использовать уже существующий механизм `replaceExistingProductCode`.

### 3. Service layer

В `backend/src/services/nomenclature.service.ts` добавить thin wrappers:

- `previewTechProcessExcel(file, body, actor?)`
- `importTechProcessExcel(file, body, actor?)`

Основную логику держать в `MesService`, как сделано для текущих операций номенклатуры.

### 4. Parser helpers in `MesService`

В `backend/src/mes.service.ts` добавить небольшие private helpers:

- `readTechProcessWorkbook(file)`
- `parseTechProcessHeader(workbook)`
- `parseTechProcessRows(workbook)`
- `techProcessExcelToManualProcess(file, body)`
- `splitOperationCodes(value)`
- `booleanCell(value)`
- `numberCell(value, fallback)`
- `validateImportedTechProcess(process)`

Не дублировать полную бизнес-валидацию. После парсинга обязательно прогнать через существующий `normalizeManualProcess()`, потому что там уже есть:

- обязательные `equipment`, `productCode`, `processSteps`;
- уникальность `operationId`;
- нормализация `sequence`, `level`, `normHours`;
- фильтрация ссылок на несуществующие операции;
- проверка DAG на циклы через `assertAcyclicProcess()`;
- расчет `totalNormHours`;
- форма `ProductProcess`.

### 5. Связи операций

Правило нормализации:

- Если заполнены только `previousOperationCodes`, вычислить `nextOperationCodes`.
- Если заполнены только `nextOperationCodes`, вычислить `previousOperationCodes`.
- Если заполнены оба набора, синхронизировать их и вернуть warning, если входящие/исходящие связи расходились.
- Не создавать связи на несуществующие операции; такие ссылки всегда возвращать как error.
- Циклы должны быть ошибкой импорта.

Ссылки на несуществующие операции должны блокировать preview/import до вызова `normalizeManualProcess()`. Нельзя молча отбрасывать такие связи.

### 6. Сохранение версии

Импорт должен использовать один явный путь сохранения:

- для новой/существующей номенклатуры: `persistNomenclatureProcessVersion(...)`;
- публичную обертку допускается оставить только тонким endpoint-level методом, без отдельной логики сохранения.

Требование:

- Не менять старые `ProductionRun`.
- Не перезаписывать `backend/src/data/products-processes.json`.
- Не создавать `RouteTemplate/RouteOperation`: это legacy-маршруты заказов, а техпроцессы номенклатуры живут в `NomenclatureProcessRecord/Version`.

### 7. История импорта

Текущая таблица `ImportBatch` рассчитана на импорт заказов. Не переиспользовать ее для техпроцессов: это смешает разные домены и ухудшит аудит.

Добавить отдельную Prisma-модель:

```prisma
model TechProcessImportBatch {
  id              Int      @id @default(autoincrement())
  fileName        String
  uploadedAt      DateTime @default(now())
  uploadedBy      String?
  status          String
  mode            String
  processId       String?
  productCode     String?
  versionId       String?
  versionNo       Int?
  operationsCount Int      @default(0)
  totalNormHours  Float    @default(0)
  warningsJson    Json?
  errorsJson      Json?
  previewJson     Json?

  @@index([uploadedAt])
  @@index([processId])
  @@index([productCode])
  @@index([versionId])
  @@index([status])
}
```

Создать Prisma migration. Запись истории должна происходить:

- для `preview`: `status = 'preview'`, с `previewJson`, `warningsJson`, `errorsJson`;
- для успешного draft/active импорта: `status = 'completed'`;
- для ошибки сохранения после валидного preview: `status = 'failed'`, с диагностикой.

Если импорт создает/активирует версию, запись `TechProcessImportBatch` должна хранить `processId`, `versionId`, `versionNo`, `operationsCount`, `totalNormHours`.

## Frontend-план

### 1. Размещение UI

Добавить загрузку техпроцесса в существующий раздел номенклатуры, потому что это сценарий технолога.

Обязательный вариант:

- в `NomenclatureProcesses` добавить кнопку `Загрузить техпроцесс из Excel`;
- открыть отдельный полноэкранный режим или отдельную вкладку карточки номенклатуры для загрузки;
- старую вкладку `Импорт Excel` оставить для заказов или явно переименовать ее в `Импорт заказов`;
- не смешивать UI импорта заказов и техпроцессов в одном компоненте.

Если нужен единый раздел импорта, это должен быть отдельный верхнеуровневый экран с двумя независимыми компонентами:

- `Заказы из Excel`
- `Техпроцесс из Excel`

### 2. Компонент загрузки

Создать отдельный компонент, не добавляя крупную форму напрямую в `frontend/src/main.tsx`:

- `frontend/src/features/tech-process/TechProcessExcelImport.tsx`
- экспортировать через `frontend/src/features/tech-process/index.ts`
- подключить в `NomenclatureProcesses` или `NomenclatureProcessCardScreen`

Состояния:

- выбранный файл;
- режим `dry-run/draft/active`;
- `replaceExistingProductCode`;
- preview result;
- errors/warnings;
- success result.

`main.tsx` должен только маршрутизировать и передавать callbacks, без parser/UI-state логики импорта.

### 3. UX

Форма должна поддержать:

- file input `.xlsx,.xls`;
- кнопка `Проверить`;
- кнопка `Сохранить черновик`;
- кнопка `Сохранить и сделать активным`;
- список ошибок;
- список предупреждений;
- summary: код, изделие, категория, операций, норма;
- после успешного импорта открыть карточку номенклатуры и вкладку `Версии` или `Маршрут`.

Все новые русские строки писать нормальным UTF-8. Не копировать поврежденные русские литералы из старых участков, где терминал показывает mojibake.

### 4. Types

В `frontend/src/api/types.ts` добавить типы результата:

```ts
export type TechProcessExcelImportIssue = {
  row?: number;
  field?: string;
  message: string;
};

export type TechProcessExcelImportPreview = {
  ok: boolean;
  process?: ProductProcess;
  summary?: {
    equipment: string;
    productCode: string;
    category: string;
    operationsCount: number;
    totalNormHours: number;
  };
  warnings: TechProcessExcelImportIssue[];
  errors: TechProcessExcelImportIssue[];
};
```

Для результата сохранения вернуть стабильный contract:

```ts
export type TechProcessExcelImportResult = TechProcessExcelImportPreview & {
  ok: true;
  process: ProductProcess;
  version: NomenclatureProcessVersion;
  importBatch: {
    id: number;
    status: string;
    mode: 'draft' | 'active';
    fileName: string;
    uploadedAt: string;
  };
};
```

Ошибочный ответ должен иметь тот же shape для `warnings/errors`, чтобы UI не содержал ad hoc ветвлений.

## Тест-план

### Backend unit tests

Добавить тесты в `backend/test/techprocess-excel-import.spec.ts`.

Проверить:

- валидный файл с двумя-тремя операциями импортируется как draft;
- `mode=active` делает новую версию активной;
- повторный импорт по тому же `productCode` требует `replaceExistingProductCode`, если используется конфликтная ветка;
- отсутствующий `equipment` или `productCode` возвращает ошибку;
- отсутствующий `operationId/name/section` возвращает ошибку с номером строки;
- дублирующийся `operationId` возвращает ошибку;
- ссылка на несуществующую операцию возвращает ошибку;
- цикл в операциях возвращает ошибку;
- preview создает запись `TechProcessImportBatch` со статусом `preview`;
- успешный import создает запись `TechProcessImportBatch` со статусом `completed` и ссылкой на `versionId`;
- ошибка сохранения фиксируется в `TechProcessImportBatch` со статусом `failed`;
- уже созданные `ProductionRun` не меняются после импорта новой активной версии.

### Frontend smoke

Расширить `frontend/smoke/robopulse-smoke.spec.ts`:

- login `technologist`;
- открыть `Номенклатура`;
- загрузить sample `data/samples/techprocess-template.xlsx` или тестовый файл;
- выполнить preview;
- сохранить как draft;
- убедиться, что во вкладке `Версии` появилась новая версия;
- активировать версию;
- убедиться, что `GET /api/nomenclature/:id/process` возвращает новый активный маршрут.

### Localhost verification

Перед завершением реализации агент должен выполнить:

```powershell
docker compose up -d --build
docker compose ps
```

Backend:

```powershell
cd backend
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd run test:unit
```

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:smoke
```

HTTP sanity:

```powershell
Invoke-WebRequest http://localhost:3001/api/health
```

Если локальный stack в `docker-compose.yml` публикует другие порты, использовать фактические порты из `docker compose ps`.

## Критерии приемки

- В проекте есть Excel-шаблон техпроцесса в `data/samples/`.
- Технолог может загрузить `.xlsx/.xls` техпроцесс на localhost.
- Preview показывает ошибки до записи в БД.
- Валидный Excel создает `NomenclatureProcessVersion`.
- Каждая проверка/загрузка техпроцесса фиксируется в `TechProcessImportBatch`.
- Режим active меняет активную версию через существующую версионную модель.
- Старые production runs не изменяются.
- Новые production runs создаются по активной версии, выбранной на момент запуска.
- В UI видна новая версия и ее можно открыть во вкладке `Версии`.
- Ошибки импорта понятны пользователю: строка, поле, причина.
- Backend build, unit tests, frontend build и smoke проходят локально или в финальном отчете явно указано, что не удалось проверить.

## Риски и решения

- Риск: Excel из реального производства будет иметь нестабильные заголовки.
  Решение: tolerant-заголовки и отдельный preview с диагностикой.

- Риск: связи операций задают только входящие или только исходящие зависимости.
  Решение: синхронизировать второй набор связей автоматически, но показывать warning.

- Риск: импорт случайно перезапишет активный техпроцесс.
  Решение: по умолчанию preview/draft; active только явным действием.

- Риск: смешать legacy `RouteTemplate` и номенклатурные техпроцессы.
  Решение: импорт техпроцессов не должен писать в `RouteTemplate`; использовать только `NomenclatureProcessRecord/Version`.

- Риск: поврежденные русские строки в существующих файлах.
  Решение: все затронутые новым UI/API строки писать в UTF-8; если рядом приходится менять поврежденный текст, исправить его в рамках этой же доработки, а не оставлять новый код рядом с mojibake.

## Рекомендуемый порядок реализации

1. Добавить sample Excel и описание формата.
2. Добавить Prisma-модель `TechProcessImportBatch` и migration.
3. Добавить backend parser и preview endpoint.
4. Покрыть parser unit-тестами.
5. Добавить import endpoint, который транзакционно пишет историю импорта и сохраняет draft/active версию.
6. Добавить отдельный frontend-компонент загрузки в `frontend/src/features/tech-process/`.
7. Добавить smoke-сценарий.
8. Запустить localhost stack и пройти ручную проверку технолога.
9. Обновить `README.md` разделом про импорт техпроцессов из Excel.
