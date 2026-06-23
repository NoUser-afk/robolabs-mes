# RoboPulse MES: заготовка README для магистерской диссертации

> Рабочий документ для последующей упаковки в магистерскую диссертацию о создании, настройке, эксплуатации и развитии MES-системы RoboPulse.

**Статус документа:** черновик-основа, пригодный для преобразования в текст ВКР после согласования темы, методички кафедры, научной новизны, списка источников и формальных требований конкретного вуза.

**Проект:** `robolabs-mes-demo` / RoboPulse MES.
**Рабочий стенд:** `ttm-mini`, URL `http://172.17.16.50:8088/`, HTTPS `https://172.17.16.50:8444/`, backend `http://172.17.16.50:3001/`.
**Локальный путь:** `C:/Users/zamoc/Desktop/robolabs-mes-demo`.
**Дата подготовки:** 2026-06-17.

---

# Как пользоваться этим документом

1. Использовать файл как большой конспект и техническую карту проекта.
2. Переносить разделы в диссертацию не механически, а после научной редакции.
3. Сначала согласовать с научным руководителем тему, объект, предмет, цель, задачи и ожидаемую структуру глав.
4. Уточнить требования конкретного вуза: титульный лист, задание, аннотация, объем, шрифт, поля, нумерация, правила ссылок.
5. Для ГОСТ-структуры применять этот документ как базовый каркас, а не как замену кафедральной методички.
6. Для технических разделов сверяться с исходным кодом проекта и фактической конфигурацией стенда.
7. Для эмпирической части добавить скриншоты, таблицы испытаний, результаты smoke/unit-тестов, диаграммы и приложения.
8. Для защиты подготовить отдельную презентацию: проблема, решение, архитектура, демонстрация, результаты, ограничения.

Контрольная цель документа: дать достаточный объем фактического материала, чтобы из него можно было собрать магистерскую диссертацию о проектировании и внедрении MES-системы на малом производственном стенде.

# Нормативная рамка и ГОСТ-ориентированная структура

Для магистерской работы обычно приоритетны методические указания вуза. При отсутствии более жесткой кафедральной структуры практично использовать ГОСТ 7.32-2017 как основу для отчета о научно-исследовательской работе и ГОСТ Р 7.0.100-2018 как основу для библиографического описания источников.

| Нормативный ориентир | Как используется в этом документе |
|---|---|
| ГОСТ 7.32-2017 | отчет о научно-исследовательской работе: структурные элементы, содержание, введение, заключение, приложения |
| ГОСТ Р 7.0.100-2018 | библиографическая запись и библиографическое описание источников |
| Методические указания кафедры | локальные требования к ВКР магистра: оформление титульного листа, задания, аннотации, нумерации, объема и порядка защиты |
| ГОСТ Р 7.0.5-2008 или локальные правила ссылок | правила внутритекстовых и подстрочных ссылок, если они требуются вузом |
| ГОСТ 19/34 как дополнительная инженерная база | может использоваться выборочно для описания программной документации и требований к автоматизированным системам |

Рекомендуемый состав магистерской диссертации на основе найденных требований:
1. Титульный лист.
2. Задание на выпускную квалификационную работу.
3. Аннотация / реферат.
4. Содержание.
5. Термины и определения.
6. Перечень сокращений и обозначений.
7. Введение.
8. Глава 1. Анализ предметной области и постановка задачи.
9. Глава 2. Проектирование MES-системы.
10. Глава 3. Реализация программного комплекса.
11. Глава 4. Развертывание, испытания и оценка результатов.
12. Заключение.
13. Список использованных источников.
14. Приложения.

Рабочее соответствие ГОСТ 7.32-2017: документ содержит введение, основную часть, заключение, список источников и приложения. Для финальной ВКР необходимо добавить титульные и служебные листы по шаблону вуза.

# Проектная аннотация

В работе рассматривается разработка и внедрение демонстрационной MES-системы RoboPulse для управления производственными заказами, технологическими маршрутами, производственными запусками, операциями по единицам продукции, терминалами рабочих центров и аналитическими панелями диспетчера и директора.

Система построена как web-first приложение с backend на NestJS, ORM Prisma, СУБД PostgreSQL, frontend на React/Vite, reverse proxy на Nginx и Android-оболочкой на Capacitor для терминалов участков. Развертывание выполняется через Docker Compose, а эксплуатационный стенд перенесен на сервер `ttm-mini`.

Практический результат работы: действующий стенд MES, включающий импорт заказов, справочники, техпроцессы, запуск партий, терминальные операции, групповое выполнение операций, QR/PIN вход терминалов, учет времени, события, архив и dashboard-отчетность.

# Термины и сокращения

| Термин | Определение |
|---|---|
| MES | Manufacturing Execution System, система управления производственными процессами на уровне исполнения. |
| RoboPulse | рабочее название разработанной MES-системы. |
| ВКР | выпускная квалификационная работа. |
| API | программный интерфейс взаимодействия frontend, Android shell и backend. |
| DTO | объект передачи данных между клиентом и сервером. |
| ORM | объектно-реляционное отображение; в проекте используется Prisma. |
| Prisma schema | декларативное описание структуры данных и связей PostgreSQL. |
| Production run | производственный запуск номенклатуры или заказа. |
| Production unit | конкретная единица продукции внутри запуска. |
| Unit operation | операция над конкретной единицей продукции. |
| Lease | временная блокировка выбранной операции терминалом. |
| Heartbeat | периодическое продление lease выбранной операции. |
| Work center | рабочий центр или производственный участок. |
| Terminal | рабочее место оператора участка. |
| Dispatcher | роль пользователя для планирования и управления производством. |
| Director | роль пользователя для агрегированного мониторинга. |
| Capacitor | runtime для упаковки web-приложения в Android-приложение. |
| Docker Compose | средство декларативного запуска нескольких контейнеров проекта. |

# Введение

## Актуальность

Производственные предприятия, выполняющие заказы с многооперационными технологическими маршрутами, нуждаются в инструменте оперативного управления исполнением. Табличный учет и ручная передача статусов приводят к задержкам, потере прозрачности, конфликтам при распределении операций и недостаточной управляемости сменной загрузки. MES-система закрывает слой между планированием и фактическим исполнением: фиксирует заказы, операции, рабочие центры, исполнителей, состояние производственных единиц, события и отклонения.

Актуальность проекта RoboPulse связана с необходимостью быстро развернуть демонстрационный, но функционально насыщенный MES-стенд, пригодный для проверки сценариев: импорт заказа, запуск производства, выдача операций на участки, терминальное выполнение, учет статусов, групповое выполнение операций, просмотр архива и руководительская аналитика.

## Объект исследования
Объектом исследования является процесс цифрового управления производственными заказами и операциями на уровне исполнения.

## Предмет исследования
Предметом исследования является архитектура и программная реализация MES-системы для учета заказов, техпроцессов, производственных запусков и терминальной работы участков.

## Цель работы
Цель работы: разработать, настроить и развернуть MES-систему RoboPulse, обеспечивающую сквозной сценарий управления производственным заказом от импорта и планирования до выполнения операций на терминалах и анализа результатов.

## Задачи работы
- проанализировать предметную область MES и требования к демонстрационному производственному стенду;
- сформулировать функциональные и нефункциональные требования к системе;
- спроектировать архитектуру backend, frontend, базы данных и мобильного терминала;
- реализовать доменную модель заказов, операций, производственных запусков, единиц продукции и событий;
- реализовать роли пользователей, авторизацию, PIN/QR-вход терминалов;
- реализовать клиентские рабочие места диспетчера, оператора, технолога и директора;
- обеспечить загрузку и миграцию данных, seed-инициализацию, backup/restore;
- упаковать систему в Docker Compose и развернуть на сервере `ttm-mini`; 
- подготовить Android-приложение RoboPulse Terminal с адресом стенда по умолчанию;
- провести smoke/unit-проверки и описать ограничения текущей версии.

## Научная и практическая значимость
Научная значимость может быть сформулирована через адаптацию принципов MES к малому производственному стенду, где важно совместить простоту внедрения, web-first архитектуру, прозрачность данных и возможность терминального выполнения операций без тяжелой промышленной инфраструктуры.
Практическая значимость заключается в создании работающего программного комплекса, который можно демонстрировать, развивать и использовать как основу для дальнейшей промышленной версии.

## Положения, выносимые на защиту
- Архитектура web-first MES позволяет быстро создать переносимый стенд с backend, frontend, СУБД и Android-терминалом без разработки отдельного нативного клиента с нуля.
- Нормализованная модель production runs, units и unit operations повышает точность учета поштучного исполнения и позволяет реализовать групповые операции.
- Lease-механизм выбора операции на терминале снижает риск конкурентного выполнения одной операции несколькими физическими устройствами.
- Docker Compose и регламент backup/restore делают стенд воспроизводимым и переносимым между локальной машиной и сервером `ttm-mini`.
- Единая React/Vite frontend-кодовая база может использоваться и как web-интерфейс, и как содержимое Android shell через Capacitor.

# Глава 1. Анализ предметной области и постановка задачи

Назначение главы: показать, какие производственные проблемы решает MES-система и какие требования возникли в проекте RoboPulse.

Раздел является заготовкой для последующей редакторской переработки в текст магистерской диссертации. Формулировки ориентированы на инженерно-проектную работу, в которой результатом является действующий программный стенд MES-системы RoboPulse.

## 1.1 Предметная область MES

MES-система находится между уровнем планирования и уровнем физического выполнения. В рамках RoboPulse акцент сделан не на полной ERP-интеграции, а на исполнении заказов и операций: система должна знать, какие изделия необходимо произвести, по какому технологическому маршруту, на каких участках, в каком количестве, с какими статусами и событиями.

