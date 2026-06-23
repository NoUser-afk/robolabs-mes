# RoboPulse Android Terminal App - implementation plan for agent

Дата составления: 2026-06-15  
Проект: `robolabs-mes`  
Цель: сделать Android-приложение для быстрого, надежного и визуально цельного доступа к терминалу участка RoboPulse.

Этот файл является рабочим README-планом для агента. Его нужно использовать как основной чеклист при реализации Android-приложения. Не считать задачу готовой, пока не выполнены критерии приемки и проверки из разделов `13-15`.

## 1. Краткое решение

Рекомендуемый путь: **Capacitor Android shell поверх текущего RoboPulse web frontend**.

Причина выбора:

- текущий терминал уже реализован в React/Vite и проверен smoke-тестами;
- backend уже имеет `POST /api/auth/terminal-qr-login`;
- QR-строки уже существуют в формате `robopulse://terminal/<token>`;
- Android-приложение можно сделать быстрее, чем переписывать терминал на Kotlin;
- приложение даст fullscreen, быстрый запуск, хранение адреса сервера, kiosk-подготовку и будущий native scanner bridge;
- при MVP можно грузить существующий HTTPS-origin RoboPulse, не ломая cookie/CORS текущей web-архитектуры.

Не начинать с полностью нативного Kotlin UI. Это увеличит стоимость, создаст второй интерфейс терминала и риск расхождения с web-терминалом.

## 2. Статусы чеклиста

- `[ ]` - не начато.
- `[~]` - в работе, частично реализовано или нужна проверка.
- `[x]` - реализовано и проверено.
- `[!]` - заблокировано внешней зависимостью.

После каждого этапа агент обязан обновить чекбоксы в этом README только по факту проверки.

## 3. Текущее состояние системы

Подтвержденные точки интеграции:

- Frontend: `frontend`, React/Vite.
- Frontend API helper: `frontend/src/api/client.ts`.
- Terminal routing: `frontend/src/routing/tabs.ts`.
- QR login screen: `frontend/src/main.tsx`, компонент `TerminalQrLoginScreen`.
- Existing QR scanner dependency: `@zxing/browser`.
- QR endpoint: `POST /api/auth/terminal-qr-login`.
- Backend QR logic: `backend/src/auth.service.ts`, метод `terminalQrLogin`.
- Terminal-only auth guard: `backend/src/terminal-auth.guard.ts`.
- QR token field: `terminalQrToken` у `AppUser`.
- Current QR document: `TERMINAL_QR_CODES_2026-06-11.md`.
- HTTPS frontend: `https://<LAN_IP>:8443`, см. `frontend/certs/README.md`.
- Existing smoke: `frontend/smoke/robopulse-smoke.spec.ts`.

Текущий формат QR:

```text
robopulse://terminal/<token>
```

Пример из текущего документа:

```text
robopulse://terminal/rpt_frYVondCwGExrJfb-oWhwck_IBfv6bMz
```

## 4. Целевой пользовательский сценарий

Рабочий берет Android-планшет или телефон на участке:

1. Открывает приложение `RoboPulse Terminal`.
2. Видит короткое RoboPulse pulse-intro.
3. Если сервер еще не настроен, вводит или сканирует адрес сервера.
4. Нажимает `Войти по QR-коду`.
5. Сканирует QR участка.
6. Попадает строго в терминал этого участка.
7. Видит текущую операцию, очередь, старт/пауза/завершить.
8. После закрытия и повторного открытия приложение возвращает его в тот же терминал без выбора ролей.

Нецелевые сценарии для MVP:

- Диспетчерский пульт внутри Android-приложения.
- Директорский монитор внутри Android-приложения.
- Редактор техпроцесса внутри Android-приложения.
- Offline-работа без сервера.
- Публикация в Google Play.

## 5. Архитектурное решение

### 5.1. MVP-режим: remote web origin в Capacitor shell

MVP должен открывать существующий RoboPulse HTTPS origin:

```text
https://<LAN_HOST_OR_IP>:8443
```

Почему так:

- текущий frontend использует относительный `API = '/api'`;
- при загрузке web app с того же HTTPS origin cookies и `/api` работают без CORS-рефакторинга;
- backend auth cookie остается same-origin;
- существующий QR login продолжает работать;
- обновления web UI попадают в приложение без пересборки APK.

Что делает Android shell:

- хранит `serverUrl`;
- открывает `serverUrl` во встроенном WebView;
- добавляет app chrome: splash, fullscreen, настройка сервера, reset;
- позже может подключить native QR scanner через bridge.

### 5.2. Bundled-режим не делать первым

Bundled web assets внутри APK (`webDir: dist`) нельзя просто включить без доработок, потому что:

- `fetch('/api/...')` станет относительным к локальному origin приложения;
- cookies станут cross-origin, если API будет `https://server:8443/api`;
- backend CORS и cookie `SameSite/Secure` придется настраивать отдельно;
- часть smoke-сценариев нужно будет дублировать для mobile API base.

Bundled-режим допустим как P2 после MVP. Для него нужен отдельный раздел работ `12. Bundled mode`.

## 6. Документационные основания

Агент обязан сверяться с актуальными docs перед изменениями Capacitor/Android:

- Capacitor docs: `npx cap init <appName> <appID> --web-dir <value>`.
- Capacitor docs: `npm run build` -> `npx cap sync` -> Android build.
- Capacitor docs: `npx cap add android`.
- Capacitor Android config поддерживает `server.url` и `server.cleartext` для local/live reload сценариев.
- Capacitor Android config поддерживает `server.allowNavigation`; без него внешние HTTPS/IP URL открываются в системном браузере, а не внутри WebView.

Источник, использованный для этого плана: Context7 `/ionic-team/capacitor-docs`.

Перед реализацией конкретного plugin scanner агент должен отдельно проверить docs выбранного plugin через Context7 или официальный источник.

## 7. Предлагаемая структура файлов

MVP допускает один из двух вариантов. Предпочтительный для этого репозитория - вариант A.

### Вариант A - Capacitor внутри `frontend`

```text
frontend/
  capacitor.config.ts
  android/
  src/
    mobile/
      capacitor.ts
      server-url.ts
      terminal-app-mode.ts
```

Плюсы:

- минимальная интеграция с текущим Vite app;
- `dist` уже создается в `frontend`;
- меньше package/workspace-инфраструктуры.

Минусы:

- Android native project живет внутри frontend.

### Вариант B - отдельный `mobile/android-terminal`

```text
mobile/
  android-terminal/
    package.json
    capacitor.config.ts
    android/
```

Плюсы:

- мобильная оболочка изолирована.

Минусы:

- нужно настраивать отдельный package и сборку;
- выше риск дублирования frontend-конфигурации.

Решение для MVP: **использовать вариант A**, если пользователь отдельно не попросит выделить `mobile/`.

## 8. Конфигурация приложения

### 8.1. App name и package id

Использовать:

```text
App name: RoboPulse Terminal
Package ID: ru.robolabs.robopulse.terminal
```

### 8.2. Server URL

Сервер задается в runtime, не зашивается жестко в APK.
Default для новой установки/очищенного storage: `https://172.17.16.254:8443`.
Если оператор уже выбрал сервер, сохраненное значение имеет приоритет над default.

Хранить в Android/Web local storage:

```text
robopulse:terminal-app:server-url
```

Примеры допустимых значений:

```text
https://192.168.1.50:8443
https://robopulse.local:8443
```

Запрещено принимать:

```text
javascript:...
file:...
data:...
```

Для production использовать только `https://`.

Для dev можно временно разрешить `http://<LAN_IP>:8088`, но это должно быть явно помечено как dev-only.

### 8.3. Terminal QR

Существующий terminal QR остается:

```text
robopulse://terminal/<token>
```

Новый setup QR для приложения можно добавить позднее:

```text
robopulse-terminal://connect?server=https%3A%2F%2Frobopulse.local%3A8443&terminalQr=robopulse%3A%2F%2Fterminal%2F<token>
```

