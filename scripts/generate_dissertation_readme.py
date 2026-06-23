from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "README_DISSERTATION_ROBOPULSE_MES.md"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8", errors="replace")


def extract_models() -> list[dict[str, str]]:
    text = read("backend/prisma/schema.prisma")
    items: list[dict[str, str]] = []
    for match in re.finditer(r"^(model|enum)\s+(\w+)\s*\{", text, flags=re.M):
        kind, name = match.group(1), match.group(2)
        start = match.end()
        depth = 1
        i = start
        while i < len(text) and depth:
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
            i += 1
        body = text[start : i - 1]
        fields = []
        for raw in body.splitlines():
            line = raw.strip()
            if not line or line.startswith("//") or line.startswith("@@"):
                continue
            fields.append(line.split()[0])
        items.append({"kind": kind, "name": name, "fields": ", ".join(fields[:24])})
    return items


def extract_endpoints() -> list[dict[str, str]]:
    lines = read("backend/src/app.controller.ts").splitlines()
    endpoints: list[dict[str, str]] = []
    roles: list[str] = []
    guards: list[str] = []
    pending_method = ""
    pending_path = ""
    route_re = re.compile(r"@(Get|Post|Delete|Put|Patch)\('([^']*)'\)")
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("@Roles("):
            roles = re.findall(r"'([^']+)'", stripped)
        if stripped.startswith("@UseGuards("):
            guards = re.findall(r"([A-Za-z]+Guard)", stripped)
        m = route_re.search(stripped)
        if m:
            pending_method, pending_path = m.group(1).upper(), "/" + m.group(2)
            continue
        if pending_method and re.search(r"\w+\(", stripped):
            fn = stripped.split("(")[0].strip()
            endpoints.append(
                {
                    "method": pending_method,
                    "path": pending_path,
                    "handler": fn,
                    "roles": ", ".join(roles) if roles else "base guards",
                    "guards": ", ".join(guards) if guards else "SessionAuthGuard, RolesGuard",
                }
            )
            pending_method = ""
            pending_path = ""
    return endpoints


def package_info(path: str) -> dict:
    return json.loads(read(path))


def headings_from(path: str, limit: int = 120) -> list[str]:
    result = []
    for line in read(path).splitlines():
        if line.startswith("#"):
            result.append(line)
        if len(result) >= limit:
            break
    return result


def codeblock(lang: str, content: str) -> list[str]:
    return [f"```{lang}", *content.rstrip().splitlines(), "```"]


def add(lines: list[str], text: str = "") -> None:
    lines.append(text)


def add_block(lines: list[str], block: list[str]) -> None:
    lines.extend(block)


def chapter_intro(lines: list[str], number: int, title: str, purpose: str) -> None:
    add(lines, f"# Глава {number}. {title}")
    add(lines)
    add(lines, f"Назначение главы: {purpose}")
    add(lines)
    add(lines, "Раздел является заготовкой для последующей редакторской переработки в текст магистерской диссертации. Формулировки ориентированы на инженерно-проектную работу, в которой результатом является действующий программный стенд MES-системы RoboPulse.")
    add(lines)