## 1.2 Типовые проблемы, выявленные для демонстрационного стенда
- ручной перенос заказов и статусов между таблицами и рабочими местами;
- невозможность увидеть фактическую очередь операций по участкам;
- отсутствие поштучного представления производственного запуска;
- сложность группового выполнения однотипных операций;
- конфликты при работе нескольких терминалов участка;
- отсутствие единого архива завершенных заказов и запусков;
- недостаточная прозрачность сменной загрузки и производительности;
- необходимость быстро перенести стенд с локального ПК на отдельный мини-сервер.

## 1.3 Пользовательские роли
| Роль | Назначение |
|---|---|
| Администратор | настройка пользователей, справочников, сервисные операции. |
| Диспетчер | импорт заказов, запуск производства, контроль плана и очередей. |
| Технолог | ведение справочников операций и техпроцессов номенклатуры. |
| Оператор | работа через терминал участка, выполнение операций. |
| Директор | просмотр dashboard-показателей и агрегированной аналитики. |
| Terminal-only user | специальная учетная запись участка для строгого терминального интерфейса. |

## 1.4 Требования из проектных документов

В проекте присутствуют локальные документы требований и планов. Они образуют историю проектирования и могут быть использованы в диссертации как внутренние проектные материалы.

### Материал `README.md`
- # RoboPulse
- ## 1. Назначение проекта
- ## 2. Быстрый старт
- ### Windows cmd
- ### PowerShell
- ## 3. Актуальный стек
- ### Frontend
- ### Backend
- ### Database
- ### Runtime storage
- ### Docker / Docker Compose
- ## 4. Архитектура и схема взаимодействия
- ## 5. Структура проекта
- ## 6. Основные функциональные модули
- ### 6.1 План производства / Диспетчерский экран
- ### 6.2 Терминал участка
- ### 6.3 Граф процесса
- ### 6.4 Номенклатура/техпроцессы XLSM
- ### 6.5 Директорский монитор
- ### 6.6 Импорт Excel
- ### 6.7 Дополнительные/legacy разделы
- ## 7. Модель данных
- ### 7.1 Prisma/PostgreSQL сущности
- ### 7.2 SQL production runs/units
- ### 7.3 Техпроцессы products-processes.json
- ### 7.4 Конкурентная блокировка terminal operations
- ### 7.5 План миграции runtime JSON в PostgreSQL
- ### 7.6 Ограничения текущей модели
- ## 8. API endpoints
- ### 8.1 Health/import

### Материал `REQUIREMENTS_2026-06-10.md`
- # Доработки RoboPulse по итогам совещания 10.06.2026
- ## 1. Назначение документа
- ## 2. Краткое резюме требований
- ## 3. Исходные заметки
- ## 4. Термины и рабочие определения
- ### Изделие
- ### Штука / unit
- ### Партия
- ### Техпроцесс
- ### Клиентский фильтр
- ## 5. Эпик 1. Редактор техпроцесса
- ### Цель
- ### Требования
- ### Критерии приемки
- ### Вопросы на уточнение
- ## 6. Эпик 2. Группировка изделий и множественный выбор
- ### Цель
- ### Требования
- ### Критерии приемки
- ### Вопросы на уточнение
- ## 7. Эпик 3. Запуск партии
- ### Цель
- ### Требования
- ### Критерии приемки
- ### Вопросы на уточнение
- ## 8. Эпик 4. Множественный выбор штук для операций
- ### Цель
- ### Требования
- ### Критерии приемки
- ### Вопросы на уточнение

### Материал `ROBO_PULSE_ANDROID_TERMINAL_APP_PLAN.md`
- # RoboPulse Android Terminal App - implementation plan for agent
- ## 1. Краткое решение
- ## 2. Статусы чеклиста
- ## 3. Текущее состояние системы
- ## 4. Целевой пользовательский сценарий
- ## 5. Архитектурное решение
- ### 5.1. MVP-режим: remote web origin в Capacitor shell
- ### 5.2. Bundled-режим не делать первым
- ## 6. Документационные основания
- ## 7. Предлагаемая структура файлов
- ### Вариант A - Capacitor внутри `frontend`
- ### Вариант B - отдельный `mobile/android-terminal`
- ## 8. Конфигурация приложения
- ### 8.1. App name и package id
- ### 8.2. Server URL
- ### 8.3. Terminal QR
- ## 9. Roadmap
- ### P0. Подготовка окружения
- ### P1. Добавить Capacitor в frontend
- ### P2. Добавить app mode для Android shell
- ### P3. Сделать экран настройки сервера
- ### P4. QR login внутри Android app
- ### P5. Android native project настройки
- ### P6. HTTPS, сертификаты и сеть цеха
- ### P7. Backend/API доработки, если они понадобятся
- ### P8. Frontend UX доработки для terminal app
- ### P9. Hardware scanner support
- ### P10. Kiosk / pinned mode
- ### P11. Сборка APK
- ### P12. Bundled mode, только после MVP

# Глава 2. Проектирование архитектуры RoboPulse MES

Назначение главы: описать выбранную архитектуру, компоненты, модель данных, API и ключевые инженерные решения.

Раздел является заготовкой для последующей редакторской переработки в текст магистерской диссертации. Формулировки ориентированы на инженерно-проектную работу, в которой результатом является действующий программный стенд MES-системы RoboPulse.

## 2.1 Общая архитектура

RoboPulse реализована как трехзвенная web-система: клиентский уровень React/Vite, серверный уровень NestJS и уровень данных PostgreSQL. Nginx обслуживает frontend и проксирует API-запросы, Docker Compose связывает сервисы в единую воспроизводимую среду.

```mermaid

flowchart LR
    User[Пользователь web UI] --> Nginx[Frontend Nginx]
    Android[Android RoboPulse Terminal] --> Nginx
    Nginx --> React[React/Vite SPA assets]
    Nginx --> API[NestJS API]
    API --> Prisma[Prisma Client]
    Prisma --> PG[(PostgreSQL)]
    API --> Uploads[(uploads volume)]
    API --> Runtime[(runtime data volume)]
```

## 2.2 Backend

Backend построен на NestJS. По актуальной документации NestJS приложение собирается из модулей, controllers и providers; guards применяются для защиты маршрутов, а validation pipes используются для проверки входных данных. В RoboPulse центральный controller связывает HTTP API с доменными сервисами, а `MesService` содержит большую часть бизнес-логики.

SocratiCode dependency graph показывает, что `backend/src/app.controller.ts` импортирует auth-декораторы, guards и сервисы dashboard, nomenclature, process graph, production, reference и terminal. `backend/src/mes.service.ts` импортируется большинством доменных сервисов и является центральным слоем.

