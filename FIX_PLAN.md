# План исправлений по итогам повторного аудита

## Цель аудита

Повторно проверить `robolabs-mes-demo` как единый MES-demo сценарий: импорт заказа → план производства → группировка по номенклатуре → частичный запуск → поштучные units → терминал участка → исполнитель → зависимости операций → директорский монитор.

Аудит выполнен по фактическим файлам проекта без удаления БД, Docker volumes и пользовательских данных.

## Найденные проблемы

### Критично

1. Дублирование run-level и unit-level операций в `backend/src/mes.service.ts` и `backend/src/app.controller.ts`.
   - Unit-level уже является основным путем терминала и частичного запуска.
   - Run-level endpoints и расчеты сохранялись параллельно и могли давать отличающиеся прогресс, загрузку и директорские KPI.
2. Некорректная связь ручных запусков без заказа с заказами в плане в `backend/src/mes.service.ts`.
   - Ручной run без `orderNumber` по той же номенклатуре мог уменьшать доступный остаток каждого заказа этой номенклатуры.
3. Расчет загрузки участков по production runs в `backend/src/mes.service.ts` использовал `run.operations * run.quantity`.
   - Для unit-level это дублирует трудоемкость и не отражает фактические статусы единиц.
4. Директорский монитор в `backend/src/mes.service.ts` считал прогресс и выпуск production runs по `run.operations`, игнорируя `units`.
5. JSON-storage `backend/src/data/production-runs.json` записывался прямым `writeFile`, что повышает риск corruption при сбое процесса.
6. Unsafe reset scripts `scripts/reset-demo.ps1` и `scripts/reset-demo.sh` содержат `docker compose down -v --remove-orphans`.

### Важно

1. JSON-storage находится внутри backend image path `src/data`, а в `docker-compose.yml` нет отдельного volume для `production-runs.json`.
2. В `backend/Dockerfile` используется `npx prisma db push` на старте контейнера, тогда как в проекте уже есть migration.
3. В `backend/prisma/seed.ts` есть `deleteMany` для route/capacity, что безопасно только при контролируемом seed и недопустимо как скрытое действие startup.
4. В `frontend/src/main.tsx` вкладка `Производство` продолжает показывать run-level операции, хотя основной промышленный путь уже unit-level через план и терминал.
5. Статусы операции заказа хранятся одновременно в enum `OperationStatus` и строковом `lifecycleStatus`; маппинг частично централизован, но строки статусов все еще разбросаны по UI.
6. Нет автоматических тестов и отдельного smoke script для основного сценария.

### Желательно

1. Разделить большой `frontend/src/main.tsx` на страницы/компоненты.
2. Перенести production runs/units/operations из JSON в additive Prisma-модели.
3. Добавить backend/frontend healthchecks в `docker-compose.yml`.
4. Добавить авторизацию/роли вместо role-ready баннеров.
5. Пересобрать README: текущий `README.md` содержит историю нескольких итераций и устаревшие утверждения рядом с актуальными.

## План исправлений по этапам

### Этап 1. Безопасная стабилизация текущего demo-path

1. Считать production runs в планах, терминале, диспетчерской и директоре только через единый нормализованный источник.
2. Исключить `archived`/`testData` production runs из планов и KPI без физического удаления данных.
3. Исправить доступный остаток заказа: учитывать только runs с тем же `orderNumber` и той же номенклатурой.
4. Исправить загрузку участков и директорские KPI на unit-level операции.
5. Сделать запись `production-runs.json` атомарной через temp file + rename.

### Этап 2. Отключение опасного demo/reset поведения

1. Переписать reset scripts так, чтобы по умолчанию они не удаляли volumes, или заменить их документацией безопасного restart.
2. Заменить startup `db push` на `prisma migrate deploy` после отдельной проверки на стенде.
3. Seed выполнять только явной командой и не на production-like startup.

### Этап 3. UI-фокус

1. Сделать вкладку `Производство` совместимой с unit-level: показывать units и отправлять unit endpoints.
2. Паразитные/дублирующие старые экраны перенести в группу `Дополнительно` или оставить вторичными.
3. Централизовать status labels/mapping на frontend.

### Этап 4. Данные и архитектура

1. Добавить Prisma-модели для `ProductionRun`, `ProductionUnit`, `ProductionOperation` без удаления текущих данных.
2. Подготовить миграцию JSON → БД как отдельный контролируемый script.
3. Добавить тесты бизнес-правил: остатки, зависимости, блокировки, KPI.

## Что исправлено сейчас