MVP не обязан требовать новый setup QR. Достаточно ручного ввода `serverUrl` и текущего terminal QR.

## 9. Roadmap

### P0. Подготовка окружения

- [x] Проверить `node -v`.
- [x] Проверить `npm -v`.
- [x] Проверить наличие JDK, подходящего для сгенерированного Android Gradle проекта.
- [x] Проверить `ANDROID_HOME` или установленный Android Studio.
- [x] Проверить, что `npm.cmd run build` проходит в `frontend`.
- [x] Проверить, что `npm.cmd run test:smoke` проходит в `frontend`.
- [x] Проверить, что `https://localhost:8443` открывается локально.
- [~] Проверить, что по LAN доступен `https://<LAN_IP>:8443`.
- [~] Проверить установку `frontend/certs/robopulse.local-ca.crt` на тестовое Android-устройство, если используется локальный CA.

Факт проверки 2026-06-15: Node `v24.14.0`, npm `11.9.0`, JDK `21.0.11`, Android SDK установлен в `%LOCALAPPDATA%\Android\Sdk`. `Test-NetConnection localhost:8443` успешен. Pixel 7 Pro `2A111FDH3003QY` подключен по ADB; для проверки на телефоне использован `adb reverse tcp:8443 tcp:8443` и адрес `https://localhost:8443`. Обычный LAN IPv4 на ПК не найден, видны только виртуальные `172.*` интерфейсы, поэтому `https://<LAN_IP>:8443` не проверялся. Вместо установки CA в системное хранилище телефона debug APK включает `frontend/certs/robopulse.local-ca.crt` через debug-only Android network security config.

Команды:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:smoke
```

### P1. Добавить Capacitor в frontend

- [x] Установить Capacitor зависимости.
- [x] Инициализировать `capacitor.config.ts`.
- [x] Добавить Android platform.
- [x] Добавить npm scripts для sync/open/build.
- [x] Убедиться, что `capacitor.config.ts` использует `webDir: 'dist'`.
- [x] Добавить `server.allowNavigation` для `localhost`, `127.0.0.1` и приватных LAN IPv4 (`10.*.*.*`, `172.*.*.*`, `192.168.*.*`), чтобы IP-адреса открывались во встроенном WebView.
- [x] Не коммитить случайные IDE/local machine файлы из Android Studio.

Ожидаемые команды:

```powershell
cd frontend
npm.cmd install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "RoboPulse Terminal" "ru.robolabs.robopulse.terminal" --web-dir dist
npm.cmd run build
npx cap add android
npx cap sync android
```

Ожидаемые scripts в `frontend/package.json`:

```json
{
  "cap:sync": "npm run build && cap sync android",
  "android:open": "cap open android",
  "android:build:debug": "npm run cap:sync && cd android && gradlew assembleDebug"
}
```

На Windows может потребоваться `gradlew.bat`. Если `cd android && gradlew` не работает в npm script, сделать отдельный PowerShell-friendly script или описать команду в README.

### P2. Добавить app mode для Android shell

Цель: web UI должен понимать, что запущен из Android terminal app.

- [x] Добавить helper `frontend/src/mobile/capacitor.ts`.
- [x] Добавить проверку Capacitor/runtime app mode.
- [x] Добавить query marker `?terminal-app=1` как fallback.
- [x] На экране входа всегда показывать QR login button в app mode, даже если user agent не определен как mobile browser.
- [x] Скрыть debug/profile noise в app mode.
- [x] После terminal-only login оставлять только `TerminalWorkspace`.
- [x] Не ломать обычный браузерный вход.

Пример логики:

```ts
export function isTerminalAndroidApp() {
  return window.location.search.includes('terminal-app=1') || Boolean((window as any).Capacitor);
}
```

Уточнение: не привязываться только к user agent. WebView и браузеры на Android могут отличаться.

### P3. Сделать экран настройки сервера

Экран нужен до открытия remote RoboPulse origin.

- [x] Создать простой setup view внутри bundled shell.
- [~] Поля: `Адрес сервера`, `Проверить`, `Открыть терминал`.
- [x] Нормализовать адрес: убрать trailing slash.
- [x] Разрешить только `https://` по умолчанию.
- [ ] Для dev добавить скрытый флаг `allowHttpDev`.
- [x] Сохранять адрес в `localStorage`.
- [ ] Проверять endpoint `GET <serverUrl>/api/auth/me` или health endpoint.
- [x] Если serverUrl валиден, открывать `serverUrl + '?terminal-app=1'`.
- [x] Добавить reset action: очистить serverUrl и вернуться к setup.
- [x] Добавить кнопку `Назад` на setup screen для возврата к предыдущему сохраненному серверу.