### Backend scripts
| Скрипт | Назначение |
|---|---|
| `build` | `nest build` |
| `start` | `nest start` |
| `start:dev` | `nest start --watch` |
| `start:prod` | `node dist/main.js` |
| `test:unit` | `node --test -r ts-node/register test/*.spec.ts` |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate` | `prisma migrate deploy` |
| `migrate:production-json` | `ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/migrate-production-runs-json.ts` |
| `prisma:seed` | `ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed.ts` |

### Backend dependencies
| Пакет | Роль в проекте |
|---|---|
| `@nestjs/common` `^10.4.15` | базовые декораторы, guards, pipes, exceptions |
| `@nestjs/core` `^10.4.15` | ядро NestJS runtime |
| `@nestjs/platform-express` `^10.4.15` | HTTP-платформа Express для NestJS |
| `@prisma/client` `^5.22.0` | типобезопасный доступ к PostgreSQL |
| `class-transformer` `^0.5.1` | преобразование DTO |
| `class-validator` `^0.14.1` | валидация DTO |
| `multer` `^1.4.5-lts.1` | загрузка Excel-файлов заказов |
| `reflect-metadata` `^0.2.2` | служебная зависимость backend |
| `rxjs` `^7.8.1` | служебная зависимость backend |
| `ts-node` `^10.9.2` | служебная зависимость backend |
| `typescript` `^5.7.2` | типизация и сборка |
| `xlsx` `^0.18.5` | разбор Excel-файлов |

## 2.3 Frontend

Frontend реализован как React/Vite SPA. Основной файл `frontend/src/main.tsx` собирает маршрутизацию рабочих мест, экраны входа, производственный план, справочники, архив, отчеты и dashboard. Терминальное рабочее место вынесено в `frontend/src/features/terminal/TerminalWorkspace.tsx`.

### Frontend scripts
| Скрипт | Назначение |
|---|---|
| `dev` | `vite --host 0.0.0.0` |
| `build` | `tsc && vite build` |
| `preview` | `vite preview --host 0.0.0.0` |
| `test:smoke` | `playwright test --config=playwright.smoke.config.ts` |
| `cap:sync` | `npm run build && cap sync android` |
| `android:open` | `cap open android` |
| `android:build:debug` | `npm run cap:sync && cd android && gradlew.bat assembleDebug` |

### Frontend dependencies
| Пакет | Роль в проекте |
|---|---|
| `@capacitor/android` `^8.4.0` | Android-платформа Capacitor |
| `@capacitor/core` `^8.4.0` | runtime API Capacitor |
| `@vitejs/plugin-react` `^4.3.4` | интеграция React с Vite |
| `@zxing/browser` `^0.2.0` | сканирование QR-кодов через браузер/WebView |
| `react` `^18.3.1` | компонентная модель пользовательского интерфейса |
| `react-dom` `^18.3.1` | рендеринг React в DOM |
| `typescript` `^5.7.2` | типизация frontend-кода |
| `vite` `^6.0.3` | сборка и dev-server frontend |

## 2.4 Database и Prisma

Prisma используется как ORM и как декларативная модель данных. По актуальной документации Prisma schema является источником истины для модели данных, Prisma Migrate генерирует SQL-миграции, а `prisma generate` создает Prisma Client для типобезопасного доступа к базе.

Проект использует PostgreSQL. На уровне схемы выделены заказы, операции заказов, пользователи, справочники, техпроцессы номенклатуры, производственные запуски, единицы продукции, unit operations, события, рабочие центры, смены, календарь, причины отклонений и аудит.

### Модели и перечисления Prisma
| Тип | Имя | Ключевые поля по схеме |
|---|---|---|
| enum | `OperationStatus` | new, work, done |
| model | `Order` | id, orderNumber, productCode, productName, quantity, dueDate, customer, priority, comment, sourceFile, status, createdAt, updatedAt, operations, events, timeTrackings, qualityRecords |
| model | `RouteTemplate` | id, productCode, name, version, isActive, operations |
| model | `RouteOperation` | id, routeTemplateId, operationCode, flow, name, section, normHours, previousOperationCodes, nextOperationCodes, sortOrder, routeTemplate |
| model | `OrderOperation` | id, orderId, operationCode, flow, name, section, normHours, previousOperationCodes, nextOperationCodes, sortOrder, status, lifecycleStatus, assignedPersonId, startedAt, finishedAt, actualHours, pauseHours, comment, order, assignedPerson, events, timeTrackings, qualityRecords |
| model | `Person` | id, fullName, section, isActive, operations, events, timeTrackings, qualityRecords, users, managedWorkCenters |
| model | `OperationEvent` | id, orderId, orderOperationId, eventType, personId, timestamp, payload, order, orderOperation, person |
| model | `TimeTracking` | id, orderOperationId, orderId, personId, kind, startedAt, endedAt, durationMinutes, comment, reasonCode, timeCategory, shiftId, createdAt, orderOperation, order, person, shift |
| model | `QualityRecord` | id, orderOperationId, orderId, personId, checkedQty, acceptedQty, defectQty, reworkQty, defectReason, reasonCode, responsibleOperationCode, inspector, status, comment, recordedAt, orderOperation, order, person |
| model | `AppUser` | id, login, role, displayName, passwordHash, terminalQrToken, workCenterSection, isTerminalOnly, lastLoginAt, personId, isActive, createdAt, person |
| model | `ImportBatch` | id, fileName, uploadedAt, status, rowsTotal, rowsCreated, rowsUpdated, errorsJson |
| model | `SectionCapacity` | id, section, availableHours, weldHours, period |
| model | `ReferenceSection` | id, name, isActive, createdAt, updatedAt, workCenters |
| model | `ReferenceOperation` | id, operationCode, name, defaultSection, defaultNormHours, partOrAssembly, isActive, createdAt, updatedAt |
| model | `NomenclatureProcessRecord` | id, equipment, productCode, category, operationsCount, totalNormHours, confidence, data, createdAt, updatedAt |
| model | `ProductionRunRecord` | id, orderId, orderNumber, productId, productCode, productName, quantity, status, priority, operator, startedAt, completedAt, data, createdAt, updatedAt |
| model | `ProductionRun` | id, legacyRecordId, orderId, orderNumber, batchNumber, batchName, batchCreatedBy, batchSource, productId, productCode, productName, quantity, totalQuantity, launchedQuantity, status, priority, priorityRank, operator, comment, archived, testData, createdAt, startedAt, completedAt |
| model | `ProductionUnit` | id, runId, unitNo, status, progress, startedAt, completedAt, createdAt, updatedAt, run, operations, events |
| model | `ProductionUnitOperation` | id, runId, unitId, operationId, sequence, level, partOrAssembly, name, section, previousOperationCodes, nextOperationCodes, normHours, status, priority, priorityRank, lockedBy, lockedAt, lockReason, lockToken, lockTerminalId, lockClientId, lockExpiresAt, lockVersion, selectedAt |
| model | `ProductionOperationEvent` | id, runId, unitId, operationPk, eventType, actor, timestamp, payload, shiftId, reasonCode, timeCategory, run, unit, operation, shift |
| model | `WorkCenter` | id, section, name, capacityHours, workType, masterPersonId, isActive, createdAt, updatedAt, sectionRef, master, shifts |
| model | `WorkShift` | id, shiftDate, section, workCenterId, startsAt, endsAt, brigade, master, status, closedAt, closedBy, closeComment, disputedJson, createdAt, updatedAt, workCenter, timeTrackings, productionOperations, productionEvents |
| model | `ProductionCalendarDay` | id, date, dayType, startsAt, endsAt, comment, createdAt, updatedAt |
| model | `DeviationReason` | code, name, category, timeCategory, affectsWorkerKpi, requiresSupervisorNote, isActive, sortOrder, createdAt, updatedAt |
| model | `AuditLog` | id, entityType, entityId, action, actor, beforeJson, afterJson, comment, createdAt |

## 2.5 Android-приложение

Android-приложение создано как Capacitor shell поверх существующего frontend. По документации Capacitor workflow состоит из сборки web-кода, синхронизации web bundle в native-проект и сборки Android binary. В проекте это отражено в скриптах `cap:sync` и `android:build:debug`.

Текущий адрес сервера по умолчанию для Android: `https://172.17.16.50:8444/`. Старые сохраненные адреса автоматически мигрируют на новый адрес.

## 2.6 Deployment architecture

Docker Compose описывает три основных сервиса: PostgreSQL, backend и frontend. Контейнеры объединены сетью `robolabs_mes_net`, данные PostgreSQL и runtime-файлы вынесены в volumes.

```yaml
name: robolabs-mes-demo

services:
  postgres:
    image: postgres:16-alpine
    container_name: robolabs-mes-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-robolabs_mes}
      POSTGRES_USER: ${POSTGRES_USER:-robolabs}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-robolabs_demo_password}
    volumes:
      - robolabs_mes_pgdata:/var/lib/postgresql/data
    networks:
      - robolabs_mes_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
    container_name: robolabs-mes-backend
    restart: unless-stopped
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql://robolabs:robolabs_demo_password@postgres:5432/robolabs_mes?schema=public}
      PORT: 3000
      UPLOAD_DIR: /app/uploads
      PRODUCTION_RUNS_FILE: ${PRODUCTION_RUNS_FILE:-/app/data/production-runs.json}
      AUTO_DB_PUSH: ${AUTO_DB_PUSH:-false}
      AUTH_SESSION_SECRET: ${AUTH_SESSION_SECRET:-robolabs_mes_demo_change_me}
    volumes:
      - robolabs_mes_uploads:/app/uploads
      - robolabs_mes_runtime_data:/app/data
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - robolabs_mes_net

  frontend:
    build:
      context: ./frontend
    container_name: robolabs-mes-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-8088}:80"
      - "${FRONTEND_HTTPS_PORT:-8443}:443"
    environment:
      ROBO_PULSE_HTTPS_HOSTS: ${ROBO_PULSE_HTTPS_HOSTS:-localhost,127.0.0.1,172.17.16.254,172.18.0.1,172.30.96.1,172.30.160.1}
    volumes:
      - ./frontend/certs:/etc/nginx/certs
    depends_on:
      - backend
    networks:
      - robolabs_mes_net

networks:
  robolabs_mes_net:
    name: robolabs_mes_net

volumes:
  robolabs_mes_pgdata:
    name: robolabs_mes_pgdata
  robolabs_mes_uploads:
    name: robolabs_mes_uploads
  robolabs_mes_runtime_data:
    name: robolabs_mes_runtime_data
```

# Глава 3. Реализация программного комплекса

Назначение главы: описать реализованные подсистемы, API, рабочие места, логику операций и особенности кода.

Раздел является заготовкой для последующей редакторской переработки в текст магистерской диссертации. Формулировки ориентированы на инженерно-проектную работу, в которой результатом является действующий программный стенд MES-системы RoboPulse.

## 3.1 Каталог HTTP API

Ниже приведен автоматически извлеченный каталог endpoint-ов из `backend/src/app.controller.ts`. В финальной диссертации его можно сократить до ключевых групп, а полный каталог вынести в приложение.