1. `productionRuns()`, `productionPlan()`, `dispatchDashboard()`, `workCenterTerminal()`, `directorDashboard()` фильтруют `archived`/`testData` runs через единый helper.
2. Остаток в `productionPlan()` больше не уменьшается ручными runs без заказа.
3. Загрузка участков по production runs считается по unit operations без дополнительного умножения на `run.quantity`.
4. Директорский прогресс и динамика выпуска считаются по unit-level операциям.
5. Запись `backend/src/data/production-runs.json` стала атомарной через temp file + rename.
6. Второй безопасный пакет: runtime storage production runs вынесен в `PRODUCTION_RUNS_FILE` с default `/app/data/production-runs.json` в контейнере и dev fallback на legacy `backend/src/data/production-runs.json`.
7. При первом старте runtime-файл seed/copy создается из legacy JSON без удаления исходного файла и данных.
8. В `docker-compose.yml` добавлен volume `robolabs_mes_runtime_data:/app/data`, а legacy `backend/src/data/production-runs.json` остается в образе как seed-источник.
9. Startup `prisma db push` больше не выполняется автоматически: `backend/docker-entrypoint.sh` запускает его только при `AUTO_DB_PUSH=true`, по умолчанию `AUTO_DB_PUSH=false`.
10. `scripts/reset-demo.ps1` и `scripts/reset-demo.sh` переведены в safe mode: volumes удаляются только с явным `-ForceDeleteVolumes` / `--force-delete-volumes`.
11. Во frontend основные вкладки сфокусированы на `План производства`, `Терминал участка`, `Директор`; старые/второстепенные разделы сгруппированы в `Дополнительно`.
12. `Диспетчеризация` стала первым обязательным unit-level этапом: OP10/ОР10/ОП10 автостартуется, а terminal start для следующих операций остается заблокированным до завершения диспетчеризации.
13. Добавлены dispatcher endpoints `POST /api/production/runs/:id/units/:unitId/dispatch/release` и `POST /api/production/runs/:id/units/:unitId/dispatch/complete`; повторный вызов для уже завершенной диспетчеризации возвращает актуальное состояние без ошибки.
14. `GET /api/production/plan` возвращает по units поля `dispatchStatus`, `dispatchOperationId`, `dispatchCompletedAt`, `nextReadyOperations`, `nextBlockedOperations`, `canReleaseNext`.
15. На экране `План производства / Диспетчерский` в карточках units добавлен блок `Диспетчеризация` с кнопкой `Запустить следующие процессы` и счетчиком открытых следующих операций.
16. Добавлены endpoints `GET /api/production/process-graph` и `GET /api/production/runs/:id/units/:unitId/graph` для списка unit-позиций и графа этапов конкретной unit.
17. Во frontend добавлена вкладка `Граф процесса`: выбор unit, карточка прогресса, legend, summary done/current/ready/blocked/upcoming и CSS flow-граф без новых тяжелых зависимостей.
18. `GET /api/production/runs/:id/units/:unitId/graph` расширен layout-данными: `layout`, а также `level`, `row`, `x`, `y` у каждого node. Level считается по зависимостям `previousOperationCodes`/`blockedBy`, при отсутствии явных связей используется fallback по `sequence`; nodes одного уровня раскладываются по разным row.
19. Edges графа теперь ссылаются на реальные `node.id`, сохраняя совместимые operation-code поля `fromOperationId`/`toOperationId` для отображения. Frontend заменил линейный flow на scrollable canvas с grid background, подписями уровней, absolute nodes и SVG-стрелками без graph-библиотек.

## Что отложено

1. Полный перенос JSON-storage в Prisma.
2. Полная замена startup-политики на управляемый `prisma migrate deploy` — требуется согласованный порядок применения на стенде и backup БД.
3. Переписывание UI-компонентов на отдельные страницы/компоненты.
4. Удаление run-level endpoints — пока оставлены для обратной совместимости.
5. Полный перенос legacy run-level UI на unit-level endpoints.

## Риски

1. JSON-storage остается временным механизмом и не защищает от конкурентных записей между несколькими backend replicas; runtime volume `/app/data` стабилизирует хранение, но не заменяет БД-транзакции.
2. Atomic rename снижает риск corruption при сбое, но не заменяет транзакции БД.
3. Старые production runs без `units` нормализуются в памяти; при записи они будут расширены совместимой unit-структурой.
4. Если ранее ручные runs без заказа специально использовались как общий резерв по номенклатуре, теперь они не уменьшают остатки заказов — это соответствует текущему основному сценарию.
5. При новой чистой БД backend больше не делает `db push` автоматически. Для первичной demo-инициализации нужен явный контролируемый запуск с `AUTO_DB_PUSH=true` или отдельная миграционная процедура.

## Критерии приемки после исправлений

1. `npm run build` backend проходит успешно.
2. `npm run build` frontend проходит успешно.
3. `docker compose config` проходит успешно.
4. `docker compose up -d --build frontend backend` выполняется без удаления volumes.
5. `GET /api/production/plan` возвращает заказы, группы, runs и KPI без учета `testData`/`archived` runs.
6. Частичный запуск не позволяет запустить больше `order.quantity - alreadyLaunched` по конкретному заказу и номенклатуре.
7. Терминал участка показывает unit-level операции и блокирует зависимые операции до завершения предшественников.
8. Директорский монитор видит production runs и считает прогресс/выпуск по units.
9. После частичного запуска OP10/ОР10/ОП10 находится в `work`; до dispatcher release следующая операция имеет `canStart=false` и `blockedBy` с dispatch operation.
10. После `POST /api/production/runs/:id/units/:unitId/dispatch/release` dispatch operation становится `done`, а следующие операции с выполненными зависимостями получают `canStart=true` и доступны в терминале участка.
11. `GET /api/production/process-graph` возвращает `units` по активным production runs и опциональный `graph` выбранной unit.
12. `GET /api/production/runs/:id/units/:unitId/graph` возвращает `metadata`, `layout`, `nodes`, `edges`, `summary`; phases соответствуют правилам `done/current/ready/blocked/upcoming`, а nodes содержат `level/row/x/y`.