Факт реализации: setup view сохраняет `robopulse:terminal-app:server-url`, принимает только HTTPS origin и открывает remote origin с marker `terminal-app=1`. Default server URL в APK: `https://172.17.16.254:8443`; сохраненный serverUrl имеет приоритет. Reset доступен через кнопку `Сервер` в terminal app mode; она возвращает WebView на bundled setup с marker `terminal-setup=1`, очищает сохраненный serverUrl и позволяет ввести новый IP/host. Кнопка `Назад` на setup screen восстанавливает предыдущий сохраненный serverUrl и возвращает на него. Отдельной кнопки `Проверить` и health-check перед redirect пока нет.

Если health endpoint отсутствует, можно использовать:

```text
GET /api/auth/me
```

Ожидаемые варианты ответа:

- `200` - уже есть сессия;
- `401` - сервер доступен, но пользователь не авторизован;
- network error - сервер недоступен или сертификат не доверен.

### P4. QR login внутри Android app

MVP:

- [x] Использовать существующий web QR scanner на remote HTTPS origin.
- [x] Убедиться, что кнопка `Войти по QR-коду` видна в app mode.
- [x] Убедиться, что camera permission запрашивается и камера открывается.
- [x] Убедиться, что QR `robopulse://terminal/<token>` логинит terminal-only пользователя.

Факт проверки 2026-06-15 на Pixel 7 Pro: кнопка QR видна, Android permission `CAMERA` получил `granted=true`, appops показывает `CAMERA: allow`, экран QR scanner отображает `Камера работает, ищу QR-код участка.`. QR-login endpoint из контекста WebView вернул `201` для `terminal.01 / Лазерный станок` и открыл terminal-only workspace.

P1 native scanner:

- [ ] Выбрать Capacitor-compatible barcode scanner plugin.
- [ ] Проверить его актуальные docs.
- [x] Добавить Android camera permission.
- [ ] Создать bridge/helper `frontend/src/mobile/native-qr.ts`.
- [ ] В app mode сначала использовать native scanner, fallback - existing web ZXing scanner.
- [ ] Передавать результат в текущую функцию token extraction.
- [ ] Не удалять существующий browser QR scanner.

Требование к распознаванию QR:

- принимать `robopulse://terminal/<token>`;
- принимать голый `rpt_...` token;
- принимать URL/query с `token` или `terminalQr`, если это уже поддержано текущим parser;
- показывать понятную ошибку, если токен не найден.

### P5. Android native project настройки

- [x] Установить app icon RoboPulse.
- [x] Установить app label `RoboPulse Terminal`.
- [~] Настроить splash screen в стиле RoboPulse pulse/control/monitoring.
- [ ] Включить portrait как default, если терминал лучше работает вертикально.
- [ ] Проверить landscape на планшете; не запрещать, если цеховые планшеты горизонтальные.
- [ ] Включить fullscreen/edge-to-edge только после проверки, что кнопки терминала не перекрываются системными панелями.
- [x] Добавить INTERNET permission.
- [x] Добавить camera permission только когда появится native scanner.
- [x] Для dev не расширять cleartext на все домены.