### API-001. `GET /health`
- Handler: `health`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-002. `POST /auth/login`
- Handler: `async login`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-003. `GET /auth/terminals`
- Handler: `terminals`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-004. `POST /auth/terminal-login`
- Handler: `async terminalLogin`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-005. `POST /auth/terminal-qr-login`
- Handler: `async terminalQrLogin`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-006. `GET /auth/debug-profiles`
- Handler: `debugProfiles`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-007. `POST /auth/debug-login`
- Handler: `async debugLogin`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-008. `POST /auth/logout`
- Handler: `logout`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-009. `GET /auth/me`
- Handler: `async me`.
- Roles: `terminal, operator, dispatcher, technologist, director, admin`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-010. `GET /me/terminal`
- Handler: `myTerminal`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-011. `POST /me/terminal/operations/:id/start`
- Handler: `terminalStartOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-012. `POST /me/terminal/operations/:id/pause`
- Handler: `terminalPauseOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-013. `POST /me/terminal/operations/:id/resume`
- Handler: `terminalResumeOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-014. `POST /me/terminal/operations/:id/complete`
- Handler: `terminalCompleteOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-015. `POST /me/terminal/production/unit-operations/:operationPk/select`
- Handler: `terminalSelectProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-016. `POST /me/terminal/production/unit-operations/:operationPk/heartbeat`
- Handler: `terminalHeartbeatProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-017. `POST /me/terminal/production/unit-operations/:operationPk/release-selection`
- Handler: `terminalReleaseProductionUnitOperationSelection`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-018. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/start`
- Handler: `terminalStartProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-019. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/pause`
- Handler: `terminalPauseProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-020. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/resume`
- Handler: `terminalResumeProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-021. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/complete`
- Handler: `terminalCompleteProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-022. `POST /me/terminal/production/unit-operations/bulk-action`
- Handler: `terminalBulkProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-023. `POST /import/orders-excel`
- Handler: `@UseInterceptors`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-024. `GET /import/batches`
- Handler: `importBatches`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-025. `GET /orders`
- Handler: `orders`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-026. `GET /orders/:id`
- Handler: `order`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-027. `GET /orders/:id/operations`
- Handler: `orderOperations`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-028. `POST /orders/:id/operations/:operationId/start`
- Handler: `startOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-029. `POST /orders/:id/operations/:operationId/finish`
- Handler: `finishOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-030. `POST /orders/:id/operations/:operationId/reset`
- Handler: `resetOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-031. `POST /orders/:id/archive`
- Handler: `archiveOrder`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-032. `GET /archive/orders`
- Handler: `archiveOrders`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-033. `GET /archive/production-runs`
- Handler: `archiveProductionRuns`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-034. `GET /sections`
- Handler: `sections`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-035. `GET /reference-data`
- Handler: `referenceData`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-036. `POST /reference-sections`
- Handler: `addReferenceSection`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-037. `POST /reference-sections/:id`
- Handler: `updateReferenceSection`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-038. `POST /reference-operations`
- Handler: `addReferenceOperation`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-039. `POST /reference-operations/:id`
- Handler: `updateReferenceOperation`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-040. `GET /people`
- Handler: `people`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-041. `POST /people`
- Handler: `addPerson`.
- Roles: `admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-042. `GET /work-centers`
- Handler: `workCenters`.
- Roles: `admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-043. `POST /work-centers`
- Handler: `upsertWorkCenter`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-044. `GET /shifts`
- Handler: `shifts`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-045. `POST /shifts`
- Handler: `createShift`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-046. `POST /shifts/:id/close`
- Handler: `closeShift`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-047. `GET /calendar`
- Handler: `calendar`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-048. `POST /calendar-days`
- Handler: `upsertCalendarDay`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-049. `GET /deviation-reasons`
- Handler: `deviationReasons`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-050. `POST /deviation-reasons`
- Handler: `upsertDeviationReason`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-051. `GET /reports/section-shift`
- Handler: `sectionShiftReport`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-052. `GET /reports/worker`
- Handler: `workerReport`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-053. `GET /nomenclature`
- Handler: `nomenclature`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-054. `GET /nomenclature/categories`
- Handler: `nomenclatureCategories`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-055. `GET /nomenclature/:id/process`
- Handler: `nomenclatureProcess`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-056. `POST /nomenclature/processes`
- Handler: `saveNomenclatureProcess`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-057. `GET /production/runs`
- Handler: `productionRuns`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-058. `GET /production/plan`
- Handler: `productionPlan`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-059. `GET /production/process-graph`
- Handler: `productionProcessGraph`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-060. `POST /production/launch`
- Handler: `launchProduction`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-061. `POST /production/batches`
- Handler: `launchProductionBatch`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-062. `POST /production/runs`
- Handler: `createProductionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-063. `GET /production/runs/:id`
- Handler: `productionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-064. `GET /production/runs/:id/units/:unitId/graph`
- Handler: `productionUnitGraph`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-065. `POST /production/runs/:id/start`
- Handler: `startProductionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-066. `DELETE /production/runs/:id`
- Handler: `deleteProductionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-067. `POST /production/runs/:id/operations/:operationId/start`
- Handler: `startProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-068. `POST /production/runs/:id/units/:unitId/operations/:operationId/start`
- Handler: `startProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-069. `POST /production/runs/:id/units/:unitId/dispatch/release`
- Handler: `releaseProductionUnitDispatch`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-070. `POST /production/runs/:id/units/:unitId/dispatch/complete`
- Handler: `completeProductionUnitDispatch`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-071. `POST /production/runs/:id/units/:unitId/operations/:operationId/pause`
- Handler: `pauseProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-072. `POST /production/runs/:id/units/:unitId/operations/:operationId/resume`
- Handler: `resumeProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-073. `POST /production/runs/:id/units/:unitId/operations/:operationId/complete`
- Handler: `completeProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-074. `POST /production/unit-operations/bulk-action`
- Handler: `bulkProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-075. `POST /production/runs/:id/operations/:operationId/pause`
- Handler: `pauseProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-076. `POST /production/runs/:id/operations/:operationId/resume`
- Handler: `resumeProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-077. `POST /production/runs/:id/operations/:operationId/complete`
- Handler: `completeProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-078. `GET /dashboard/summary`
- Handler: `dashboardSummary`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-079. `GET /dashboard/section-load`
- Handler: `sectionLoad`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-080. `GET /dispatch/dashboard`
- Handler: `dispatchDashboard`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-081. `GET /work-centers/:section/terminal`
- Handler: `workCenterTerminal`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-082. `POST /operations/:id/start`
- Handler: `startOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-083. `POST /operations/:id/pause`
- Handler: `pauseOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-084. `POST /operations/:id/resume`
- Handler: `resumeOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-085. `POST /operations/:id/complete`
- Handler: `completeOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-086. `POST /operations/:id/quality`
- Handler: `addOperationQuality`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-087. `GET /quality/summary`
- Handler: `qualitySummary`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-088. `GET /director/dashboard`
- Handler: `directorDashboard`.
- Roles: `director, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

### API-089. `GET /events`
- Handler: `events`.
- Roles: `director, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Назначение в диссертации: описать как часть REST API MES-системы.
- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.
- Выходные данные: JSON-ответ, используемый frontend или Android shell.
- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.
- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.

## 3.2 Доменная логика MesService

Файл `backend/src/mes.service.ts` содержит методы импорта заказов, ведения справочников, запуска производства, построения плана, терминальной работы, групповых действий, отчетов, dashboard и audit events. В текущей архитектуре это центральная точка бизнес-логики, а сервисы `dashboard`, `production`, `terminal`, `reference`, `nomenclature` делегируют операции в `MesService`.

### Импорт и заказы
- `importOrdersExcel`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `orders`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `order`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `setOperationStatus`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `archiveOrder`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Справочники
- `sections`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `referenceData`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `addReferenceSection`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `addReferenceOperation`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `workCenters`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Смены и KPI
- `createShift`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `closeShift`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `sectionShiftReport`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `workerReport`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Номенклатура
- `nomenclature`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `nomenclatureProcess`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `saveNomenclatureProcess`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Production runs
- `productionRuns`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `productionPlan`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `launchProduction`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `launchProductionBatch`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `productionRun`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Unit operations
- `productionUnitOperationAction`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `terminalProductionUnitOperationAction`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `productionBulkUnitOperationAction`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Terminal lease
- `selectProductionUnitOperation`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `heartbeatProductionUnitOperation`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `releaseProductionUnitOperationSelection`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Dashboard
- `dashboardSummary`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `dispatchDashboard`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `directorDashboard`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

### Audit and events
- `audit`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `recordProductionOperationEvents`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.
- `events`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.

## 3.3 Рабочее место диспетчера
- просмотр производственного плана;
- запуск производства по заказу или номенклатуре;
- создание партии запусков;
- контроль unit operations;
- освобождение и завершение dispatch-этапов;
- просмотр событий и загрузки участков;
- работа с архивом завершенных заказов и запусков.

## 3.4 Рабочее место терминала участка
- выбор terminal-only учетной записи по PIN;
- QR-вход по строке `robopulse://terminal/<token>`;
- строгий terminal workspace без доступа к диспетчерским и директорским экранам;
- очередь операций участка;
- локальный клиентский фильтр по операции, статусу, заказу, изделию и групповым операциям;
- выбор операции с lease-блокировкой;
- heartbeat продления выбранной операции;
- release selection при уходе с операции;
- start/pause/resume/complete;
- групповые действия над совместимыми unit operations;
- лента последних событий участка.

### Lease-семантика терминала
1. Оператор открывает очередь участка.
2. Frontend выбирает строку production unit operation.
3. Backend проверяет статус, зависимости, отсутствие актуального чужого lock.
4. Backend выдает `lockToken`, `lockVersion`, `lockExpiresAt`.
5. Frontend сохраняет selection state.
6. Frontend запускает heartbeat с периодом меньше TTL.
7. Если heartbeat не проходит, frontend снимает выбор и обновляет очередь.
8. При `start` frontend передает `lockToken` и ожидаемую версию.
9. Backend атомарно переводит operation из `queued` в `work`.
10. Истекшие lease не должны навсегда блокировать операцию.

## 3.5 Технологический процесс и номенклатура
Подсистема номенклатуры хранит технологические процессы изделий. Важное отличие проекта: production run строится на основе процесса номенклатуры и разворачивается в набор единиц продукции и операций по каждой единице. Это позволяет не только видеть общий заказ, но и управлять поштучным исполнением.

## 3.6 Отчеты, смены и директорский dashboard
Система включает смены, рабочие центры, производственный календарь, причины отклонений, отчеты по участку и сотруднику, а также директорский dashboard. Эти функции нужны для перехода от простой фиксации статусов к управленческой аналитике.

# Глава 4. Развертывание, перенос, эксплуатация и испытания

Назначение главы: описать воспроизводимость стенда, перенос на сервер, импорт данных, backup/restore и проверку работоспособности.

Раздел является заготовкой для последующей редакторской переработки в текст магистерской диссертации. Формулировки ориентированы на инженерно-проектную работу, в которой результатом является действующий программный стенд MES-системы RoboPulse.

## 4.1 Локальный запуск
```powershell

docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend frontend postgres
```