def main() -> None:
    models = extract_models()
    endpoints = extract_endpoints()
    backend_pkg = package_info("backend/package.json")
    frontend_pkg = package_info("frontend/package.json")
    readme_headings = headings_from("README.md", 160)
    android_headings = headings_from("ROBO_PULSE_ANDROID_TERMINAL_APP_PLAN.md", 120)
    req_headings = headings_from("REQUIREMENTS_2026-06-10.md", 120)

    lines: list[str] = []
    add(lines, "# RoboPulse MES: заготовка README для магистерской диссертации")
    add(lines)
    add(lines, "> Рабочий документ для последующей упаковки в магистерскую диссертацию о создании, настройке, эксплуатации и развитии MES-системы RoboPulse.")
    add(lines)
    add(lines, "**Статус документа:** черновик-основа, пригодный для преобразования в текст ВКР после согласования темы, методички кафедры, научной новизны, списка источников и формальных требований конкретного вуза.")
    add(lines)
    add(lines, "**Проект:** `robolabs-mes-demo` / RoboPulse MES.")
    add(lines, "**Рабочий стенд:** `ttm-mini`, URL `http://172.17.16.50:8088/`, HTTPS `https://172.17.16.50:8444/`, backend `http://172.17.16.50:3001/`.")
    add(lines, "**Локальный путь:** `C:/Users/zamoc/Desktop/robolabs-mes-demo`.")
    add(lines, "**Дата подготовки:** 2026-06-17.")
    add(lines)
    add(lines, "---")
    add(lines)

    add(lines, "# Как пользоваться этим документом")
    add(lines)
    usage = [
        "1. Использовать файл как большой конспект и техническую карту проекта.",
        "2. Переносить разделы в диссертацию не механически, а после научной редакции.",
        "3. Сначала согласовать с научным руководителем тему, объект, предмет, цель, задачи и ожидаемую структуру глав.",
        "4. Уточнить требования конкретного вуза: титульный лист, задание, аннотация, объем, шрифт, поля, нумерация, правила ссылок.",
        "5. Для ГОСТ-структуры применять этот документ как базовый каркас, а не как замену кафедральной методички.",
        "6. Для технических разделов сверяться с исходным кодом проекта и фактической конфигурацией стенда.",
        "7. Для эмпирической части добавить скриншоты, таблицы испытаний, результаты smoke/unit-тестов, диаграммы и приложения.",
        "8. Для защиты подготовить отдельную презентацию: проблема, решение, архитектура, демонстрация, результаты, ограничения.",
    ]
    lines.extend(usage)
    add(lines)
    add(lines, "Контрольная цель документа: дать достаточный объем фактического материала, чтобы из него можно было собрать магистерскую диссертацию о проектировании и внедрении MES-системы на малом производственном стенде.")
    add(lines)

    add(lines, "# Нормативная рамка и ГОСТ-ориентированная структура")
    add(lines)
    add(lines, "Для магистерской работы обычно приоритетны методические указания вуза. При отсутствии более жесткой кафедральной структуры практично использовать ГОСТ 7.32-2017 как основу для отчета о научно-исследовательской работе и ГОСТ Р 7.0.100-2018 как основу для библиографического описания источников.")
    add(lines)
    normative = [
        ("ГОСТ 7.32-2017", "отчет о научно-исследовательской работе: структурные элементы, содержание, введение, заключение, приложения"),
        ("ГОСТ Р 7.0.100-2018", "библиографическая запись и библиографическое описание источников"),
        ("Методические указания кафедры", "локальные требования к ВКР магистра: оформление титульного листа, задания, аннотации, нумерации, объема и порядка защиты"),
        ("ГОСТ Р 7.0.5-2008 или локальные правила ссылок", "правила внутритекстовых и подстрочных ссылок, если они требуются вузом"),
        ("ГОСТ 19/34 как дополнительная инженерная база", "может использоваться выборочно для описания программной документации и требований к автоматизированным системам"),
    ]
    add(lines, "| Нормативный ориентир | Как используется в этом документе |")
    add(lines, "|---|---|")
    for name, role in normative:
        add(lines, f"| {name} | {role} |")
    add(lines)
    add(lines, "Рекомендуемый состав магистерской диссертации на основе найденных требований:")
    structure = [
        "Титульный лист.",
        "Задание на выпускную квалификационную работу.",
        "Аннотация / реферат.",
        "Содержание.",
        "Термины и определения.",
        "Перечень сокращений и обозначений.",
        "Введение.",
        "Глава 1. Анализ предметной области и постановка задачи.",
        "Глава 2. Проектирование MES-системы.",
        "Глава 3. Реализация программного комплекса.",
        "Глава 4. Развертывание, испытания и оценка результатов.",
        "Заключение.",
        "Список использованных источников.",
        "Приложения.",
    ]
    for i, item in enumerate(structure, 1):
        add(lines, f"{i}. {item}")
    add(lines)
    add(lines, "Рабочее соответствие ГОСТ 7.32-2017: документ содержит введение, основную часть, заключение, список источников и приложения. Для финальной ВКР необходимо добавить титульные и служебные листы по шаблону вуза.")
    add(lines)

    add(lines, "# Проектная аннотация")
    add(lines)
    add(lines, "В работе рассматривается разработка и внедрение демонстрационной MES-системы RoboPulse для управления производственными заказами, технологическими маршрутами, производственными запусками, операциями по единицам продукции, терминалами рабочих центров и аналитическими панелями диспетчера и директора.")
    add(lines)
    add(lines, "Система построена как web-first приложение с backend на NestJS, ORM Prisma, СУБД PostgreSQL, frontend на React/Vite, reverse proxy на Nginx и Android-оболочкой на Capacitor для терминалов участков. Развертывание выполняется через Docker Compose, а эксплуатационный стенд перенесен на сервер `ttm-mini`.")
    add(lines)
    add(lines, "Практический результат работы: действующий стенд MES, включающий импорт заказов, справочники, техпроцессы, запуск партий, терминальные операции, групповое выполнение операций, QR/PIN вход терминалов, учет времени, события, архив и dashboard-отчетность.")
    add(lines)

    add(lines, "# Термины и сокращения")
    add(lines)
    terms = {
        "MES": "Manufacturing Execution System, система управления производственными процессами на уровне исполнения.",
        "RoboPulse": "рабочее название разработанной MES-системы.",
        "ВКР": "выпускная квалификационная работа.",
        "API": "программный интерфейс взаимодействия frontend, Android shell и backend.",
        "DTO": "объект передачи данных между клиентом и сервером.",
        "ORM": "объектно-реляционное отображение; в проекте используется Prisma.",
        "Prisma schema": "декларативное описание структуры данных и связей PostgreSQL.",
        "Production run": "производственный запуск номенклатуры или заказа.",
        "Production unit": "конкретная единица продукции внутри запуска.",
        "Unit operation": "операция над конкретной единицей продукции.",
        "Lease": "временная блокировка выбранной операции терминалом.",
        "Heartbeat": "периодическое продление lease выбранной операции.",
        "Work center": "рабочий центр или производственный участок.",
        "Terminal": "рабочее место оператора участка.",
        "Dispatcher": "роль пользователя для планирования и управления производством.",
        "Director": "роль пользователя для агрегированного мониторинга.",
        "Capacitor": "runtime для упаковки web-приложения в Android-приложение.",
        "Docker Compose": "средство декларативного запуска нескольких контейнеров проекта.",
    }
    add(lines, "| Термин | Определение |")
    add(lines, "|---|---|")
    for term, definition in terms.items():
        add(lines, f"| {term} | {definition} |")
    add(lines)

    add(lines, "# Введение")
    add(lines)
    add(lines, "## Актуальность")
    add(lines)
    add(lines, "Производственные предприятия, выполняющие заказы с многооперационными технологическими маршрутами, нуждаются в инструменте оперативного управления исполнением. Табличный учет и ручная передача статусов приводят к задержкам, потере прозрачности, конфликтам при распределении операций и недостаточной управляемости сменной загрузки. MES-система закрывает слой между планированием и фактическим исполнением: фиксирует заказы, операции, рабочие центры, исполнителей, состояние производственных единиц, события и отклонения.")
    add(lines)
    add(lines, "Актуальность проекта RoboPulse связана с необходимостью быстро развернуть демонстрационный, но функционально насыщенный MES-стенд, пригодный для проверки сценариев: импорт заказа, запуск производства, выдача операций на участки, терминальное выполнение, учет статусов, групповое выполнение операций, просмотр архива и руководительская аналитика.")
    add(lines)
    add(lines, "## Объект исследования")
    add(lines, "Объектом исследования является процесс цифрового управления производственными заказами и операциями на уровне исполнения.")
    add(lines)
    add(lines, "## Предмет исследования")
    add(lines, "Предметом исследования является архитектура и программная реализация MES-системы для учета заказов, техпроцессов, производственных запусков и терминальной работы участков.")
    add(lines)
    add(lines, "## Цель работы")
    add(lines, "Цель работы: разработать, настроить и развернуть MES-систему RoboPulse, обеспечивающую сквозной сценарий управления производственным заказом от импорта и планирования до выполнения операций на терминалах и анализа результатов.")
    add(lines)
    add(lines, "## Задачи работы")
    tasks = [
        "проанализировать предметную область MES и требования к демонстрационному производственному стенду;",
        "сформулировать функциональные и нефункциональные требования к системе;",
        "спроектировать архитектуру backend, frontend, базы данных и мобильного терминала;",
        "реализовать доменную модель заказов, операций, производственных запусков, единиц продукции и событий;",
        "реализовать роли пользователей, авторизацию, PIN/QR-вход терминалов;",
        "реализовать клиентские рабочие места диспетчера, оператора, технолога и директора;",
        "обеспечить загрузку и миграцию данных, seed-инициализацию, backup/restore;",
        "упаковать систему в Docker Compose и развернуть на сервере `ttm-mini`; ",
        "подготовить Android-приложение RoboPulse Terminal с адресом стенда по умолчанию;",
        "провести smoke/unit-проверки и описать ограничения текущей версии.",
    ]
    for task in tasks:
        add(lines, f"- {task}")
    add(lines)
    add(lines, "## Научная и практическая значимость")
    add(lines, "Научная значимость может быть сформулирована через адаптацию принципов MES к малому производственному стенду, где важно совместить простоту внедрения, web-first архитектуру, прозрачность данных и возможность терминального выполнения операций без тяжелой промышленной инфраструктуры.")
    add(lines, "Практическая значимость заключается в создании работающего программного комплекса, который можно демонстрировать, развивать и использовать как основу для дальнейшей промышленной версии.")
    add(lines)
    add(lines, "## Положения, выносимые на защиту")
    defenses = [
        "Архитектура web-first MES позволяет быстро создать переносимый стенд с backend, frontend, СУБД и Android-терминалом без разработки отдельного нативного клиента с нуля.",
        "Нормализованная модель production runs, units и unit operations повышает точность учета поштучного исполнения и позволяет реализовать групповые операции.",
        "Lease-механизм выбора операции на терминале снижает риск конкурентного выполнения одной операции несколькими физическими устройствами.",
        "Docker Compose и регламент backup/restore делают стенд воспроизводимым и переносимым между локальной машиной и сервером `ttm-mini`.",
        "Единая React/Vite frontend-кодовая база может использоваться и как web-интерфейс, и как содержимое Android shell через Capacitor.",
    ]
    for item in defenses:
        add(lines, f"- {item}")
    add(lines)

    chapter_intro(lines, 1, "Анализ предметной области и постановка задачи", "показать, какие производственные проблемы решает MES-система и какие требования возникли в проекте RoboPulse.")
    add(lines, "## 1.1 Предметная область MES")
    add(lines)
    add(lines, "MES-система находится между уровнем планирования и уровнем физического выполнения. В рамках RoboPulse акцент сделан не на полной ERP-интеграции, а на исполнении заказов и операций: система должна знать, какие изделия необходимо произвести, по какому технологическому маршруту, на каких участках, в каком количестве, с какими статусами и событиями.")
    add(lines)
    add(lines, "## 1.2 Типовые проблемы, выявленные для демонстрационного стенда")
    problems = [
        "ручной перенос заказов и статусов между таблицами и рабочими местами;",
        "невозможность увидеть фактическую очередь операций по участкам;",
        "отсутствие поштучного представления производственного запуска;",
        "сложность группового выполнения однотипных операций;",
        "конфликты при работе нескольких терминалов участка;",
        "отсутствие единого архива завершенных заказов и запусков;",
        "недостаточная прозрачность сменной загрузки и производительности;",
        "необходимость быстро перенести стенд с локального ПК на отдельный мини-сервер.",
    ]
    for p in problems:
        add(lines, f"- {p}")
    add(lines)
    add(lines, "## 1.3 Пользовательские роли")
    roles = [
        ("Администратор", "настройка пользователей, справочников, сервисные операции."),
        ("Диспетчер", "импорт заказов, запуск производства, контроль плана и очередей."),
        ("Технолог", "ведение справочников операций и техпроцессов номенклатуры."),
        ("Оператор", "работа через терминал участка, выполнение операций."),
        ("Директор", "просмотр dashboard-показателей и агрегированной аналитики."),
        ("Terminal-only user", "специальная учетная запись участка для строгого терминального интерфейса."),
    ]
    add(lines, "| Роль | Назначение |")
    add(lines, "|---|---|")
    for role, purpose in roles:
        add(lines, f"| {role} | {purpose} |")
    add(lines)
    add(lines, "## 1.4 Требования из проектных документов")
    add(lines)
    add(lines, "В проекте присутствуют локальные документы требований и планов. Они образуют историю проектирования и могут быть использованы в диссертации как внутренние проектные материалы.")
    add(lines)
    for title, heads in [
        ("README.md", readme_headings[:30]),
        ("REQUIREMENTS_2026-06-10.md", req_headings[:30]),
        ("ROBO_PULSE_ANDROID_TERMINAL_APP_PLAN.md", android_headings[:30]),
    ]:
        add(lines, f"### Материал `{title}`")
        for h in heads:
            add(lines, f"- {h}")
        add(lines)

    chapter_intro(lines, 2, "Проектирование архитектуры RoboPulse MES", "описать выбранную архитектуру, компоненты, модель данных, API и ключевые инженерные решения.")
    add(lines, "## 2.1 Общая архитектура")
    add(lines)
    add(lines, "RoboPulse реализована как трехзвенная web-система: клиентский уровень React/Vite, серверный уровень NestJS и уровень данных PostgreSQL. Nginx обслуживает frontend и проксирует API-запросы, Docker Compose связывает сервисы в единую воспроизводимую среду.")
    add(lines)
    add_block(lines, codeblock("mermaid", """
flowchart LR
    User[Пользователь web UI] --> Nginx[Frontend Nginx]
    Android[Android RoboPulse Terminal] --> Nginx
    Nginx --> React[React/Vite SPA assets]
    Nginx --> API[NestJS API]
    API --> Prisma[Prisma Client]
    Prisma --> PG[(PostgreSQL)]
    API --> Uploads[(uploads volume)]
    API --> Runtime[(runtime data volume)]
"""))
    add(lines)
    add(lines, "## 2.2 Backend")
    add(lines)
    add(lines, "Backend построен на NestJS. По актуальной документации NestJS приложение собирается из модулей, controllers и providers; guards применяются для защиты маршрутов, а validation pipes используются для проверки входных данных. В RoboPulse центральный controller связывает HTTP API с доменными сервисами, а `MesService` содержит большую часть бизнес-логики.")
    add(lines)
    add(lines, "SocratiCode dependency graph показывает, что `backend/src/app.controller.ts` импортирует auth-декораторы, guards и сервисы dashboard, nomenclature, process graph, production, reference и terminal. `backend/src/mes.service.ts` импортируется большинством доменных сервисов и является центральным слоем.")
    add(lines)
    add(lines, "### Backend scripts")
    add(lines, "| Скрипт | Назначение |")
    add(lines, "|---|---|")
    for script, cmd in backend_pkg["scripts"].items():
        add(lines, f"| `{script}` | `{cmd}` |")
    add(lines)
    add(lines, "### Backend dependencies")
    add(lines, "| Пакет | Роль в проекте |")
    add(lines, "|---|---|")
    dep_roles = {
        "@nestjs/common": "базовые декораторы, guards, pipes, exceptions",
        "@nestjs/core": "ядро NestJS runtime",
        "@nestjs/platform-express": "HTTP-платформа Express для NestJS",
        "@prisma/client": "типобезопасный доступ к PostgreSQL",
        "class-transformer": "преобразование DTO",
        "class-validator": "валидация DTO",
        "multer": "загрузка Excel-файлов заказов",
        "xlsx": "разбор Excel-файлов",
        "typescript": "типизация и сборка",
    }
    for dep, version in backend_pkg["dependencies"].items():
        add(lines, f"| `{dep}` `{version}` | {dep_roles.get(dep, 'служебная зависимость backend')} |")
    add(lines)

    add(lines, "## 2.3 Frontend")
    add(lines)
    add(lines, "Frontend реализован как React/Vite SPA. Основной файл `frontend/src/main.tsx` собирает маршрутизацию рабочих мест, экраны входа, производственный план, справочники, архив, отчеты и dashboard. Терминальное рабочее место вынесено в `frontend/src/features/terminal/TerminalWorkspace.tsx`.")
    add(lines)
    add(lines, "### Frontend scripts")
    add(lines, "| Скрипт | Назначение |")
    add(lines, "|---|---|")
    for script, cmd in frontend_pkg["scripts"].items():
        add(lines, f"| `{script}` | `{cmd}` |")
    add(lines)
    add(lines, "### Frontend dependencies")
    add(lines, "| Пакет | Роль в проекте |")
    add(lines, "|---|---|")
    for dep, version in frontend_pkg["dependencies"].items():
        role = {
            "react": "компонентная модель пользовательского интерфейса",
            "react-dom": "рендеринг React в DOM",
            "vite": "сборка и dev-server frontend",
            "@vitejs/plugin-react": "интеграция React с Vite",
            "@capacitor/core": "runtime API Capacitor",
            "@capacitor/android": "Android-платформа Capacitor",
            "@zxing/browser": "сканирование QR-кодов через браузер/WebView",
            "typescript": "типизация frontend-кода",
        }.get(dep, "служебная зависимость frontend")
        add(lines, f"| `{dep}` `{version}` | {role} |")
    add(lines)

    add(lines, "## 2.4 Database и Prisma")
    add(lines)
    add(lines, "Prisma используется как ORM и как декларативная модель данных. По актуальной документации Prisma schema является источником истины для модели данных, Prisma Migrate генерирует SQL-миграции, а `prisma generate` создает Prisma Client для типобезопасного доступа к базе.")
    add(lines)
    add(lines, "Проект использует PostgreSQL. На уровне схемы выделены заказы, операции заказов, пользователи, справочники, техпроцессы номенклатуры, производственные запуски, единицы продукции, unit operations, события, рабочие центры, смены, календарь, причины отклонений и аудит.")
    add(lines)
    add(lines, "### Модели и перечисления Prisma")
    add(lines, "| Тип | Имя | Ключевые поля по схеме |")
    add(lines, "|---|---|---|")
    for item in models:
        add(lines, f"| {item['kind']} | `{item['name']}` | {item['fields']} |")
    add(lines)

    add(lines, "## 2.5 Android-приложение")
    add(lines)
    add(lines, "Android-приложение создано как Capacitor shell поверх существующего frontend. По документации Capacitor workflow состоит из сборки web-кода, синхронизации web bundle в native-проект и сборки Android binary. В проекте это отражено в скриптах `cap:sync` и `android:build:debug`.")
    add(lines)
    add(lines, "Текущий адрес сервера по умолчанию для Android: `https://172.17.16.50:8444/`. Старые сохраненные адреса автоматически мигрируют на новый адрес.")
    add(lines)
    add(lines, "## 2.6 Deployment architecture")
    add(lines)
    add(lines, "Docker Compose описывает три основных сервиса: PostgreSQL, backend и frontend. Контейнеры объединены сетью `robolabs_mes_net`, данные PostgreSQL и runtime-файлы вынесены в volumes.")
    add(lines)
    add_block(lines, codeblock("yaml", read("docker-compose.yml")))
    add(lines)

    chapter_intro(lines, 3, "Реализация программного комплекса", "описать реализованные подсистемы, API, рабочие места, логику операций и особенности кода.")
    add(lines, "## 3.1 Каталог HTTP API")
    add(lines)
    add(lines, "Ниже приведен автоматически извлеченный каталог endpoint-ов из `backend/src/app.controller.ts`. В финальной диссертации его можно сократить до ключевых групп, а полный каталог вынести в приложение.")
    add(lines)
    for idx, ep in enumerate(endpoints, 1):
        add(lines, f"### API-{idx:03d}. `{ep['method']} {ep['path']}`")
        add(lines, f"- Handler: `{ep['handler']}`.")
        add(lines, f"- Roles: `{ep['roles']}`.")
        add(lines, f"- Guards: `{ep['guards']}`.")
        add(lines, "- Назначение в диссертации: описать как часть REST API MES-системы.")
        add(lines, "- Входные данные: см. DTO в `backend/src/dto/mes.dto.ts` и тело запроса конкретного метода.")
        add(lines, "- Выходные данные: JSON-ответ, используемый frontend или Android shell.")
        add(lines, "- Ошибки: авторизация, права, отсутствие сущности, конфликт статуса, ошибка валидации.")
        add(lines, "- Тестирование: добавить curl/Playwright/API smoke для критичных endpoint-ов.")
        add(lines)

    add(lines, "## 3.2 Доменная логика MesService")
    add(lines)
    add(lines, "Файл `backend/src/mes.service.ts` содержит методы импорта заказов, ведения справочников, запуска производства, построения плана, терминальной работы, групповых действий, отчетов, dashboard и audit events. В текущей архитектуре это центральная точка бизнес-логики, а сервисы `dashboard`, `production`, `terminal`, `reference`, `nomenclature` делегируют операции в `MesService`.")
    add(lines)
    mes_groups = [
        ("Импорт и заказы", ["importOrdersExcel", "orders", "order", "setOperationStatus", "archiveOrder"]),
        ("Справочники", ["sections", "referenceData", "addReferenceSection", "addReferenceOperation", "workCenters"]),
        ("Смены и KPI", ["createShift", "closeShift", "sectionShiftReport", "workerReport"]),
        ("Номенклатура", ["nomenclature", "nomenclatureProcess", "saveNomenclatureProcess"]),
        ("Production runs", ["productionRuns", "productionPlan", "launchProduction", "launchProductionBatch", "productionRun"]),
        ("Unit operations", ["productionUnitOperationAction", "terminalProductionUnitOperationAction", "productionBulkUnitOperationAction"]),
        ("Terminal lease", ["selectProductionUnitOperation", "heartbeatProductionUnitOperation", "releaseProductionUnitOperationSelection"]),
        ("Dashboard", ["dashboardSummary", "dispatchDashboard", "directorDashboard"]),
        ("Audit and events", ["audit", "recordProductionOperationEvents", "events"]),
    ]
    for group, methods in mes_groups:
        add(lines, f"### {group}")
        for method in methods:
            add(lines, f"- `{method}`: описать входные параметры, изменяемые сущности, события, риски конкурентного доступа.")
        add(lines)

    add(lines, "## 3.3 Рабочее место диспетчера")
    dispatcher_points = [
        "просмотр производственного плана;",
        "запуск производства по заказу или номенклатуре;",
        "создание партии запусков;",
        "контроль unit operations;",
        "освобождение и завершение dispatch-этапов;",
        "просмотр событий и загрузки участков;",
        "работа с архивом завершенных заказов и запусков.",
    ]
    for p in dispatcher_points:
        add(lines, f"- {p}")
    add(lines)

    add(lines, "## 3.4 Рабочее место терминала участка")
    terminal_points = [
        "выбор terminal-only учетной записи по PIN;",
        "QR-вход по строке `robopulse://terminal/<token>`;",
        "строгий terminal workspace без доступа к диспетчерским и директорским экранам;",
        "очередь операций участка;",
        "локальный клиентский фильтр по операции, статусу, заказу, изделию и групповым операциям;",
        "выбор операции с lease-блокировкой;",
        "heartbeat продления выбранной операции;",
        "release selection при уходе с операции;",
        "start/pause/resume/complete;",
        "групповые действия над совместимыми unit operations;",
        "лента последних событий участка.",
    ]
    for p in terminal_points:
        add(lines, f"- {p}")
    add(lines)
    add(lines, "### Lease-семантика терминала")
    lease_steps = [
        "Оператор открывает очередь участка.",
        "Frontend выбирает строку production unit operation.",
        "Backend проверяет статус, зависимости, отсутствие актуального чужого lock.",
        "Backend выдает `lockToken`, `lockVersion`, `lockExpiresAt`.",
        "Frontend сохраняет selection state.",
        "Frontend запускает heartbeat с периодом меньше TTL.",
        "Если heartbeat не проходит, frontend снимает выбор и обновляет очередь.",
        "При `start` frontend передает `lockToken` и ожидаемую версию.",
        "Backend атомарно переводит operation из `queued` в `work`.",
        "Истекшие lease не должны навсегда блокировать операцию.",
    ]
    for i, p in enumerate(lease_steps, 1):
        add(lines, f"{i}. {p}")
    add(lines)

    add(lines, "## 3.5 Технологический процесс и номенклатура")
    add(lines, "Подсистема номенклатуры хранит технологические процессы изделий. Важное отличие проекта: production run строится на основе процесса номенклатуры и разворачивается в набор единиц продукции и операций по каждой единице. Это позволяет не только видеть общий заказ, но и управлять поштучным исполнением.")
    add(lines)
    add(lines, "## 3.6 Отчеты, смены и директорский dashboard")
    add(lines, "Система включает смены, рабочие центры, производственный календарь, причины отклонений, отчеты по участку и сотруднику, а также директорский dashboard. Эти функции нужны для перехода от простой фиксации статусов к управленческой аналитике.")
    add(lines)

    chapter_intro(lines, 4, "Развертывание, перенос, эксплуатация и испытания", "описать воспроизводимость стенда, перенос на сервер, импорт данных, backup/restore и проверку работоспособности.")
    add(lines, "## 4.1 Локальный запуск")
    add_block(lines, codeblock("powershell", """
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend frontend postgres
"""))
    add(lines)
    add(lines, "## 4.2 Prisma workflow")
    add_block(lines, codeblock("powershell", """
cd backend
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd run test:unit
"""))
    add(lines)
    add(lines, "В Docker-режиме миграции применяются командой:")
    add_block(lines, codeblock("bash", "docker compose exec backend npx prisma migrate deploy"))
    add(lines)
    add(lines, "## 4.3 Перенос на `ttm-mini`")
    add(lines, "Фактический стенд был развернут в каталоге `/home/admin_ttm/robolabs-mes-demo`, так как запись в `/opt` требовала sudo. Порты стенда: frontend HTTP `8088`, frontend HTTPS `8444`, backend host port `3001`, внутренний backend port `3000`.")
    add(lines)
    ttm_steps = [
        "проверка SSH-доступа `ttm-mini`;",
        "подготовка архива проекта без `node_modules`, dist, test-results и локальных временных файлов;",
        "копирование проекта на сервер;",
        "создание серверного `.env`;",
        "сборка Docker images;",
        "инициализация PostgreSQL;",
        "применение Prisma schema/migrations;",
        "seed-инициализация справочников;",
        "загрузка данных с локального ПК;",
        "создание backup до и после импорта;",
        "проверка `/api/health` и входа `dispatcher.demo`.",
    ]
    for i, step in enumerate(ttm_steps, 1):
        add(lines, f"{i}. {step}")
    add(lines)
    add(lines, "## 4.4 Перенос данных")
    add(lines, "Из локальной БД были перенесены заказы, статусы, production runs, production unit operations, справочники и номенклатура. Для сохранения состояния миграций удаленной схемы перенос выполнялся data-only dump без `_prisma_migrations`.")
    add(lines)
    add(lines, "Контрольные счетчики после импорта на `ttm-mini`:")
    counts = [
        ("Order", "1"),
        ("Order archived", "1"),
        ("OrderOperation", "12, все done"),
        ("ProductionRun", "7"),
        ("ProductionUnitOperation", "done:449, paused:1, queued:671, work:5"),
        ("NomenclatureProcessRecord", "5"),
        ("RouteTemplate", "1"),
        ("RouteOperation", "13"),
        ("ReferenceSection", "33"),
        ("ReferenceOperation", "81"),
        ("Person", "25"),
        ("AppUser", "36"),
        ("_prisma_migrations", "12 примененных миграций"),
    ]
    add(lines, "| Сущность | Состояние после переноса |")
    add(lines, "|---|---|")
    for name, value in counts:
        add(lines, f"| {name} | {value} |")
    add(lines)
    add(lines, "## 4.5 Backup/restore")
    add_block(lines, codeblock("bash", """
BACKUP_TS=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
docker compose exec -T postgres pg_dump -U robolabs -d robolabs_mes -Fc -f /tmp/robolabs_mes_$BACKUP_TS.dump
docker cp robolabs-mes-postgres:/tmp/robolabs_mes_$BACKUP_TS.dump backups/robolabs_mes_$BACKUP_TS.dump
ls -lh backups
"""))
    add(lines)
    add(lines, "## 4.6 Android build")
    add_block(lines, codeblock("powershell", """
cd frontend
npm.cmd run cap:sync
cd android
.\\gradlew.bat assembleDebug
"""))
    add(lines)
    add(lines, "Финальный debug APK находится в `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.")
    add(lines)
    add(lines, "## 4.7 Проверки")
    checks = [
        "`npm.cmd run prisma:generate` в backend;",
        "`npm.cmd run build` в backend;",
        "`npm.cmd run test:unit` в backend;",
        "`npm.cmd run build` во frontend;",
        "`npm.cmd run cap:sync`; ",
        "`gradlew.bat assembleDebug`; ",
        "`docker compose config`; ",
        "HTTP health `http://172.17.16.50:8088/api/health`; ",
        "backend health `http://172.17.16.50:3001/api/health`; ",
        "HTTPS frontend `https://172.17.16.50:8444`; ",
        "вход диспетчера `dispatcher.demo / dispatcher`; ",
        "проверка данных БД после импорта.",
    ]
    for item in checks:
        add(lines, f"- {item}")
    add(lines)

    add(lines, "# Заключение")
    add(lines)
    add(lines, "В результате проекта создана и развернута MES-система RoboPulse, обеспечивающая управление заказами, технологическими процессами, производственными запусками, операциями по единицам продукции, терминальной работой участков и аналитическими представлениями для диспетчера и директора. Система демонстрирует возможность построения web-first MES-стенда на современном TypeScript-стеке с PostgreSQL и Docker Compose.")
    add(lines)
    add(lines, "Ключевые результаты:")
    results = [
        "разработана архитектура backend/frontend/database/mobile shell;",
        "реализована доменная модель заказов, operations, production runs, units и events;",
        "создан REST API с ролями и guards;",
        "реализованы рабочие места диспетчера, оператора, технолога и директора;",
        "реализован Android terminal app на Capacitor;",
        "внедрена блокировка выбора операций через lease/heartbeat;",
        "реализованы backup/restore и перенос данных;",
        "стенд перенесен на сервер `ttm-mini` и проверен.",
    ]
    for r in results:
        add(lines, f"- {r}")
    add(lines)
    add(lines, "Ограничения текущей версии:")
    limitations = [
        "часть production-сценариев пока сохраняет совместимость с legacy JSON-историей;",
        "политики безопасности и production-grade управление правами требуют дальнейшей формализации;",
        "release-сборка Android требует отдельного keystore и регламента подписания;",
        "self-signed HTTPS подходит для demo-стенда, но для production требуется нормальный сертификат;",
        "нужно расширить автоматические тесты для полного сценария импорт → запуск → терминал → отчетность;",
        "необходимо подготовить кафедрально корректную библиографию и оформить ссылки по требованиям вуза.",
    ]
    for item in limitations:
        add(lines, f"- {item}")
    add(lines)

    add(lines, "# Список использованных источников и материалов")
    add(lines)
    sources = [
        ("ГОСТ 7.32-2017. Отчет о научно-исследовательской работе. Структура и правила оформления.", "https://docs.cntd.ru/document/1200157208/titles/7EG0KJ"),
        ("PDF ГОСТ 7.32-2017, зеркало МГУ.", "https://cs.msu.ru/sites/cmc/files/docs/2021-11gost_7.32-2017.pdf"),
        ("ГОСТ Р 7.0.100-2018. Библиографическая запись. Библиографическое описание.", "https://docs.cntd.ru/document/1200161674"),
        ("PDF ГОСТ Р 7.0.100-2018, ifap.ru.", "https://ifap.ru/library/gost/701002018.pdf"),
        ("NestJS documentation.", "https://docs.nestjs.com/"),
        ("Prisma ORM documentation.", "https://www.prisma.io/docs/orm"),
        ("Capacitor documentation.", "https://capacitorjs.com/docs"),
        ("React documentation.", "https://react.dev/"),
        ("Vite documentation.", "https://vite.dev/"),
        ("Docker Compose documentation.", "https://docs.docker.com/compose/"),
        ("PostgreSQL documentation.", "https://www.postgresql.org/docs/"),
        ("Внутренний проектный README RoboPulse.", "./README.md"),
        ("План Android-приложения RoboPulse Terminal.", "./ROBO_PULSE_ANDROID_TERMINAL_APP_PLAN.md"),
        ("Требования по итогам совещания 10.06.2026.", "./REQUIREMENTS_2026-06-10.md"),
    ]
    for i, (title, url) in enumerate(sources, 1):
        add(lines, f"{i}. {title} URL: {url}.")
    add(lines)

    add(lines, "# Приложение А. Каталог моделей данных")
    add(lines)
    for idx, item in enumerate(models, 1):
        add(lines, f"## A.{idx}. {item['kind']} `{item['name']}`")
        add(lines, f"- Тип схемы: `{item['kind']}`.")
        add(lines, f"- Имя: `{item['name']}`.")
        add(lines, f"- Ключевые поля: {item['fields'] or 'уточнить по schema.prisma'}.")
        add(lines, "- Назначение: описать роль сущности в доменной модели MES.")
        add(lines, "- Связи: уточнить по relation-полям Prisma schema.")
        add(lines, "- Ограничения: уникальные индексы, внешние ключи и бизнес-инварианты описать в финальной версии.")
        add(lines, "- CRUD/API: связать с endpoint-ами из приложения Б.")
        add(lines, "- Использование во frontend: связать с типами из `frontend/src/api/types.ts`.")
        add(lines, "- Использование в тестах: добавить ссылки на unit/smoke-тесты при подготовке финальной ВКР.")
        add(lines, "- Риски данных: описать каскадные удаления, архивирование и backup.")
        add(lines)

    add(lines, "# Приложение Б. Расширенный каталог API")
    add(lines)
    for idx, ep in enumerate(endpoints, 1):
        add(lines, f"## Б.{idx}. `{ep['method']} {ep['path']}`")
        add(lines, f"- HTTP method: `{ep['method']}`.")
        add(lines, f"- Path: `{ep['path']}`.")
        add(lines, f"- Controller handler: `{ep['handler']}`.")
        add(lines, f"- Roles: `{ep['roles']}`.")
        add(lines, f"- Guards: `{ep['guards']}`.")
        add(lines, "- Категория: определить по первому сегменту path.")
        add(lines, "- Business capability: зафиксировать в финальной API-таблице.")
        add(lines, "- Request DTO: сверить с `backend/src/dto/mes.dto.ts`.")
        add(lines, "- Response schema: описать по фактическому JSON-ответу.")
        add(lines, "- Frontend caller: найти через `rg` по path или handler.")
        add(lines, "- Test case: добавить позитивный и негативный сценарий.")
        add(lines, "- Security note: проверить права роли и отсутствие лишнего доступа.")
        add(lines)

    add(lines, "# Приложение В. Сценарии использования")
    scenarios = [
        ("Импорт Excel-заказа", "диспетчер загружает файл, backend разбирает строки, создает заказ и операции."),
        ("Запуск производства по заказу", "диспетчер выбирает заказ и инициирует production run."),
        ("Партия запусков", "диспетчер выбирает несколько позиций и создает batch."),
        ("Работа терминала по PIN", "оператор выбирает терминал участка и вводит PIN."),
        ("Работа терминала по QR", "оператор сканирует QR-строку и попадает в terminal workspace."),
        ("Выбор операции", "терминал получает lease и блокирует queued operation."),
        ("Потеря lease", "heartbeat не продлен, операция освобождается для другого терминала."),
        ("Групповая операция", "оператор выбирает несколько совместимых unit operations и запускает bulk action."),
        ("Пауза операции", "оператор фиксирует временную остановку работы."),
        ("Завершение операции", "оператор переводит operation в done и открывает зависимые операции."),
        ("Архив заказа", "после завершения всех операций заказ переносится в архив."),
        ("Просмотр директорского dashboard", "руководитель видит агрегированные KPI и состояние производства."),
        ("Backup перед обновлением", "администратор создает dump PostgreSQL перед миграцией."),
        ("Restore после сбоя", "администратор восстанавливает dump и проверяет health endpoints."),
        ("Обновление Android APK", "новый APK получает дефолтный server URL и мигрирует старый сохраненный адрес."),
    ]
    for idx, (name, desc) in enumerate(scenarios, 1):
        add(lines, f"## В.{idx}. {name}")
        add(lines, f"- Краткое описание: {desc}")
        add(lines, "- Актор: указать роль пользователя.")
        add(lines, "- Предусловия: пользователь авторизован, данные существуют, сервисы запущены.")
        add(lines, "- Основной поток: описать пошагово в финальной версии.")
        add(lines, "- Альтернативный поток: ошибка авторизации, конфликт статуса, отсутствие данных.")
        add(lines, "- Задействованные endpoint-ы: связать с приложением Б.")
        add(lines, "- Задействованные модели БД: связать с приложением А.")
        add(lines, "- UI-экран: указать компонент frontend.")
        add(lines, "- Проверка результата: статус, событие, запись в БД, обновление dashboard.")
        add(lines, "- Риск: конкурентный доступ, неконсистентность данных, сетевой сбой.")
        add(lines)

    add(lines, "# Приложение Г. План развития")
    roadmap = [
        "Полностью убрать зависимость от legacy JSON для production runs.",
        "Разделить `MesService` на более мелкие bounded-context сервисы.",
        "Расширить e2e-тестирование сценариев терминала.",
        "Добавить OpenAPI/Swagger спецификацию.",
        "Добавить production-grade authentication policy.",
        "Настроить release signing Android APK.",
        "Добавить нормальный TLS-сертификат или внутренний CA-регламент.",
        "Добавить автоматический backup по cron/systemd timer.",
        "Добавить мониторинг контейнеров и алерты.",
        "Подготовить импорт из 1С/ERP или интеграционный слой.",
        "Расширить аналитику KPI и отклонений.",
        "Сформировать комплект пользовательской документации.",
    ]
    for idx, item in enumerate(roadmap, 1):
        add(lines, f"## Г.{idx}. {item}")
        add(lines, "- Обоснование: описать, какой риск или ограничение закрывает доработка.")
        add(lines, "- Текущее состояние: зафиксировать по коду и стенду.")
        add(lines, "- Требуемые изменения backend: описать новые service/API/migration.")
        add(lines, "- Требуемые изменения frontend: описать новые экраны/состояния.")
        add(lines, "- Требуемые изменения DevOps: описать deployment/backup/monitoring.")
        add(lines, "- Критерии приемки: сформулировать измеримо.")
        add(lines)

    add(lines, "# Приложение Д. Черновик содержания будущей диссертации")
    for idx in range(1, 81):
        add(lines, f"## Д.{idx}. Заготовка подраздела {idx}")
        add(lines, f"- Рабочий тезис: связать подраздел {idx} с архитектурой, реализацией, эксплуатацией или проверкой RoboPulse.")
        add(lines, "- Материал из проекта: указать файлы, endpoint-ы, модели, скриншоты и тесты.")
        add(lines, "- Научная формулировка: переписать технический факт как исследовательский результат.")
        add(lines, "- Иллюстрация: добавить таблицу, диаграмму или листинг.")
        add(lines, "- Вывод: сформулировать 2-3 предложения для конца подраздела.")
        add(lines)

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