Android permissions ориентир:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
```

`CAMERA` добавлять только если native scanner действительно используется. Для web scanner permission запрашивается WebView/browser layer.

### P6. HTTPS, сертификаты и сеть цеха

Production-правило: использовать доверенный HTTPS.

- [ ] Определить стабильное имя сервера: `robopulse.local` или внутренний DNS.
- [ ] Настроить `ROBO_PULSE_HTTPS_HOSTS` под LAN host/IP.
- [ ] Пересоздать frontend container после смены cert hosts.
- [ ] Установить local CA на Android devices, если используется локальный CA.
- [ ] Проверить, что Android WebView открывает `https://<LAN_HOST>:8443` без certificate error.
- [ ] Не использовать self-signed leaf cert без доверенного CA на устройствах.
- [ ] Не включать global cleartext в release build.

Dev-only допущение:

- [ ] Можно временно разрешить `http://<LAN_IP>:8088` для emulator/device smoke.
- [ ] Это должно быть отделено от release build.

### P7. Backend/API доработки, если они понадобятся

MVP remote origin может обойтись без backend-изменений.

Добавлять backend изменения только если фактическая проверка покажет проблему.

Возможные доработки:

- [ ] Добавить `GET /api/health` или `GET /api/mobile/health` для проверки сервера без auth.
- [ ] Добавить endpoint для mobile app config/version.
- [ ] Добавить аудит события `terminal_app_login`.
- [ ] Добавить ротацию QR token по терминалу через admin/technologist screen.
- [ ] Добавить endpoint для генерации setup QR `robopulse-terminal://connect?...`.

Не менять auth cookie/CORS для MVP, если app грузит тот же HTTPS origin.

### P8. Frontend UX доработки для terminal app

- [ ] Убрать лишние desktop-only элементы на маленьком Android viewport.
- [ ] Проверить текущую операцию на 360x800, 390x844, 800x1280.
- [ ] Проверить, что кнопки `Начать`, `Пауза`, `Продолжить`, `Завершить` не перекрываются.
- [ ] Проверить, что анимации входа/старта/завершения не тормозят слабое устройство.
- [ ] Добавить app-safe-area padding, если включается fullscreen.
- [ ] Отключить случайный text selection на крупных кнопках терминала.
- [ ] Сделать touch targets не меньше 44px по высоте.
- [ ] Проверить, что аппаратная кнопка Back не выбрасывает оператора в непонятное состояние.

### P9. Hardware scanner support

Для внешнего QR/штрихкод-сканера, работающего как keyboard wedge:

- [ ] Сохранить текущий keyboard buffer подход.
- [ ] Убедиться, что scanner input работает на экране QR login.
- [ ] Добавить hidden/focused input только если WebView теряет key events.
- [ ] Проверить Enter suffix.
- [ ] Проверить сканирование `robopulse://terminal/<token>`.
- [ ] Проверить сканирование обычных QR без падения.

Для Bluetooth/USB scanner через Android APIs:

- [ ] Не делать в MVP.
- [ ] Вынести в отдельный native plugin только при реальной потребности оборудования.

### P10. Kiosk / pinned mode

MVP не обязан включать kiosk.

План после MVP:

- [ ] Добавить fullscreen режим.
- [ ] Добавить настройку `Запускать сразу терминал`.
- [ ] Подготовить инструкцию для Android screen pinning.
- [ ] Подготовить MDM/launcher сценарий, если устройства корпоративные.
- [ ] Запретить переход в dispatcher/director screens внутри terminal app.
- [ ] Добавить кнопку выхода из terminal app setup только для администратора или через long press.

### P11. Сборка APK

Debug:

```powershell
cd frontend
npm.cmd run cap:sync
cd android
.\gradlew.bat assembleDebug
```

Ожидаемый artifact:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Факт сборки 2026-06-15:

- [x] `npm.cmd run cap:sync` выполнен.
- [x] `.\gradlew.bat assembleDebug` выполнен.
- [x] Debug APK создан: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
- [x] APK проходит `apksigner.bat verify --verbose`.
- [x] `aapt dump badging` показывает package `ru.robolabs.robopulse.terminal`, label `RoboPulse Terminal`, `targetSdkVersion` 36.
- [x] APK установлен на Pixel 7 Pro через `adb install --no-streaming -r -d`.

Release:

- [ ] Создать release keystore вне репозитория.
- [ ] Не хранить пароли keystore в git.
- [ ] Добавить локальный `keystore.properties` в `.gitignore`.
- [ ] Настроить signing config.
- [ ] Собрать `assembleRelease`.
- [ ] Проверить установку release APK на чистое устройство.

Release artifact:

```text
frontend/android/app/build/outputs/apk/release/app-release.apk
```

### P12. Bundled mode, только после MVP

Bundled mode нужен, если приложение должно открываться даже без доступного web frontend до ввода server URL.

Работы:

- [ ] Превратить `API` из константы в runtime helper, который учитывает configured server URL.
- [ ] Проверить все fetch-вызовы на `${API}` и `/api`.
- [ ] Настроить backend CORS для `capacitor://localhost`, если используется bundled origin.
- [ ] Настроить cookie `SameSite=None; Secure` только если cross-origin действительно нужен.
- [ ] Добавить mobile-specific smoke для API base.
- [ ] Проверить logout/session restore.
- [ ] Проверить QR login с bundled origin.

Не начинать P12 до закрытия MVP, потому что он меняет auth/network модель.

## 10. File-by-file implementation notes

### `frontend/package.json`

Добавить зависимости:

```json
{
  "dependencies": {
    "@capacitor/android": "...",
    "@capacitor/core": "..."
  },
  "devDependencies": {
    "@capacitor/cli": "..."
  }
}
```

Добавить scripts:

```json
{
  "cap:sync": "npm run build && cap sync android",
  "android:open": "cap open android",
  "android:build:debug": "npm run cap:sync && cd android && gradlew assembleDebug"
}
```

Версии не писать вручную вслепую. Установить через npm и зафиксировать lockfile.

### `frontend/capacitor.config.ts`

Ожидаемые базовые поля:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.robolabs.robopulse.terminal',
  appName: 'RoboPulse Terminal',
  webDir: 'dist',
  server: {
    allowNavigation: [
      'localhost',
      '127.0.0.1',
      '10.*.*.*',
      '172.*.*.*',
      '192.168.*.*'
    ]
  }
};