## 4.2 Prisma workflow
```powershell

cd backend
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd run test:unit
```

В Docker-режиме миграции применяются командой:
```bash
docker compose exec backend npx prisma migrate deploy
```

## 4.3 Перенос на `ttm-mini`
Фактический стенд был развернут в каталоге `/home/admin_ttm/robolabs-mes-demo`, так как запись в `/opt` требовала sudo. Порты стенда: frontend HTTP `8088`, frontend HTTPS `8444`, backend host port `3001`, внутренний backend port `3000`.

1. проверка SSH-доступа `ttm-mini`;
2. подготовка архива проекта без `node_modules`, dist, test-results и локальных временных файлов;
3. копирование проекта на сервер;
4. создание серверного `.env`;
5. сборка Docker images;
6. инициализация PostgreSQL;
7. применение Prisma schema/migrations;
8. seed-инициализация справочников;
9. загрузка данных с локального ПК;
10. создание backup до и после импорта;
11. проверка `/api/health` и входа `dispatcher.demo`.

## 4.4 Перенос данных
Из локальной БД были перенесены заказы, статусы, production runs, production unit operations, справочники и номенклатура. Для сохранения состояния миграций удаленной схемы перенос выполнялся data-only dump без `_prisma_migrations`.

Контрольные счетчики после импорта на `ttm-mini`:
| Сущность | Состояние после переноса |
|---|---|
| Order | 1 |
| Order archived | 1 |
| OrderOperation | 12, все done |
| ProductionRun | 7 |
| ProductionUnitOperation | done:449, paused:1, queued:671, work:5 |
| NomenclatureProcessRecord | 5 |
| RouteTemplate | 1 |
| RouteOperation | 13 |
| ReferenceSection | 33 |
| ReferenceOperation | 81 |
| Person | 25 |
| AppUser | 36 |
| _prisma_migrations | 12 примененных миграций |

## 4.5 Backup/restore
```bash

BACKUP_TS=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
docker compose exec -T postgres pg_dump -U robolabs -d robolabs_mes -Fc -f /tmp/robolabs_mes_$BACKUP_TS.dump
docker cp robolabs-mes-postgres:/tmp/robolabs_mes_$BACKUP_TS.dump backups/robolabs_mes_$BACKUP_TS.dump
ls -lh backups
```

## 4.6 Android build
```powershell

cd frontend
npm.cmd run cap:sync
cd android
.\gradlew.bat assembleDebug
```

Финальный debug APK находится в `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## 4.7 Проверки
- `npm.cmd run prisma:generate` в backend;
- `npm.cmd run build` в backend;
- `npm.cmd run test:unit` в backend;
- `npm.cmd run build` во frontend;
- `npm.cmd run cap:sync`; 
- `gradlew.bat assembleDebug`; 
- `docker compose config`; 
- HTTP health `http://172.17.16.50:8088/api/health`; 
- backend health `http://172.17.16.50:3001/api/health`; 
- HTTPS frontend `https://172.17.16.50:8444`; 
- вход диспетчера `dispatcher.demo / dispatcher`; 
- проверка данных БД после импорта.

# Заключение

В результате проекта создана и развернута MES-система RoboPulse, обеспечивающая управление заказами, технологическими процессами, производственными запусками, операциями по единицам продукции, терминальной работой участков и аналитическими представлениями для диспетчера и директора. Система демонстрирует возможность построения web-first MES-стенда на современном TypeScript-стеке с PostgreSQL и Docker Compose.

Ключевые результаты:
- разработана архитектура backend/frontend/database/mobile shell;
- реализована доменная модель заказов, operations, production runs, units и events;
- создан REST API с ролями и guards;
- реализованы рабочие места диспетчера, оператора, технолога и директора;
- реализован Android terminal app на Capacitor;
- внедрена блокировка выбора операций через lease/heartbeat;
- реализованы backup/restore и перенос данных;
- стенд перенесен на сервер `ttm-mini` и проверен.

Ограничения текущей версии:
- часть production-сценариев пока сохраняет совместимость с legacy JSON-историей;
- политики безопасности и production-grade управление правами требуют дальнейшей формализации;
- release-сборка Android требует отдельного keystore и регламента подписания;
- self-signed HTTPS подходит для demo-стенда, но для production требуется нормальный сертификат;
- нужно расширить автоматические тесты для полного сценария импорт → запуск → терминал → отчетность;
- необходимо подготовить кафедрально корректную библиографию и оформить ссылки по требованиям вуза.

# Список использованных источников и материалов

1. ГОСТ 7.32-2017. Отчет о научно-исследовательской работе. Структура и правила оформления. URL: https://docs.cntd.ru/document/1200157208/titles/7EG0KJ.
2. PDF ГОСТ 7.32-2017, зеркало МГУ. URL: https://cs.msu.ru/sites/cmc/files/docs/2021-11gost_7.32-2017.pdf.
3. ГОСТ Р 7.0.100-2018. Библиографическая запись. Библиографическое описание. URL: https://docs.cntd.ru/document/1200161674.
4. PDF ГОСТ Р 7.0.100-2018, ifap.ru. URL: https://ifap.ru/library/gost/701002018.pdf.
5. NestJS documentation. URL: https://docs.nestjs.com/.
6. Prisma ORM documentation. URL: https://www.prisma.io/docs/orm.
7. Capacitor documentation. URL: https://capacitorjs.com/docs.
8. React documentation. URL: https://react.dev/.
9. Vite documentation. URL: https://vite.dev/.
10. Docker Compose documentation. URL: https://docs.docker.com/compose/.
11. PostgreSQL documentation. URL: https://www.postgresql.org/docs/.
12. Внутренний проектный README RoboPulse. URL: ./README.md.
13. План Android-приложения RoboPulse Terminal. URL: ./ROBO_PULSE_ANDROID_TERMINAL_APP_PLAN.md.
14. Требования по итогам совещания 10.06.2026. URL: ./REQUIREMENTS_2026-06-10.md.

# Приложение А. Каталог моделей данных

## A.1. enum `OperationStatus`
- Тип схемы: `enum`.
- Имя: `OperationStatus`.
- Ключевые поля: new, work, done.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.2. model `Order`
- Тип схемы: `model`.
- Имя: `Order`.
- Ключевые поля: id, orderNumber, productCode, productName, quantity, dueDate, customer, priority, comment, sourceFile, status, createdAt, updatedAt, operations, events, timeTrackings, qualityRecords.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.3. model `RouteTemplate`
- Тип схемы: `model`.
- Имя: `RouteTemplate`.
- Ключевые поля: id, productCode, name, version, isActive, operations.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.4. model `RouteOperation`
- Тип схемы: `model`.
- Имя: `RouteOperation`.
- Ключевые поля: id, routeTemplateId, operationCode, flow, name, section, normHours, previousOperationCodes, nextOperationCodes, sortOrder, routeTemplate.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.5. model `OrderOperation`
- Тип схемы: `model`.
- Имя: `OrderOperation`.
- Ключевые поля: id, orderId, operationCode, flow, name, section, normHours, previousOperationCodes, nextOperationCodes, sortOrder, status, lifecycleStatus, assignedPersonId, startedAt, finishedAt, actualHours, pauseHours, comment, order, assignedPerson, events, timeTrackings, qualityRecords.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.6. model `Person`
- Тип схемы: `model`.
- Имя: `Person`.
- Ключевые поля: id, fullName, section, isActive, operations, events, timeTrackings, qualityRecords, users, managedWorkCenters.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.7. model `OperationEvent`
- Тип схемы: `model`.
- Имя: `OperationEvent`.
- Ключевые поля: id, orderId, orderOperationId, eventType, personId, timestamp, payload, order, orderOperation, person.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.8. model `TimeTracking`
- Тип схемы: `model`.
- Имя: `TimeTracking`.
- Ключевые поля: id, orderOperationId, orderId, personId, kind, startedAt, endedAt, durationMinutes, comment, reasonCode, timeCategory, shiftId, createdAt, orderOperation, order, person, shift.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.9. model `QualityRecord`
- Тип схемы: `model`.
- Имя: `QualityRecord`.
- Ключевые поля: id, orderOperationId, orderId, personId, checkedQty, acceptedQty, defectQty, reworkQty, defectReason, reasonCode, responsibleOperationCode, inspector, status, comment, recordedAt, orderOperation, order, person.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.10. model `AppUser`
- Тип схемы: `model`.
- Имя: `AppUser`.
- Ключевые поля: id, login, role, displayName, passwordHash, terminalQrToken, workCenterSection, isTerminalOnly, lastLoginAt, personId, isActive, createdAt, person.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.11. model `ImportBatch`
- Тип схемы: `model`.
- Имя: `ImportBatch`.
- Ключевые поля: id, fileName, uploadedAt, status, rowsTotal, rowsCreated, rowsUpdated, errorsJson.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.12. model `SectionCapacity`
- Тип схемы: `model`.
- Имя: `SectionCapacity`.
- Ключевые поля: id, section, availableHours, weldHours, period.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.13. model `ReferenceSection`
- Тип схемы: `model`.
- Имя: `ReferenceSection`.
- Ключевые поля: id, name, isActive, createdAt, updatedAt, workCenters.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.14. model `ReferenceOperation`
- Тип схемы: `model`.
- Имя: `ReferenceOperation`.
- Ключевые поля: id, operationCode, name, defaultSection, defaultNormHours, partOrAssembly, isActive, createdAt, updatedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.15. model `NomenclatureProcessRecord`
- Тип схемы: `model`.
- Имя: `NomenclatureProcessRecord`.
- Ключевые поля: id, equipment, productCode, category, operationsCount, totalNormHours, confidence, data, createdAt, updatedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.16. model `ProductionRunRecord`
- Тип схемы: `model`.
- Имя: `ProductionRunRecord`.
- Ключевые поля: id, orderId, orderNumber, productId, productCode, productName, quantity, status, priority, operator, startedAt, completedAt, data, createdAt, updatedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.17. model `ProductionRun`
- Тип схемы: `model`.
- Имя: `ProductionRun`.
- Ключевые поля: id, legacyRecordId, orderId, orderNumber, batchNumber, batchName, batchCreatedBy, batchSource, productId, productCode, productName, quantity, totalQuantity, launchedQuantity, status, priority, priorityRank, operator, comment, archived, testData, createdAt, startedAt, completedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.18. model `ProductionUnit`
- Тип схемы: `model`.
- Имя: `ProductionUnit`.
- Ключевые поля: id, runId, unitNo, status, progress, startedAt, completedAt, createdAt, updatedAt, run, operations, events.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.19. model `ProductionUnitOperation`
- Тип схемы: `model`.
- Имя: `ProductionUnitOperation`.
- Ключевые поля: id, runId, unitId, operationId, sequence, level, partOrAssembly, name, section, previousOperationCodes, nextOperationCodes, normHours, status, priority, priorityRank, lockedBy, lockedAt, lockReason, lockToken, lockTerminalId, lockClientId, lockExpiresAt, lockVersion, selectedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.20. model `ProductionOperationEvent`
- Тип схемы: `model`.
- Имя: `ProductionOperationEvent`.
- Ключевые поля: id, runId, unitId, operationPk, eventType, actor, timestamp, payload, shiftId, reasonCode, timeCategory, run, unit, operation, shift.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.21. model `WorkCenter`
- Тип схемы: `model`.
- Имя: `WorkCenter`.
- Ключевые поля: id, section, name, capacityHours, workType, masterPersonId, isActive, createdAt, updatedAt, sectionRef, master, shifts.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.22. model `WorkShift`
- Тип схемы: `model`.
- Имя: `WorkShift`.
- Ключевые поля: id, shiftDate, section, workCenterId, startsAt, endsAt, brigade, master, status, closedAt, closedBy, closeComment, disputedJson, createdAt, updatedAt, workCenter, timeTrackings, productionOperations, productionEvents.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.23. model `ProductionCalendarDay`
- Тип схемы: `model`.
- Имя: `ProductionCalendarDay`.
- Ключевые поля: id, date, dayType, startsAt, endsAt, comment, createdAt, updatedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.24. model `DeviationReason`
- Тип схемы: `model`.
- Имя: `DeviationReason`.
- Ключевые поля: code, name, category, timeCategory, affectsWorkerKpi, requiresSupervisorNote, isActive, sortOrder, createdAt, updatedAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

## A.25. model `AuditLog`
- Тип схемы: `model`.
- Имя: `AuditLog`.
- Ключевые поля: id, entityType, entityId, action, actor, beforeJson, afterJson, comment, createdAt.
- Назначение: описать роль сущности в доменной модели MES.
- Связи: уточнить по relation-полям Prisma schema.
- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.
- CRUD/API: связать с endpoint-ами из приложения Б.
- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.
- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.
- Риски данных: описать каскадные удаления, архивирование и backup.

# Приложение Б. Расширенный каталог API

## Б.1. `GET /health`
- HTTP method: `GET`.
- Path: `/health`.
- Controller handler: `health`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.2. `POST /auth/login`
- HTTP method: `POST`.
- Path: `/auth/login`.
- Controller handler: `async login`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.3. `GET /auth/terminals`
- HTTP method: `GET`.
- Path: `/auth/terminals`.
- Controller handler: `terminals`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.4. `POST /auth/terminal-login`
- HTTP method: `POST`.
- Path: `/auth/terminal-login`.
- Controller handler: `async terminalLogin`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.5. `POST /auth/terminal-qr-login`
- HTTP method: `POST`.
- Path: `/auth/terminal-qr-login`.
- Controller handler: `async terminalQrLogin`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.6. `GET /auth/debug-profiles`
- HTTP method: `GET`.
- Path: `/auth/debug-profiles`.
- Controller handler: `debugProfiles`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.7. `POST /auth/debug-login`
- HTTP method: `POST`.
- Path: `/auth/debug-login`.
- Controller handler: `async debugLogin`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.8. `POST /auth/logout`
- HTTP method: `POST`.
- Path: `/auth/logout`.
- Controller handler: `logout`.
- Roles: `admin, dispatcher, technologist, director, operator`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.9. `GET /auth/me`
- HTTP method: `GET`.
- Path: `/auth/me`.
- Controller handler: `async me`.
- Roles: `terminal, operator, dispatcher, technologist, director, admin`.
- Guards: `UseGuard, SessionAuthGuard, RolesGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.10. `GET /me/terminal`
- HTTP method: `GET`.
- Path: `/me/terminal`.
- Controller handler: `myTerminal`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.11. `POST /me/terminal/operations/:id/start`
- HTTP method: `POST`.
- Path: `/me/terminal/operations/:id/start`.
- Controller handler: `terminalStartOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.12. `POST /me/terminal/operations/:id/pause`
- HTTP method: `POST`.
- Path: `/me/terminal/operations/:id/pause`.
- Controller handler: `terminalPauseOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.13. `POST /me/terminal/operations/:id/resume`
- HTTP method: `POST`.
- Path: `/me/terminal/operations/:id/resume`.
- Controller handler: `terminalResumeOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.14. `POST /me/terminal/operations/:id/complete`
- HTTP method: `POST`.
- Path: `/me/terminal/operations/:id/complete`.
- Controller handler: `terminalCompleteOperationById`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.15. `POST /me/terminal/production/unit-operations/:operationPk/select`
- HTTP method: `POST`.
- Path: `/me/terminal/production/unit-operations/:operationPk/select`.
- Controller handler: `terminalSelectProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.16. `POST /me/terminal/production/unit-operations/:operationPk/heartbeat`
- HTTP method: `POST`.
- Path: `/me/terminal/production/unit-operations/:operationPk/heartbeat`.
- Controller handler: `terminalHeartbeatProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.17. `POST /me/terminal/production/unit-operations/:operationPk/release-selection`
- HTTP method: `POST`.
- Path: `/me/terminal/production/unit-operations/:operationPk/release-selection`.
- Controller handler: `terminalReleaseProductionUnitOperationSelection`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.18. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/start`
- HTTP method: `POST`.
- Path: `/me/terminal/production/runs/:id/units/:unitId/operations/:operationId/start`.
- Controller handler: `terminalStartProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.19. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/pause`
- HTTP method: `POST`.
- Path: `/me/terminal/production/runs/:id/units/:unitId/operations/:operationId/pause`.
- Controller handler: `terminalPauseProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.20. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/resume`
- HTTP method: `POST`.
- Path: `/me/terminal/production/runs/:id/units/:unitId/operations/:operationId/resume`.
- Controller handler: `terminalResumeProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.21. `POST /me/terminal/production/runs/:id/units/:unitId/operations/:operationId/complete`
- HTTP method: `POST`.
- Path: `/me/terminal/production/runs/:id/units/:unitId/operations/:operationId/complete`.
- Controller handler: `terminalCompleteProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.22. `POST /me/terminal/production/unit-operations/bulk-action`
- HTTP method: `POST`.
- Path: `/me/terminal/production/unit-operations/bulk-action`.
- Controller handler: `terminalBulkProductionUnitOperation`.
- Roles: `terminal`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.23. `POST /import/orders-excel`
- HTTP method: `POST`.
- Path: `/import/orders-excel`.
- Controller handler: `@UseInterceptors`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.24. `GET /import/batches`
- HTTP method: `GET`.
- Path: `/import/batches`.
- Controller handler: `importBatches`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.25. `GET /orders`
- HTTP method: `GET`.
- Path: `/orders`.
- Controller handler: `orders`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.26. `GET /orders/:id`
- HTTP method: `GET`.
- Path: `/orders/:id`.
- Controller handler: `order`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.27. `GET /orders/:id/operations`
- HTTP method: `GET`.
- Path: `/orders/:id/operations`.
- Controller handler: `orderOperations`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.28. `POST /orders/:id/operations/:operationId/start`
- HTTP method: `POST`.
- Path: `/orders/:id/operations/:operationId/start`.
- Controller handler: `startOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.29. `POST /orders/:id/operations/:operationId/finish`
- HTTP method: `POST`.
- Path: `/orders/:id/operations/:operationId/finish`.
- Controller handler: `finishOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.30. `POST /orders/:id/operations/:operationId/reset`
- HTTP method: `POST`.
- Path: `/orders/:id/operations/:operationId/reset`.
- Controller handler: `resetOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.31. `POST /orders/:id/archive`
- HTTP method: `POST`.
- Path: `/orders/:id/archive`.
- Controller handler: `archiveOrder`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.32. `GET /archive/orders`
- HTTP method: `GET`.
- Path: `/archive/orders`.
- Controller handler: `archiveOrders`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.33. `GET /archive/production-runs`
- HTTP method: `GET`.
- Path: `/archive/production-runs`.
- Controller handler: `archiveProductionRuns`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.34. `GET /sections`
- HTTP method: `GET`.
- Path: `/sections`.
- Controller handler: `sections`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.35. `GET /reference-data`
- HTTP method: `GET`.
- Path: `/reference-data`.
- Controller handler: `referenceData`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.36. `POST /reference-sections`
- HTTP method: `POST`.
- Path: `/reference-sections`.
- Controller handler: `addReferenceSection`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.37. `POST /reference-sections/:id`
- HTTP method: `POST`.
- Path: `/reference-sections/:id`.
- Controller handler: `updateReferenceSection`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.38. `POST /reference-operations`
- HTTP method: `POST`.
- Path: `/reference-operations`.
- Controller handler: `addReferenceOperation`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.39. `POST /reference-operations/:id`
- HTTP method: `POST`.
- Path: `/reference-operations/:id`.
- Controller handler: `updateReferenceOperation`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.40. `GET /people`
- HTTP method: `GET`.
- Path: `/people`.
- Controller handler: `people`.
- Roles: `technologist, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.41. `POST /people`
- HTTP method: `POST`.
- Path: `/people`.
- Controller handler: `addPerson`.
- Roles: `admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.42. `GET /work-centers`
- HTTP method: `GET`.
- Path: `/work-centers`.
- Controller handler: `workCenters`.
- Roles: `admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.43. `POST /work-centers`
- HTTP method: `POST`.
- Path: `/work-centers`.
- Controller handler: `upsertWorkCenter`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.44. `GET /shifts`
- HTTP method: `GET`.
- Path: `/shifts`.
- Controller handler: `shifts`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.45. `POST /shifts`
- HTTP method: `POST`.
- Path: `/shifts`.
- Controller handler: `createShift`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.46. `POST /shifts/:id/close`
- HTTP method: `POST`.
- Path: `/shifts/:id/close`.
- Controller handler: `closeShift`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.47. `GET /calendar`
- HTTP method: `GET`.
- Path: `/calendar`.
- Controller handler: `calendar`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.48. `POST /calendar-days`
- HTTP method: `POST`.
- Path: `/calendar-days`.
- Controller handler: `upsertCalendarDay`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.49. `GET /deviation-reasons`
- HTTP method: `GET`.
- Path: `/deviation-reasons`.
- Controller handler: `deviationReasons`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.50. `POST /deviation-reasons`
- HTTP method: `POST`.
- Path: `/deviation-reasons`.
- Controller handler: `upsertDeviationReason`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.51. `GET /reports/section-shift`
- HTTP method: `GET`.
- Path: `/reports/section-shift`.
- Controller handler: `sectionShiftReport`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.52. `GET /reports/worker`
- HTTP method: `GET`.
- Path: `/reports/worker`.
- Controller handler: `workerReport`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.53. `GET /nomenclature`
- HTTP method: `GET`.
- Path: `/nomenclature`.
- Controller handler: `nomenclature`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.54. `GET /nomenclature/categories`
- HTTP method: `GET`.
- Path: `/nomenclature/categories`.
- Controller handler: `nomenclatureCategories`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.55. `GET /nomenclature/:id/process`
- HTTP method: `GET`.
- Path: `/nomenclature/:id/process`.
- Controller handler: `nomenclatureProcess`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.56. `POST /nomenclature/processes`
- HTTP method: `POST`.
- Path: `/nomenclature/processes`.
- Controller handler: `saveNomenclatureProcess`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.57. `GET /production/runs`
- HTTP method: `GET`.
- Path: `/production/runs`.
- Controller handler: `productionRuns`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.58. `GET /production/plan`
- HTTP method: `GET`.
- Path: `/production/plan`.
- Controller handler: `productionPlan`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.59. `GET /production/process-graph`
- HTTP method: `GET`.
- Path: `/production/process-graph`.
- Controller handler: `productionProcessGraph`.
- Roles: `technologist, dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.60. `POST /production/launch`
- HTTP method: `POST`.
- Path: `/production/launch`.
- Controller handler: `launchProduction`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.61. `POST /production/batches`
- HTTP method: `POST`.
- Path: `/production/batches`.
- Controller handler: `launchProductionBatch`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.62. `POST /production/runs`
- HTTP method: `POST`.
- Path: `/production/runs`.
- Controller handler: `createProductionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.63. `GET /production/runs/:id`
- HTTP method: `GET`.
- Path: `/production/runs/:id`.
- Controller handler: `productionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.64. `GET /production/runs/:id/units/:unitId/graph`
- HTTP method: `GET`.
- Path: `/production/runs/:id/units/:unitId/graph`.
- Controller handler: `productionUnitGraph`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.65. `POST /production/runs/:id/start`
- HTTP method: `POST`.
- Path: `/production/runs/:id/start`.
- Controller handler: `startProductionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.66. `DELETE /production/runs/:id`
- HTTP method: `DELETE`.
- Path: `/production/runs/:id`.
- Controller handler: `deleteProductionRun`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.67. `POST /production/runs/:id/operations/:operationId/start`
- HTTP method: `POST`.
- Path: `/production/runs/:id/operations/:operationId/start`.
- Controller handler: `startProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.68. `POST /production/runs/:id/units/:unitId/operations/:operationId/start`
- HTTP method: `POST`.
- Path: `/production/runs/:id/units/:unitId/operations/:operationId/start`.
- Controller handler: `startProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.69. `POST /production/runs/:id/units/:unitId/dispatch/release`
- HTTP method: `POST`.
- Path: `/production/runs/:id/units/:unitId/dispatch/release`.
- Controller handler: `releaseProductionUnitDispatch`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.70. `POST /production/runs/:id/units/:unitId/dispatch/complete`
- HTTP method: `POST`.
- Path: `/production/runs/:id/units/:unitId/dispatch/complete`.
- Controller handler: `completeProductionUnitDispatch`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.71. `POST /production/runs/:id/units/:unitId/operations/:operationId/pause`
- HTTP method: `POST`.
- Path: `/production/runs/:id/units/:unitId/operations/:operationId/pause`.
- Controller handler: `pauseProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.72. `POST /production/runs/:id/units/:unitId/operations/:operationId/resume`
- HTTP method: `POST`.
- Path: `/production/runs/:id/units/:unitId/operations/:operationId/resume`.
- Controller handler: `resumeProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.73. `POST /production/runs/:id/units/:unitId/operations/:operationId/complete`
- HTTP method: `POST`.
- Path: `/production/runs/:id/units/:unitId/operations/:operationId/complete`.
- Controller handler: `completeProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.74. `POST /production/unit-operations/bulk-action`
- HTTP method: `POST`.
- Path: `/production/unit-operations/bulk-action`.
- Controller handler: `bulkProductionUnitOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.75. `POST /production/runs/:id/operations/:operationId/pause`
- HTTP method: `POST`.
- Path: `/production/runs/:id/operations/:operationId/pause`.
- Controller handler: `pauseProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.76. `POST /production/runs/:id/operations/:operationId/resume`
- HTTP method: `POST`.
- Path: `/production/runs/:id/operations/:operationId/resume`.
- Controller handler: `resumeProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.77. `POST /production/runs/:id/operations/:operationId/complete`
- HTTP method: `POST`.
- Path: `/production/runs/:id/operations/:operationId/complete`.
- Controller handler: `completeProductionRunOperation`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.78. `GET /dashboard/summary`
- HTTP method: `GET`.
- Path: `/dashboard/summary`.
- Controller handler: `dashboardSummary`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.79. `GET /dashboard/section-load`
- HTTP method: `GET`.
- Path: `/dashboard/section-load`.
- Controller handler: `sectionLoad`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.80. `GET /dispatch/dashboard`
- HTTP method: `GET`.
- Path: `/dispatch/dashboard`.
- Controller handler: `dispatchDashboard`.
- Roles: `dispatcher, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.81. `GET /work-centers/:section/terminal`
- HTTP method: `GET`.
- Path: `/work-centers/:section/terminal`.
- Controller handler: `workCenterTerminal`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.82. `POST /operations/:id/start`
- HTTP method: `POST`.
- Path: `/operations/:id/start`.
- Controller handler: `startOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.83. `POST /operations/:id/pause`
- HTTP method: `POST`.
- Path: `/operations/:id/pause`.
- Controller handler: `pauseOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.84. `POST /operations/:id/resume`
- HTTP method: `POST`.
- Path: `/operations/:id/resume`.
- Controller handler: `resumeOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.85. `POST /operations/:id/complete`
- HTTP method: `POST`.
- Path: `/operations/:id/complete`.
- Controller handler: `completeOperationById`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.86. `POST /operations/:id/quality`
- HTTP method: `POST`.
- Path: `/operations/:id/quality`.
- Controller handler: `addOperationQuality`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.87. `GET /quality/summary`
- HTTP method: `GET`.
- Path: `/quality/summary`.
- Controller handler: `qualitySummary`.
- Roles: `dispatcher, operator, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.88. `GET /director/dashboard`
- HTTP method: `GET`.
- Path: `/director/dashboard`.
- Controller handler: `directorDashboard`.
- Roles: `director, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

## Б.89. `GET /events`
- HTTP method: `GET`.
- Path: `/events`.
- Controller handler: `events`.
- Roles: `director, admin`.
- Guards: `UseGuard, TerminalAuthGuard`.
- Категория: определить по первому сегменту path.
- Business capability: зафиксировать в финальной API-таблице.
- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.
- Response schema: описать по фактическому JSON-ответу.
- Frontend caller: найти через `rg` по path или handler.
- Test case: добавить позитивный и негативный сценарий.
- Security note: проверить права роли и отсутствие лишнего доступа.

# Приложение В. Сценарии использования
## В.1. Импорт Excel-заказа
- Краткое описание: диспетчер загружает файл, backend разбирает строки, создает заказ и операции.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.2. Запуск производства по заказу
- Краткое описание: диспетчер выбирает заказ и инициирует production run.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.3. Партия запусков
- Краткое описание: диспетчер выбирает несколько позиций и создает batch.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.4. Работа терминала по PIN
- Краткое описание: оператор выбирает терминал участка и вводит PIN.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.5. Работа терминала по QR
- Краткое описание: оператор сканирует QR-строку и попадает в terminal workspace.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.6. Выбор операции
- Краткое описание: терминал получает lease и блокирует queued operation.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.7. Потеря lease
- Краткое описание: heartbeat не продлен, операция освобождается для другого терминала.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.8. Групповая операция
- Краткое описание: оператор выбирает несколько совместимых unit operations и запускает bulk action.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.9. Пауза операции
- Краткое описание: оператор фиксирует временную остановку работы.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.10. Завершение операции
- Краткое описание: оператор переводит operation в done и открывает зависимые операции.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.11. Архив заказа
- Краткое описание: после завершения всех операций заказ переносится в архив.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.12. Просмотр директорского dashboard
- Краткое описание: руководитель видит агрегированные KPI и состояние производства.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.13. Backup перед обновлением
- Краткое описание: администратор создает dump PostgreSQL перед миграцией.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.14. Restore после сбоя
- Краткое описание: администратор восстанавливает dump и проверяет health endpoints.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

## В.15. Обновление Android APK
- Краткое описание: новый APK получает дефолтный server URL и мигрирует старый сохраненный адрес.
- Актор: указать роль пользователя.
- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.
- Основной поток: описать пошагово в финальной версии.
- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.
- Задействованные endpoint-ы: связать с приложением Б.
- Задействованные модели БД: связать с приложением А.
- UI-экран: указать компонент frontend.
- Проверка результата: статус, событие, запись в БД, обновление dashboard.
- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.

# Приложение Г. План развития
## Г.1. Полностью убрать зависимость от legacy JSON для production runs.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.2. Разделить `MesService` на более мелкие bounded-context сервисы.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.3. Расширить e2e-тестирование сценариев терминала.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.4. Добавить OpenAPI/Swagger спецификацию.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.5. Добавить production-grade authentication policy.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.6. Настроить release signing Android APK.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.7. Добавить нормальный TLS-сертификат или внутренний CA-регламент.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.8. Добавить автоматический backup по cron/systemd timer.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.9. Добавить мониторинг контейнеров и алерты.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.10. Подготовить импорт из 1С/ERP или интеграционный слой.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.11. Расширить аналитику KPI и отклонений.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

## Г.12. Сформировать комплект пользовательской документации.
- Обоснование: описать, какой риск или ограничение закрывает доработка.
- Текущее состояние: зафиксировать по коду и стенду.
- Требуемые изменения backend: описать новые service/API/migration.
- Требуемые изменения frontend: описать новые экраны/состояния.
- Требуемые изменения DevOps: описать deployment/backup/monitoring.
- Критерии приемки: сформулировать измеримо.

# Приложение Д. Черновик содержания будущей диссертации
## Д.1. Заготовка подраздела 1
- Рабочий тезис: связать подраздел 1 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.2. Заготовка подраздела 2
- Рабочий тезис: связать подраздел 2 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.3. Заготовка подраздела 3
- Рабочий тезис: связать подраздел 3 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.4. Заготовка подраздела 4
- Рабочий тезис: связать подраздел 4 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.5. Заготовка подраздела 5
- Рабочий тезис: связать подраздел 5 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.6. Заготовка подраздела 6
- Рабочий тезис: связать подраздел 6 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.7. Заготовка подраздела 7
- Рабочий тезис: связать подраздел 7 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.8. Заготовка подраздела 8
- Рабочий тезис: связать подраздел 8 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.9. Заготовка подраздела 9
- Рабочий тезис: связать подраздел 9 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.10. Заготовка подраздела 10
- Рабочий тезис: связать подраздел 10 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.11. Заготовка подраздела 11
- Рабочий тезис: связать подраздел 11 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.12. Заготовка подраздела 12
- Рабочий тезис: связать подраздел 12 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.13. Заготовка подраздела 13
- Рабочий тезис: связать подраздел 13 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.14. Заготовка подраздела 14
- Рабочий тезис: связать подраздел 14 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.15. Заготовка подраздела 15
- Рабочий тезис: связать подраздел 15 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.16. Заготовка подраздела 16
- Рабочий тезис: связать подраздел 16 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.17. Заготовка подраздела 17
- Рабочий тезис: связать подраздел 17 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.18. Заготовка подраздела 18
- Рабочий тезис: связать подраздел 18 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.19. Заготовка подраздела 19
- Рабочий тезис: связать подраздел 19 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.20. Заготовка подраздела 20
- Рабочий тезис: связать подраздел 20 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.21. Заготовка подраздела 21
- Рабочий тезис: связать подраздел 21 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.22. Заготовка подраздела 22
- Рабочий тезис: связать подраздел 22 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.23. Заготовка подраздела 23
- Рабочий тезис: связать подраздел 23 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.24. Заготовка подраздела 24
- Рабочий тезис: связать подраздел 24 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.25. Заготовка подраздела 25
- Рабочий тезис: связать подраздел 25 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.26. Заготовка подраздела 26
- Рабочий тезис: связать подраздел 26 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.27. Заготовка подраздела 27
- Рабочий тезис: связать подраздел 27 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.28. Заготовка подраздела 28
- Рабочий тезис: связать подраздел 28 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.29. Заготовка подраздела 29
- Рабочий тезис: связать подраздел 29 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.30. Заготовка подраздела 30
- Рабочий тезис: связать подраздел 30 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.31. Заготовка подраздела 31
- Рабочий тезис: связать подраздел 31 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.32. Заготовка подраздела 32
- Рабочий тезис: связать подраздел 32 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.33. Заготовка подраздела 33
- Рабочий тезис: связать подраздел 33 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.34. Заготовка подраздела 34
- Рабочий тезис: связать подраздел 34 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.35. Заготовка подраздела 35
- Рабочий тезис: связать подраздел 35 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.36. Заготовка подраздела 36
- Рабочий тезис: связать подраздел 36 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.37. Заготовка подраздела 37
- Рабочий тезис: связать подраздел 37 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.38. Заготовка подраздела 38
- Рабочий тезис: связать подраздел 38 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.39. Заготовка подраздела 39
- Рабочий тезис: связать подраздел 39 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.40. Заготовка подраздела 40
- Рабочий тезис: связать подраздел 40 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.41. Заготовка подраздела 41
- Рабочий тезис: связать подраздел 41 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.42. Заготовка подраздела 42
- Рабочий тезис: связать подраздел 42 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.43. Заготовка подраздела 43
- Рабочий тезис: связать подраздел 43 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.44. Заготовка подраздела 44
- Рабочий тезис: связать подраздел 44 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.45. Заготовка подраздела 45
- Рабочий тезис: связать подраздел 45 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.46. Заготовка подраздела 46
- Рабочий тезис: связать подраздел 46 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.47. Заготовка подраздела 47
- Рабочий тезис: связать подраздел 47 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.48. Заготовка подраздела 48
- Рабочий тезис: связать подраздел 48 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.49. Заготовка подраздела 49
- Рабочий тезис: связать подраздел 49 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.50. Заготовка подраздела 50
- Рабочий тезис: связать подраздел 50 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.51. Заготовка подраздела 51
- Рабочий тезис: связать подраздел 51 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.52. Заготовка подраздела 52
- Рабочий тезис: связать подраздел 52 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.53. Заготовка подраздела 53
- Рабочий тезис: связать подраздел 53 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.54. Заготовка подраздела 54
- Рабочий тезис: связать подраздел 54 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.55. Заготовка подраздела 55
- Рабочий тезис: связать подраздел 55 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.56. Заготовка подраздела 56
- Рабочий тезис: связать подраздел 56 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.57. Заготовка подраздела 57
- Рабочий тезис: связать подраздел 57 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.58. Заготовка подраздела 58
- Рабочий тезис: связать подраздел 58 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.59. Заготовка подраздела 59
- Рабочий тезис: связать подраздел 59 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.60. Заготовка подраздела 60
- Рабочий тезис: связать подраздел 60 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.61. Заготовка подраздела 61
- Рабочий тезис: связать подраздел 61 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.62. Заготовка подраздела 62
- Рабочий тезис: связать подраздел 62 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.63. Заготовка подраздела 63
- Рабочий тезис: связать подраздел 63 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.64. Заготовка подраздела 64
- Рабочий тезис: связать подраздел 64 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.65. Заготовка подраздела 65
- Рабочий тезис: связать подраздел 65 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.66. Заготовка подраздела 66
- Рабочий тезис: связать подраздел 66 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.67. Заготовка подраздела 67
- Рабочий тезис: связать подраздел 67 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.68. Заготовка подраздела 68
- Рабочий тезис: связать подраздел 68 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.69. Заготовка подраздела 69
- Рабочий тезис: связать подраздел 69 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.70. Заготовка подраздела 70
- Рабочий тезис: связать подраздел 70 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.71. Заготовка подраздела 71
- Рабочий тезис: связать подраздел 71 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.72. Заготовка подраздела 72
- Рабочий тезис: связать подраздел 72 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.73. Заготовка подраздела 73
- Рабочий тезис: связать подраздел 73 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.74. Заготовка подраздела 74
- Рабочий тезис: связать подраздел 74 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.75. Заготовка подраздела 75
- Рабочий тезис: связать подраздел 75 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.76. Заготовка подраздела 76
- Рабочий тезис: связать подраздел 76 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.77. Заготовка подраздела 77
- Рабочий тезис: связать подраздел 77 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.78. Заготовка подраздела 78
- Рабочий тезис: связать подраздел 78 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.79. Заготовка подраздела 79
- Рабочий тезис: связать подраздел 79 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

## Д.80. Заготовка подраздела 80
- Рабочий тезис: связать подраздел 80 с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.
- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.
- Научная формулировка: переписать технический факт как исследовательский результат.
- Иллюстрация: добавить таблицу, диаграмму или листинг.
- Вывод: сформулировать 2-3 предложения для конца подраздела.