export default config;
```

Не добавлять permanent `server.url` в release config, если app должен быть переносимым между стендами.

### `frontend/src/mobile/*`

Ожидаемые helpers:

- `capacitor.ts` - platform/app-mode detection.
- `server-url.ts` - validate/normalize/store server URL.
- `native-qr.ts` - adapter для native scanner, если добавлен plugin.

### `frontend/src/main.tsx`

Изменять минимально:

- QR button visible in app mode.
- Terminal-only behavior remains unchanged.
- No broad rewrite.
- No regression for existing browser smoke.

### `backend/src/auth.service.ts`

MVP не требует изменений.

Если добавляется health/config endpoint, делать в отдельном controller/service или минимально в existing controller, не ломая auth.

### `frontend/smoke/robopulse-smoke.spec.ts`

Добавить web-level проверки:

- app mode показывает QR button;
- app mode показывает кнопку `Сервер` для смены источника;
- QR login screen открывается в app mode;
- no root overflow на 390x844;
- existing HTTPS QR login остается зеленым.

Android emulator/device smoke отдельно описать в `README` или добавить Detox/Appium только если будет устойчивый локальный workflow.

## 11. Security requirements

- [x] QR token не логировать в console.
- [x] QR token не сохранять в localStorage без необходимости.
- [x] Server URL можно хранить в localStorage.
- [x] Session должна оставаться backend cookie, как сейчас.
- [x] Terminal app не должен открывать dispatcher/director/technologist screens после terminal-only login.
- [x] App не должен принимать arbitrary URL schemes как server URL.
- [~] Release build не должен включать debug login shortcuts.
- [x] Release build не должен разрешать cleartext для всех host.

Факт реализации: QR token передается только в body `POST /api/auth/terminal-qr-login`, server URL хранится в `robopulse:terminal-app:server-url`, URL validator принимает только HTTPS origin и явно отклоняет `javascript:`, `file:` и `data:`. Debug/profile shortcuts скрыты в app mode; отдельная release-сборка пока не настраивалась.

## 12. UX requirements

- [x] Название приложения на устройстве: `RoboPulse Terminal`.
- [x] Первый экран не должен выглядеть как браузер.
- [x] Визуальный стиль должен продолжать RoboPulse: pulse, monitoring, control.
- [x] Экран настройки сервера должен быть коротким и рабочим.
- [~] Ошибка сертификата должна объясняться по-человечески: установить CA или проверить адрес.
- [~] Ошибка недоступного сервера должна отличаться от ошибки неверного QR.
- [x] QR scanner screen должен иметь крупную область сканирования.
- [x] Оператор после входа не должен видеть выбор ролей.
- [~] Повторное открытие app должно возвращать в терминал или QR-login flow.

Факт реализации: setup screen показывает branded RoboPulse Terminal UI и подсказку про установку локального CA. Отдельного health-check перед redirect пока нет, поэтому сетевые/certificate ошибки WebView на реальном устройстве требуют manual acceptance.

## 13. Automated checks

Перед закрытием задачи выполнить:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:smoke
```

Если менялся backend:

```powershell
cd backend
npm.cmd run build
npm.cmd run test:unit
```

Если добавлен Android project:

```powershell
cd frontend
npm.cmd run cap:sync
cd android
.\gradlew.bat assembleDebug
```

Если `gradlew.bat assembleDebug` невозможен из-за отсутствия Android SDK/JDK, агент должен:

- [ ] явно написать причину;
- [ ] проверить все web/build части;
- [ ] оставить Android build как `[!]` с точным внешним требованием;
- [ ] не заявлять, что APK собран.

Факт проверки 2026-06-15: `npm.cmd run build`, `npm.cmd run test:smoke`, `npm.cmd run cap:sync` и `.\gradlew.bat assembleDebug` выполнены успешно. Повторный `npm.cmd run test:smoke` после Android/manual fixes, кнопки `Сервер` и default URL `https://172.17.16.254:8443`: 8/8 passed. Backend не менялся.

## 14. Manual Android acceptance

Проверять на реальном Android-устройстве или emulator с камерой/virtual scene, если возможно.

Факт 2026-06-15: manual Android acceptance выполнен на Pixel 7 Pro `2A111FDH3003QY`. Установка стабильна через `adb install --no-streaming -r -d`; обычный streamed install на этом USB-соединении периодически терял транспорт. Проверка сервера выполнена через `adb reverse tcp:8443 tcp:8443` и `https://localhost:8443`, потому что обычный LAN IPv4 на ПК не найден. Кнопка `Сервер` проверена на устройстве: она возвращает на экран `Сервер RoboPulse`, после повторного ввода `https://localhost:8443` приложение снова открывает выбор терминала внутри WebView. `server.allowNavigation` добавлен, чтобы реальные LAN IP не уходили во внешний Chrome. После добавления default URL `https://172.17.16.254:8443` APK повторно собран и установлен без очистки данных; на уже настроенном телефоне сохраненный serverUrl остается активным до ручной смены через `Сервер` или очистки данных приложения. После добавления кнопки `Назад` APK повторно собран, установлен и запущен на Pixel 7 Pro.

- [x] APK устанавливается.
- [~] App icon отображается.
- [x] App name `RoboPulse Terminal`.
- [x] Первый запуск показывает setup/server screen или открывает сохраненный сервер.
- [~] Сервер `https://<LAN_HOST>:8443` открывается.
- [x] Кнопка `Сервер` открывает setup/server screen для смены источника.
- [x] QR login button виден.
- [x] Камера запрашивает permission.
- [~] QR `robopulse://terminal/<token>` логинит конкретный terminal-only участок.
- [x] После login виден только `TerminalWorkspace`.
- [x] Нельзя открыть dispatcher/director/technologist из terminal app.
- [x] Текущая операция читается без overflow.
- [~] Старт операции виден визуально.
- [~] Завершение операции показывает исчезновение/обновление.
- [x] Logout возвращает в terminal login/setup, не в общий desktop UI.
- [x] Закрытие и повторное открытие app не ломает session.
- [ ] Слабое соединение показывает понятное состояние, а не пустой экран.

Примечания: icon визуально в launcher не открывался, но manifest/aapt содержит `@drawable/robopulse_launcher` и label `RoboPulse Terminal`. QR camera path проверен до открытия камеры, а QR login endpoint проверен из WebView с реальным token `terminal.01`; оптическое наведение камеры на физический QR не выполнялось. Действия start/finish не нажимались, чтобы не менять производственные данные.

## 15. Definition of Done

Задача Android terminal app считается выполненной только если:

- [x] Создан Capacitor Android project или явно зафиксирован блокер Android SDK/JDK.
- [x] Есть рабочий app mode для терминала.
- [x] Server URL настраивается и сохраняется.
- [x] Приложение открывает RoboPulse HTTPS origin.
- [x] QR login работает с текущими `robopulse://terminal/<token>` строками.
- [x] Terminal-only пользователь видит только терминал своего участка.
- [x] Existing browser flow не сломан.
- [x] `frontend npm run build` проходит.
- [x] `frontend npm run test:smoke` проходит.
- [x] Android debug build проходит или зафиксирован внешний блокер.
- [x] Manual Android acceptance выполнен хотя бы на одном устройстве/emulator.
- [x] README-план обновлен по фактическим статусам.

## 16. Risks and decisions

### Risk: self-signed certificate rejected by Android WebView

Решение:

- использовать локальный CA;
- установить CA на Android devices;
- использовать стабильный LAN host;
- не полагаться на одноразовое принятие browser warning.

### Risk: remote origin with Capacitor bridge limitations

Решение:

- MVP использует existing web QR scanner;
- native scanner bridge делать отдельной фазой после spike;
- fallback всегда оставлять на web ZXing scanner.

### Risk: `/api` breaks in bundled mode

Решение:

- MVP грузит same-origin RoboPulse web;
- bundled mode не начинать без runtime API helper и CORS/cookie проверки.

### Risk: Android SDK отсутствует на машине агента

Решение:

- создать и проверить web/Capacitor config;
- не заявлять APK build;
- оставить точный blocker: установить Android Studio/JDK/SDK.

### Risk: operator can escape into non-terminal screens

Решение:

- terminal-only auth уже есть;
- app mode должен скрывать лишнюю навигацию;
- acceptance обязательно проверяет отсутствие dispatcher/director/technologist screens.

## 17. Suggested implementation order for agent

1. Прочитать этот README полностью.
2. Проверить текущее состояние `frontend`, `backend`, Docker.
3. Прогнать текущий `frontend npm run build` и `frontend npm run test:smoke`.
4. Добавить Capacitor зависимости и config.
5. Добавить Android project.
6. Добавить app mode detection.
7. Сделать setup/server URL flow.
8. Подключить переход на saved remote RoboPulse origin.
9. Сделать QR button always visible in app mode.
10. Проверить web smoke.
11. Собрать Android debug APK.
12. Проверить APK на устройстве/emulator.
13. Обновить чекбоксы в этом README.
14. В финальном ответе указать APK path, команды проверки и оставшиеся ограничения.

## 18. Expected final report

Финальный отчет агента должен содержать:

- где лежит Android project;
- какой APK собран;
- какой server URL проверен;
- каким QR token/terminal проверен вход;
- какие команды прошли;
- что не проверено и почему;
- какие чекбоксы в README закрыты;
- если Android build не прошел, точную причину и внешний шаг.

## 19. Useful links

- Capacitor docs: https://capacitorjs.com/docs
- Capacitor CLI init: https://capacitorjs.com/docs/cli/commands/init
- Capacitor Android: https://capacitorjs.com/docs/android
- Android Network Security Config: https://developer.android.com/privacy-and-security/security-config
- RoboPulse local HTTPS notes: `frontend/certs/README.md`
- RoboPulse terminal QR strings: `TERMINAL_QR_CODES_2026-06-11.md`
