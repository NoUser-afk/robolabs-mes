import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { createRoot } from 'react-dom/client';
import './style.css';
import { API, apiErrorMessage, getJson } from './api/client';
import type {
  AuthUser,
  BlueprintAddOptions,
  BlueprintContextMenu,
  BlueprintEditForm,
  BlueprintGraphWindowProps,
  BlueprintStepDraft,
  BlueprintValidationIssue,
  ControlBlockOperation,
  DebugProfile,
  DeviationReason,
  DirectorDashboardData,
  DirectorRiskOperation,
  DispatchDashboardData,
  DispatchOrder,
  NomenclatureItem,
  Operation,
  OperationControlBlock,
  OperationStatus,
  Order,
  Person,
  PlanGroup,
  PlanOrder,
  Priority,
  ProcessGraph,
  ProcessGraphData,
  ProcessGraphNode,
  ProcessGraphPhase,
  ProcessGraphUnit,
  ProcessStep,
  ProductProcess,
  ProductionLaunch,
  ProductionOperation,
  ProductionOperationStatus,
  ProductionPlanData,
  ProductionRun,
  ProductionUnit,
  ReferenceData,
  ReferenceOperationRef,
  ReferenceSection,
  SectionLoad,
  SectionShiftReport,
  Summary,
  TerminalData,
  TerminalFilter,
  TerminalRecentEvent,
  WorkerReport,
  WorkCenter,
  WorkShift,
} from './api/types';
import {
  Empty,
  Kpi,
  LoadBars,
  MiniChart,
  OrderProgress,
  PageTitle,
  Quality,
  RoleBanner,
  date,
  dateTime,
  displayBlockedBy,
  displayOperationDetail,
  displayOperationTitle,
  displayOrderNumber,
  displayRunTitle,
  durationLabel,
  hours,
  loadResourceLabel,
  loadShortLabel,
  loadSummary,
  priorityLabel,
  runStatusLabel,
  statusClass,
  statusLabel,
} from './components/common';
import { DirectorDashboard } from './features/director';
import { TechProcessBuilder } from './features/tech-process';
import { TerminalWorkspace, WorkCenterTerminal } from './features/terminal';
import { isCapacitorShellOrigin } from './mobile/capacitor';
import { clearStoredServerUrl, hasServerSetupMarker, openTerminalServerSetup, readStoredServerUrl, redirectToTerminalServer, saveStoredServerUrl, validateAndNormalizeServerUrl } from './mobile/server-url';
import { isTerminalAppMode, rememberTerminalAppModeFromUrl } from './mobile/terminal-app-mode';
import { ADDITIONAL_TABS, MAIN_TABS, canOpenTab, label, readSavedTab, resolveAvailableTab, saveTab } from './routing/tabs';

const APP_REFRESH_MS = 15000;

function App() {
  const terminalAppMode = useMemo(() => {
    rememberTerminalAppModeFromUrl();
    return isTerminalAppMode();
  }, []);
  const terminalShell = useMemo(() => isCapacitorShellOrigin(), []);
  const [tab, setTab] = useState('dispatch');
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState(() => window.location.hash === '#debug-profiles' ? 'debug-profiles' : 'login');
  const [entryIntroUser, setEntryIntroUser] = useState<AuthUser | null>(null);
  const [entrySignal, setEntrySignal] = useState(0);
  const entryIntroTimer = useRef<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedProductionRunId, setSelectedProductionRunId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [archiveOrders, setArchiveOrders] = useState<Order[]>([]);
  const [archiveProductionRuns, setArchiveProductionRuns] = useState<ProductionRun[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary>({ orders: 0, avgProgress: 0, workOps: 0, doneOps: 0 });
  const [sectionLoad, setSectionLoad] = useState<SectionLoad[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadCurrentUser() {
    try {
      const json = await getJson<{ user: AuthUser }>(`${API}/auth/me`);
      setCurrentUser(json.user);
      if (!json.user.isTerminalOnly) setTab(resolveAvailableTab(readSavedTab(json.user), json.user));
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  }

  async function logout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    setCurrentUser(null);
  }

  function completeLogin(user: AuthUser) {
    const signal = Date.now();
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setAuthMode('login');
    setEntrySignal(signal);
    setEntryIntroUser(user);
    if (entryIntroTimer.current) window.clearTimeout(entryIntroTimer.current);
    entryIntroTimer.current = window.setTimeout(() => {
      if (!user.isTerminalOnly) setTab(resolveAvailableTab(readSavedTab(user), user));
      setCurrentUser(user);
      setEntryIntroUser(null);
      entryIntroTimer.current = null;
    }, 2200);
  }

  function openTab(nextTab: string) {
    setTab(nextTab);
    saveTab(nextTab, currentUser);
  }

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [ordersRes, archiveRes, archiveRunsRes, peopleRes, sectionsRes, summaryRes, loadRes, eventsRes] = await Promise.all([
        fetch(`${API}/orders`), fetch(`${API}/archive/orders`), fetch(`${API}/archive/production-runs`), fetch(`${API}/people`), fetch(`${API}/sections`), fetch(`${API}/dashboard/summary`), fetch(`${API}/dashboard/section-load`), fetch(`${API}/events`),
      ]);
      if (![ordersRes, archiveRes, archiveRunsRes, peopleRes, sectionsRes, summaryRes, loadRes, eventsRes].every((res) => res.ok)) throw new Error('Не удалось загрузить часть данных');
      setOrders(await ordersRes.json());
      setArchiveOrders(await archiveRes.json());
      setArchiveProductionRuns(await archiveRunsRes.json());
      setPeople(await peopleRes.json());
      setSections(await sectionsRes.json());
      setSummary(await summaryRes.json());
      setSectionLoad(await loadRes.json());
      setEvents(await eventsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (terminalShell) {
      setAuthChecked(true);
      return;
    }
    loadCurrentUser();
  }, [terminalShell]);
  useEffect(() => () => {
    if (entryIntroTimer.current) window.clearTimeout(entryIntroTimer.current);
  }, []);
  useEffect(() => {
    const syncAuthMode = () => setAuthMode(!terminalAppMode && window.location.hash === '#debug-profiles' ? 'debug-profiles' : 'login');
    window.addEventListener('hashchange', syncAuthMode);
    return () => window.removeEventListener('hashchange', syncAuthMode);
  }, [terminalAppMode]);
  useEffect(() => {
    if (!currentUser || currentUser.isTerminalOnly) return;
    setTab(resolveAvailableTab(readSavedTab(currentUser), currentUser));
  }, [currentUser?.id]);
  useEffect(() => {
    if (!currentUser || currentUser.isTerminalOnly) return;
    load();
    const timer = window.setInterval(() => load(true), APP_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [currentUser]);

  const changeServer = terminalAppMode ? openTerminalServerSetup : undefined;

  if (terminalShell) return <TerminalAppBootstrap />;
  if (!authChecked) return <RoboPulseIntro />;
  if (entryIntroUser) return <RoboPulseIntro key={entrySignal} long={Boolean(entryIntroUser.isTerminalOnly)} />;
  if (!currentUser && authMode === 'debug-profiles' && !terminalAppMode) return <DebugProfilesScreen onLogin={completeLogin} />;
  if (!currentUser) return <TerminalLoginScreen onLogin={completeLogin} terminalAppMode={terminalAppMode} onChangeServer={changeServer} />;
  if (currentUser.isTerminalOnly) return <TerminalWorkspace user={currentUser} onLogout={logout} onChangeServer={changeServer} />;
  const mainTabs = MAIN_TABS.filter(tab => canOpenTab(currentUser, tab));
  const additionalTabs = ADDITIONAL_TABS.filter(tab => canOpenTab(currentUser, tab));
  const canOpenDirector = canOpenTab(currentUser, 'director');

  return <div className="shell">
    <aside className="sidebar"><div className="logo">Robo<span>Pulse</span><small>MES</small></div><div className="user-chip"><b>{currentUser.displayName}</b><span>{currentUser.role}</span><button onClick={logout}>Выйти</button></div><nav>{mainTabs.map(x => <button key={x} className={tab===x?'active':''} onClick={() => openTab(x)}>{label(x)}</button>)}{additionalTabs.length > 0 && <details className="nav-extra" open={additionalTabs.includes(tab as any)}><summary>Дополнительно</summary>{additionalTabs.map(x => <button key={x} className={tab===x?'active':''} onClick={() => openTab(x)}>{label(x)}</button>)}</details>}</nav></aside>
    <main>
      <div key={tab} className={`screen-enter screen-enter-${tab}`}>
      {error && <div className="alert">{error}</div>}{loading && <div className="loading">Загрузка данных...</div>}
      {tab === 'dispatch' && <RoleBanner role="Диспетчер" note="Сводка производства и работа с партиями доступны по текущей роли" />}
      {tab === 'dispatch' && <ProductionPlan events={events} referenceSections={sections} />}
      {tab === 'terminal' && <RoleBanner role="Оператор" note="Терминал участка с персональной сессией и действиями по операциям" />}
      {tab === 'terminal' && <WorkCenterTerminal sections={sections} people={people} onDone={load} />}
      {tab === 'process-graph' && <ProcessGraphView />}
      {tab === 'director' && canOpenDirector && <RoleBanner role="Директор" note="Готовность, загрузка участков и производственная динамика" />}
      {tab === 'director' && canOpenDirector && <DirectorDashboard fallback={{ summary, loads: sectionLoad, orders }} />}
      {tab === 'nomenclature' && <NomenclatureProcesses user={currentUser} />}
      {tab === 'reference-sections' && <ReferenceSections />}
      {tab === 'reference-operations' && <ReferenceOperations />}
      {tab === 'shifts-kpi' && <ShiftsKpi sections={sections} people={people} />}
      {tab === 'production' && <ProductionRuns />}
      {tab === 'import' && <Import onDone={load} />}
      {tab === 'orders' && <Orders orders={orders} onOpenOrder={(id:number)=>{setSelectedOrderId(id); openTab('order-card');}} />}
      {tab === 'order-card' && selectedOrderId && <OrderCard orderId={selectedOrderId} people={people} onBack={()=>openTab('orders')} onArchived={()=>{load(); openTab('archive');}} />}
      {tab === 'people' && <People people={people} sections={sections} onDone={load} />}
      {tab === 'archive' && <Archive orders={archiveOrders} productionRuns={archiveProductionRuns} onOpenOrder={(id:number)=>{setSelectedOrderId(id); openTab('order-card');}} onOpenRun={(id:string)=>{setSelectedProductionRunId(id); openTab('production-run-card');}} />}
      {tab === 'production-run-card' && selectedProductionRunId && <ProductionRunCard runId={selectedProductionRunId} onBack={()=>openTab('archive')} />}
      </div>
    </main>
  </div>;
}

function RoboPulseIntro({ overlay = false, long = false }: { overlay?: boolean; long?: boolean }) {
  return <div className={`pulse-intro ${overlay ? 'pulse-intro-overlay' : ''} ${long ? 'pulse-intro-terminal' : ''}`} role={overlay ? undefined : 'status'} aria-label={overlay ? undefined : 'Loading RoboPulse'} aria-hidden={overlay || undefined}>
    <div className="pulse-grid" />
    <div className="pulse-stage">
      <div className="pulse-core" aria-hidden="true">
        <span className="pulse-ring one" />
        <span className="pulse-ring two" />
        <span className="pulse-ring three" />
        <i />
      </div>
      <div className="pulse-logo">Robo<span>Pulse</span><small>MES</small></div>
      <svg className="pulse-wave" viewBox="0 0 360 72" aria-hidden="true">
        <polyline points="0,42 38,42 54,42 64,24 78,58 94,18 112,42 158,42 174,32 190,46 210,42 246,42 262,22 278,56 294,40 360,40" />
      </svg>
      <div className="pulse-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
    </div>
  </div>;
}

function TerminalAppBootstrap() {
  const forceSetup = useMemo(() => hasServerSetupMarker(), []);
  const [previousServerUrl] = useState(() => forceSetup ? readStoredServerUrl() : '');
  const [serverUrl, setServerUrl] = useState(() => forceSetup ? '' : readStoredServerUrl());
  const [error, setError] = useState('');

  useEffect(() => {
    if (forceSetup) clearStoredServerUrl();
  }, [forceSetup]);

  useEffect(() => {
    if (!serverUrl) return;
    const validation = validateAndNormalizeServerUrl(serverUrl);
    if (!validation.ok) {
      clearStoredServerUrl();
      setServerUrl('');
      setError(validation.message);
      return;
    }
    saveStoredServerUrl(validation.url);
    redirectToTerminalServer(validation.url);
  }, [serverUrl]);

  if (serverUrl) return <RoboPulseIntro />;
  return <TerminalServerSetupScreen initialError={error} previousServerUrl={previousServerUrl} onSaved={setServerUrl} />;
}

function TerminalServerSetupScreen({ initialError, previousServerUrl, onSaved }: { initialError: string; previousServerUrl: string; onSaved: (url: string) => void }) {
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState(initialError);

  useEffect(() => setError(initialError), [initialError]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateAndNormalizeServerUrl(serverUrl);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    saveStoredServerUrl(validation.url);
    onSaved(validation.url);
  }

  function goBack() {
    const validation = validateAndNormalizeServerUrl(previousServerUrl);
    if (validation.ok) {
      saveStoredServerUrl(validation.url);
      onSaved(validation.url);
      return;
    }
    if (window.history.length > 1) window.history.back();
  }

  return <div className="auth-shell terminal-setup-shell"><section className="auth-panel terminal-setup-panel"><div className="terminal-app-badge">Android terminal</div><div className="logo">Robo<span>Pulse</span><small>Terminal</small></div><h1>Сервер RoboPulse</h1><p className="small">Укажите HTTPS-адрес стенда в локальной сети.</p>{error && <div className="alert">{error}</div>}<form className="server-url-form" onSubmit={submit}><input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} placeholder="https://172.17.16.50:8444/" inputMode="url" autoCapitalize="none" autoCorrect="off" autoFocus /><button>Открыть сервер</button><button type="button" className="secondary terminal-setup-back" onClick={goBack}>Назад</button></form><p className="small terminal-setup-note">Если WebView отклонит сертификат, установите локальный CA из `frontend/certs` на устройство.</p></section></div>;
}

function isMobileAuthBrowser() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = window.matchMedia?.('(max-width: 820px)').matches;
  return Boolean(coarse || narrow || /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent));
}

function TerminalLoginScreen({ onLogin, terminalAppMode = false, onChangeServer }: { onLogin: (user: AuthUser) => void; terminalAppMode?: boolean; onChangeServer?: () => void }) {
  const [terminals, setTerminals] = useState<DebugProfile[]>([]);
  const [error, setError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  const [qrMode, setQrMode] = useState(false);
  const [isMobileBrowser, setIsMobileBrowser] = useState(() => terminalAppMode || isMobileAuthBrowser());
  const [terminalPassword, setTerminalPassword] = useState('1234');
  const [terminalSearch, setTerminalSearch] = useState('');
  const filteredTerminals = useMemo(() => {
    const query = terminalSearch.trim().toLowerCase();
    if (!query) return terminals;
    return terminals.filter((profile) => `${profile.workCenterSection || ''} ${profile.displayName} ${profile.login}`.toLowerCase().includes(query));
  }, [terminals, terminalSearch]);
  const terminalGroups = useMemo(() => {
    const groups = new Map<string, DebugProfile[]>();
    filteredTerminals.forEach((profile) => {
      const section = profile.workCenterSection || 'Без участка';
      groups.set(section, [...(groups.get(section) || []), profile]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([section, items]) => ({ section, items }));
  }, [filteredTerminals]);

  useEffect(() => {
    getJson<{ users: DebugProfile[] }>(`${API}/auth/terminals`)
      .then((data) => setTerminals(data.users))
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить терминалы'));
  }, []);
  useEffect(() => {
    const update = () => setIsMobileBrowser(terminalAppMode || isMobileAuthBrowser());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [terminalAppMode]);

  async function loginAsTerminal(profile: DebugProfile) {
    setLoadingLogin(profile.login);
    setError('');
    try {
      const res = await fetch(`${API}/auth/terminal-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: profile.login, password: terminalPassword }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(payload, 'Не удалось открыть терминал'));
      onLogin(payload.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось открыть терминал');
      setLoadingLogin('');
    }
  }

  if (passwordMode) return <LoginScreen onLogin={onLogin} terminalAppMode={terminalAppMode} onChangeServer={onChangeServer} />;
  if (qrMode) return <TerminalQrLoginScreen onLogin={onLogin} onBack={() => setQrMode(false)} />;

  return <div className={`auth-shell ${terminalAppMode ? 'terminal-app-auth-shell' : ''}`}><section className={`auth-panel debug-panel ${terminalAppMode ? 'terminal-app-auth-panel' : ''}`}><div className="logo">Robo<span>Pulse</span><small>{terminalAppMode ? 'Terminal' : 'MES'}</small></div><div className="debug-head"><div><h1>Выбор терминала</h1><p className="small">Откройте терминал участка.</p></div><div className="auth-head-actions">{isMobileBrowser && <button type="button" className="qr-login-button" onClick={()=>setQrMode(true)}>Войти по QR-коду</button>}<button type="button" className="secondary" onClick={()=>setPasswordMode(true)}>Служебный вход</button>{onChangeServer && <button type="button" className="server-change-button" onClick={onChangeServer}>Сервер</button>}</div></div>{error && <div className="alert">{error}</div>}<div className="terminal-login-controls"><input value={terminalPassword} onChange={e=>setTerminalPassword(e.target.value)} placeholder="PIN терминала" type="password" /><input value={terminalSearch} onChange={e=>setTerminalSearch(e.target.value)} placeholder="Поиск участка или логина" /></div>{!terminals.length && !error && <div className="loading">Загрузка терминалов...</div>}{terminals.length > 0 && !filteredTerminals.length && <Empty text="Терминалы по фильтру не найдены" />}<div className="terminal-group-list">{terminalGroups.map(group => <section key={group.section} className="terminal-login-group"><div className="terminal-login-group-head"><b>{group.section}</b><span>{group.items.length}</span></div><div className="debug-profile-list">{group.items.map(profile => <button key={profile.id} type="button" className="debug-profile" disabled={Boolean(loadingLogin) || !terminalPassword} onClick={() => loginAsTerminal(profile)}><span><b>{profile.workCenterSection || profile.displayName}</b><small>{profile.login}</small></span><strong>{loadingLogin === profile.login ? '...' : 'Открыть'}</strong></button>)}</div></section>)}</div>{!terminalAppMode && <a className="debug-link" href="#debug-profiles">Все профили для отладки</a>}</section></div>;
}

function TerminalQrLoginScreen({ onLogin, onBack }: { onLogin: (user: AuthUser) => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const hardwareScannerBufferRef = useRef('');
  const hardwareScannerLastKeyAtRef = useRef(0);
  const loginInFlightRef = useRef(false);
  const [status, setStatus] = useState('Запуск камеры и QR-сканера...');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  function stopCamera() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function submitQr(rawQr: string) {
    const token = extractTerminalQrToken(rawQr);
    if (!token) {
      setError('QR-код считан, но токен терминала RoboPulse не найден');
      setStatus('Наведите камеру на QR-код участка.');
      return;
    }
    if (loginInFlightRef.current) return;
    loginInFlightRef.current = true;
    setLoading(true);
    setError('');
    setStatus('Проверка QR-кода...');
    try {
      const res = await fetch(`${API}/auth/terminal-qr-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json();
      if (!res.ok) {
        const message = res.status === 401
          ? 'QR-код не найден среди активных терминалов RoboPulse. Проверьте, что напечатан актуальный код именно этого стенда.'
          : apiErrorMessage(payload, 'Не удалось войти по QR-коду');
        throw new Error(message);
      }
      stopCamera();
      onLogin(payload.user);
    } catch (e) {
      loginInFlightRef.current = false;
      setError(e instanceof Error ? e.message : 'Не удалось войти по QR-коду');
      setStatus('Наведите камеру на QR-код участка');
    } finally {
      setLoading(false);
    }
  }

  function extractTerminalQrToken(rawQr: string) {
    const value = rawQr.trim().replace(/^[`'"]+|[`'"]+$/g, '');
    if (!value) return '';

    const embeddedToken = value.match(/rpt_[A-Za-z0-9_-]{16,}/);
    if (embeddedToken) return embeddedToken[0];

    try {
      const url = new URL(value);
      if (url.protocol === 'robopulse:' && url.hostname === 'terminal') {
        return decodeURIComponent(url.pathname.replace(/^\/+/, '')).trim().replace(/^[`'"]+|[`'"]+$/g, '');
      }
      const queryToken = url.searchParams.get('terminalQr') || url.searchParams.get('token');
      if (queryToken) return queryToken.trim().replace(/^[`'"]+|[`'"]+$/g, '');
    } catch {
      // Not a URL, continue with compact formats.
    }

    const prefixed = value.match(/^RoboPulse:T:v1:([A-Za-z0-9_-]{16,})$/i);
    if (prefixed) return prefixed[1];
    return '';
  }

  function cameraErrorMessage(error: unknown) {
    const name = error instanceof DOMException || error instanceof Error ? error.name : '';
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      return 'Камера мобильного браузера доступна только через HTTPS. Откройте стенд по HTTPS или используйте внешний QR-сканер.';
    }
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'Доступ к камере запрещен в браузере. Разрешите камеру для сайта или используйте внешний QR-сканер.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Камера на устройстве не найдена. Можно использовать внешний QR-сканер.';
    if (name === 'NotReadableError' || name === 'TrackStartError') return 'Камера занята другим приложением или недоступна устройству. Закройте другое приложение или используйте внешний QR-сканер.';
    return 'Камеру не удалось запустить. Проверьте HTTPS и разрешения браузера или используйте внешний QR-сканер.';
  }

  useEffect(() => {
    function handleHardwareScannerInput(event: KeyboardEvent) {
      if (loading || loginInFlightRef.current || event.altKey || event.ctrlKey || event.metaKey) return;

      const now = Date.now();
      if (now - hardwareScannerLastKeyAtRef.current > 400) hardwareScannerBufferRef.current = '';
      hardwareScannerLastKeyAtRef.current = now;

      if (event.key === 'Enter') {
        const scannedQr = hardwareScannerBufferRef.current.trim();
        const scannedToken = extractTerminalQrToken(scannedQr);
        hardwareScannerBufferRef.current = '';
        if (scannedToken) {
          event.preventDefault();
          submitQr(scannedToken);
        }
        return;
      }

      if (event.key.length === 1) {
        hardwareScannerBufferRef.current = `${hardwareScannerBufferRef.current}${event.key}`.slice(-320);
      }
    }

    window.addEventListener('keydown', handleHardwareScannerInput);
    return () => window.removeEventListener('keydown', handleHardwareScannerInput);
  }, [loading]);

  useEffect(() => {
    let stopped = false;
    const permissionTimer = window.setTimeout(() => {
      if (!stopped && !scannerControlsRef.current && !loginInFlightRef.current) {
        setStatus('Ожидаю разрешение камеры. Внешний QR-сканер можно использовать сразу.');
      }
    }, 1600);

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        window.clearTimeout(permissionTimer);
        setCameraActive(false);
        setStatus('Камера в этом браузере недоступна. Для мобильной камеры нужен HTTPS; внешний QR-сканер можно использовать сразу.');
        return;
      }
      try {
        const video = videoRef.current;
        if (!video) {
          setStatus('Видеоэлемент сканера не готов');
          return;
        }
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result, error, controls) => {
          if (stopped || loginInFlightRef.current) return;
          if (result) {
            const token = extractTerminalQrToken(result.getText());
            if (!token) {
              setError('QR-код считан, но это не QR терминала RoboPulse');
              setStatus('Наведите камеру на QR-код участка.');
              return;
            }
            controls.stop();
            submitQr(token);
            return;
          }
          if (error && !String(error.name || error.message || '').includes('NotFoundException')) {
            setStatus('Камера работает, ищу QR-код участка.');
          }
        });
        window.clearTimeout(permissionTimer);
        if (stopped) {
          controls.stop();
          return;
        }
        scannerControlsRef.current = controls;
        setCameraActive(true);
        setStatus('Наведите камеру на QR-код участка или используйте внешний сканер.');
      } catch (e) {
        window.clearTimeout(permissionTimer);
        setCameraActive(false);
        setStatus('Сканирование камерой не запущено. Внешний QR-сканер можно использовать сразу.');
        setError(cameraErrorMessage(e));
      }
    }
    startScanner();
    return () => {
      stopped = true;
      window.clearTimeout(permissionTimer);
      stopCamera();
    };
  }, []);

  return <div className="auth-shell"><section className="auth-panel qr-panel"><div className="logo">Robo<span>Pulse</span><small>MES</small></div><div className="debug-head"><div><h1>Вход по QR-коду</h1><p className="small">{loading ? 'Проверка QR-кода...' : status}</p></div><button type="button" className="secondary" onClick={onBack}>Назад</button></div>{error && <div className="alert">{error}</div>}<div className={`qr-video-box ${cameraActive ? 'active' : ''}`}><video ref={videoRef} muted playsInline autoPlay /></div></section></div>;
}

function LoginScreen({ onLogin, terminalAppMode = false, onChangeServer }: { onLogin: (user: AuthUser) => void; terminalAppMode?: boolean; onChangeServer?: () => void }) {
  const [login, setLogin] = useState(terminalAppMode ? '' : 'dispatcher');
  const [password, setPassword] = useState(terminalAppMode ? '' : 'dispatcher');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(payload, 'Не удалось войти'));
      onLogin(payload.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }
  return <div className="auth-shell"><form className="auth-panel" onSubmit={submit}><div className="logo">Robo<span>Pulse</span><small>{terminalAppMode ? 'Terminal' : 'MES'}</small></div><h1>Вход на рабочее место</h1>{error && <div className="alert">{error}</div>}<input value={login} onChange={e=>setLogin(e.target.value)} placeholder="Логин пользователя" autoFocus /><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль" type="password" /><button disabled={loading}>{loading ? 'Проверка...' : 'Войти'}</button>{onChangeServer && <button type="button" className="secondary" onClick={onChangeServer}>Сменить сервер</button>}{!terminalAppMode && <a className="debug-link" href="#debug-profiles">Профили для отладки</a>}</form></div>;
}

function DebugProfilesScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [profiles, setProfiles] = useState<DebugProfile[]>([]);
  const [error, setError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState('');

  useEffect(() => {
    getJson<{ users: DebugProfile[] }>(`${API}/auth/debug-profiles`)
      .then((data) => setProfiles(data.users))
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить профили'));
  }, []);

  async function loginAs(profile: DebugProfile) {
    setLoadingLogin(profile.login);
    setError('');
    try {
      const res = await fetch(`${API}/auth/debug-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: profile.login }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(payload, 'Не удалось войти'));
      onLogin(payload.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось войти');
      setLoadingLogin('');
    }
  }

  return <div className="auth-shell"><section className="auth-panel debug-panel"><div className="logo">Robo<span>Pulse</span><small>MES</small></div><div className="debug-head"><div><h1>Профили для отладки</h1><p className="small">Отладочный вход доступен только при включенном режиме ENABLE_DEBUG_LOGIN.</p></div><a className="debug-back" href="#">Назад</a></div>{error && <div className="alert">{error}</div>}{!profiles.length && !error && <div className="loading">Загрузка профилей...</div>}<div className="debug-profile-list">{profiles.map(profile => <button key={profile.id} type="button" className="debug-profile" disabled={Boolean(loadingLogin)} onClick={() => loginAs(profile)}><span><b>{profile.displayName}</b><small>{profile.login} · {profile.role}</small>{profile.workCenterSection && <small>{profile.workCenterSection}</small>}</span><strong>{loadingLogin === profile.login ? '...' : 'Войти'}</strong></button>)}</div></section></div>;
}

function DispatchDashboard({ onOpenOrder, fallbackOrders, fallbackLoads }: { onOpenOrder: (item: DispatchOrder) => void; fallbackOrders: Order[]; fallbackLoads: SectionLoad[] }) {
  const [data, setData] = useState<DispatchDashboardData | null>(null);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => { let ignore = false; getJson<DispatchDashboardData>(`${API}/dispatch/dashboard`).then((json) => { if (!ignore) setData(json); }).catch((e) => setError(e.message)); return () => { ignore = true; }; }, []);
  const orders = data?.orders || fallbackOrders.map((o) => ({ ...o, sourceType: 'order' as const, displayId: o.orderNumber, ready: o.progress >= 100, overdue: false }));
  const loads = data?.sectionLoad || fallbackLoads;
  const sections = Array.from(new Set(orders.map((o: DispatchOrder) => o.currentStage?.section).filter(Boolean) as string[]));
  const filtered = orders.filter((o: DispatchOrder) => {
    const text = `${o.displayId || o.orderNumber} ${o.productCode} ${o.code || ''} ${o.productName || ''} ${o.customer || ''} ${o.operator || ''} ${o.sourceType === 'production-run' ? 'ручная партия' : ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!section || o.currentStage?.section === section) && (status === 'all' || (status === 'overdue' ? o.overdue : status === 'ready' ? o.ready : o.currentStage?.status === status));
  });
  const kpi = data?.kpi || { orders: orders.length, avgProgress: orders.length ? Math.round(orders.reduce((s, o) => s + o.progress, 0) / orders.length) : 0, inWork: orders.filter((o: DispatchOrder) => o.currentStage?.status === 'work').length, paused: orders.filter((o: DispatchOrder) => o.currentStage?.status === 'paused').length, overdue: orders.filter((o: DispatchOrder) => o.overdue).length, ready: orders.filter((o: DispatchOrder) => o.ready).length };
  return <>
    <PageTitle title="Диспетчерская" subtitle="Контроль заказов и партий производства, готовности, текущих этапов и загрузки участков" />
    {error && <div className="alert">{error}. Показаны базовые данные.</div>}
    <div className="kpis"><Kpi title="Объектов" value={kpi.orders} /><Kpi title="Средняя готовность" value={`${kpi.avgProgress}%`} /><Kpi title="В работе" value={kpi.inWork} /><Kpi title="На паузе" value={kpi.paused || 0} tone="warn" /><Kpi title="Просрочено" value={kpi.overdue} tone="danger" /><Kpi title="Готово" value={kpi.ready} tone="success" /></div>
    <section className="card"><div className="filters"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по заказу, партии, изделию, заказчику" /><select value={section} onChange={e=>setSection(e.target.value)}><option value="">Все участки</option>{sections.map(s=><option key={s}>{s}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Все статусы</option><option value="work">В работе</option><option value="paused">Пауза</option><option value="queued">Очередь</option><option value="new">Ожидают</option><option value="ready">Готовые</option><option value="overdue">Просроченные</option></select></div><DispatchTable orders={filtered} onOpenOrder={onOpenOrder} /></section>
    <section className="card"><h2>Загрузка участков</h2><LoadBars loads={loads} /></section>
  </>;
}

function DispatchTable({ orders, onOpenOrder }: { orders: DispatchOrder[]; onOpenOrder: (item: DispatchOrder) => void }) {
  if (!orders.length) return <Empty text="Производственные объекты не найдены" />;
  return <table><thead><tr><th>Тип</th><th>Заказ / партия</th><th>Изделие</th><th>Приоритет</th><th>Срок</th><th>Готовность</th><th>Текущий этап</th><th>Участок</th><th>Статус</th></tr></thead><tbody>{orders.map(o=><tr key={`${o.sourceType || 'order'}-${o.id}`} onClick={()=>onOpenOrder(o)} className={`clickable ${o.sourceType === 'production-run' ? 'production-row' : ''}`}><td><span className={`source-badge ${o.sourceType === 'production-run' ? 'production' : 'order'}`}>{o.sourceType === 'production-run' ? 'Партия' : 'Заказ'}</span>{o.isWithoutOrder && <div className="small">номер не указан</div>}</td><td><b>{displayOrderNumber(o.orderNumber || o.displayId)}</b><div className="small">{o.sourceType === 'production-run' ? (o.operator ? `инициатор: ${o.operator}` : 'ручная партия') : (o.customer || 'заказчик не указан')}</div></td><td>{o.productCode}<div className="small">{o.productName}</div></td><td><span className={`priority ${o.priority || 'normal'}`}>{priorityLabel(o.priority)}</span></td><td className={o.overdue?'text-danger':''}>{date(o.dueDate)}</td><td><b>{o.progress}%</b><div className="bar"><i style={{width:`${o.progress}%`}} /></div></td><td>{displayOperationTitle(o.currentStage)}{o.currentStage?.blockedBy?.length ? <div className="small text-danger">Ожидает: {displayBlockedBy(o.currentStage.blockedBy)}</div> : null}</td><td>{o.currentStage?.section || '—'}</td><td><span className={`status ${o.ready ? 'done' : o.currentStage?.status || 'new'}`}>{o.ready ? statusLabel('done') : (o.readableStatus || statusLabel(o.currentStage?.status || 'new'))}</span></td></tr>)}</tbody></table>;
}

function ProductionPlan({ events = [], referenceSections = [] }: { events?: TerminalRecentEvent[]; referenceSections?: string[] }) {
  const [data, setData] = useState<ProductionPlanData | null>(null);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [launch, setLaunch] = useState<ProductionLaunch | null>(null);
  const [selectedPlanOrderIds, setSelectedPlanOrderIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState('');
  async function loadPlan() { setError(''); try { setData(await getJson<ProductionPlanData>(`${API}/production/plan`)); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка плана производства'); } }
  useEffect(() => {
    loadPlan();
    const timer = window.setInterval(loadPlan, APP_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);
  const runs = data?.runs || [];
  const loads = data?.sectionLoad || [];
  const sections = Array.from(new Set([...referenceSections, ...(data?.orders || []).flatMap(o => o.stages.map(s => s.section)), ...loads.map(l => l.section)].filter(Boolean))).sort();
  const runReadyToRelease = (run: ProductionRun) => (run.units || []).some(unit => unit.canReleaseNext && unit.dispatchStatus !== 'done');
  const runBlocked = (run: ProductionRun) => (run.units || []).some(unit => !unit.canReleaseNext && (unit.nextBlockedOperations?.length || 0) > 0 && unit.status !== 'done');
  const runInWork = (run: ProductionRun) => run.status === 'work' || run.status === 'paused' || (run.units || []).some(unit => unit.status === 'work' || unit.status === 'paused');
  const orderMatchesQuickFilter = (order: PlanOrder) => {
    if (quickFilter === 'ready') return order.availableQuantity > 0;
    if (quickFilter === 'work') return order.stages.some(stage => stage.status === 'work' || stage.status === 'paused') || order.runs.some(runInWork);
    if (quickFilter === 'blocked') return order.runs.some(runBlocked);
    if (quickFilter === 'overdue') return order.overdue;
    if (quickFilter === 'needs') return order.overdue || order.availableQuantity > 0 || order.runs.some(run => runBlocked(run) || runReadyToRelease(run));
    return true;
  };
  const runMatchesQuickFilter = (run: ProductionRun) => {
    if (quickFilter === 'ready') return runReadyToRelease(run);
    if (quickFilter === 'work') return runInWork(run);
    if (quickFilter === 'blocked') return runBlocked(run);
    if (quickFilter === 'overdue') return false;
    if (quickFilter === 'needs') return runReadyToRelease(run) || runBlocked(run);
    return true;
  };
  const orders = (data?.orders || []).filter(o => {
    const text = `${o.orderNumber} ${o.productCode} ${o.productName || ''} ${o.comment || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!section || o.stages.some(s => s.section === section)) && orderMatchesQuickFilter(o);
  });
  const runUnits = runs.flatMap(run => (run.units || []).map(unit => ({ run, unit })));
  const filteredRuns = runs.filter(run => {
    const text = `${run.orderNumber || ''} ${run.batchNumber || ''} ${run.batchName || ''} ${run.productCode} ${run.productName} ${run.operator || ''}`.toLowerCase();
    const inSection = !section || (run.units || []).some(unit => unit.operations.some(op => op.section === section && op.status !== 'done'));
    return (!query || text.includes(query.toLowerCase())) && inSection && runMatchesQuickFilter(run);
  });
  const readyToRelease = runUnits.filter(({ unit }) => unit.canReleaseNext && unit.dispatchStatus !== 'done');
  const inWorkUnits = runUnits.filter(({ unit }) => unit.status === 'work' || unit.status === 'paused');
  const blockedUnits = runUnits.filter(({ unit }) => !unit.canReleaseNext && (unit.nextReadyOperations?.length || 0) === 0 && (unit.nextBlockedOperations?.length || 0) > 0 && unit.status !== 'done');
  const hotLoads = [...loads].filter(l => l.remainingHours > 0).sort((a, b) => (b.loadPct - a.loadPct) || (b.remainingHours - a.remainingHours)).slice(0, 6);
  const batchCount = Array.from(new Set(runs.map(run => run.batchNumber || run.id))).length;
  async function submitLaunch(e: React.FormEvent) {
    e.preventDefault(); if (!launch) return;
    const res = await fetch(`${API}/production/launch`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(launch) });
    if (!res.ok) return alert(apiErrorMessage(await res.json(), 'Не удалось запустить изделия'));
    setLaunch(null); await loadPlan();
  }
  async function launchSelectedBatch() {
    const selectedOrders = orders.filter(order => selectedPlanOrderIds.has(order.id) && order.availableQuantity > 0);
    if (!selectedOrders.length) return;
    const selectedQuantity = selectedOrders.reduce((sum, order) => sum + order.availableQuantity, 0);
    const products = Array.from(new Set(selectedOrders.map(order => order.productCode))).length;
    if (!window.confirm(`Запустить партию: ${selectedOrders.length} заказов, ${products} номенклатур, ${selectedQuantity} шт.?`)) return;
    const res = await fetch(`${API}/production/batches`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ priority:'normal', operator:'Диспетчер', comment:'Партия из множественного выбора', items:selectedOrders.map(order => ({ orderNumber:order.orderNumber, productId:order.productId, productCode:order.productCode, productName:order.productName, quantity:order.availableQuantity })) }) });
    if (!res.ok) return alert(apiErrorMessage(await res.json(), 'Не удалось запустить партию'));
    setSelectedPlanOrderIds(new Set());
    await loadPlan();
  }
  const startLaunch = (o: PlanOrder) => setLaunch({ orderNumber:o.orderNumber, productId:o.productId, productCode:o.productCode, productName:o.productName, max:o.availableQuantity, quantity:Math.min(5, Math.max(1, o.availableQuantity)), priority:'normal', comment:'' });
  return <>
    <PageTitle title="Рабочее место диспетчера" subtitle="Запуск номенклатуры, передача операций на участки и короткий контроль узких мест" />
    {error && <div className="alert">{error}</div>}
    <section className="card">
      <div className="card-head"><div><h2>Производственный документ</h2><p className="small">Партии сгруппированы по номенклатуре и заказу; группы можно сворачивать.</p></div></div>
      <PlanUnits runs={filteredRuns} />
    </section>
    <div className="dispatch-summary">
      <Kpi title="К запуску из заказов" value={orders.reduce((sum, order) => sum + order.availableQuantity, 0)} />
      <Kpi title="Единиц в потоке" value={runUnits.length} />
      <Kpi title="Передать на участки" value={readyToRelease.length} tone={readyToRelease.length ? 'warn' : ''} />
      <Kpi title="В работе / пауза" value={inWorkUnits.length} />
      <Kpi title="Ожидают зависимостей" value={blockedUnits.length} tone={blockedUnits.length ? 'danger' : ''} />
      <Kpi title="Готово" value={data?.kpi.ready || 0} tone="success" />
    </div>
    <section className="card dispatch-focus">
      <div className="dispatch-focus-head"><div><h2>Сейчас в управлении</h2><p className="small">Партии, единицы и блокировки по активному плану</p></div><span className="queue-count">{batchCount}</span></div>
      <div className="dispatch-focus-grid">
        <div><span>Партии</span><b>{batchCount}</b><p>{runUnits.length} единиц в работе или ожидании</p></div>
        <div><span>Передать дальше</span><b>{readyToRelease.length}</b><p>{readyToRelease.slice(0, 3).map(({ run, unit }) => `${displayRunTitle(run)}: ${unit.unitNo}/${run.launchedQuantity || run.quantity}`).join(' · ') || 'нет готовых передач'}</p></div>
        <div><span>Блокировки</span><b>{blockedUnits.length}</b><p>{blockedUnits.slice(0, 3).map(({ run, unit }) => `${displayRunTitle(run)}: ${displayBlockedBy(unit.nextBlockedOperations) || 'ожидает предыдущую операцию'}`).join(' · ') || 'критичных блокировок нет'}</p></div>
      </div>
    </section>
    <section className="card top-filter-card dispatch-toolbar"><div className="filters"><input name="dispatch-plan-search" aria-label="Поиск по плану диспетчера" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск: заказ, партия, номенклатура, инициатор" /><select name="dispatch-plan-section" aria-label="Участок плана" value={section} onChange={e=>setSection(e.target.value)}><option value="">Все участки</option>{sections.map(s=><option key={s}>{s}</option>)}</select><button onClick={loadPlan}>Обновить</button></div><div className="segmented dispatch-quick-filter" role="group" aria-label="Быстрые фильтры диспетчера">{[{ key:'all', label:'Все' }, { key:'needs', label:'Требует решения' }, { key:'ready', label:'Готово к запуску' }, { key:'work', label:'В работе' }, { key:'blocked', label:'Заблокировано' }, { key:'overdue', label:'Просрочено' }].map(item => <button key={item.key} type="button" className={quickFilter === item.key ? '' : 'light-btn'} onClick={()=>setQuickFilter(item.key)}>{item.label}</button>)}</div></section>
    <DispatchActionBoard inWork={inWorkUnits} loads={hotLoads} />
    <div className="dispatcher-layout">
      <section className="card launch-workbench">
        <div className="card-head"><div><h2>Партия из заказов</h2><p className="small">Сначала выберите заказ или номенклатурную группу, затем подтвердите количество и приоритет.</p></div></div>
        <PlanOrdersTable orders={orders} selectedIds={selectedPlanOrderIds} onToggle={(order)=>setSelectedPlanOrderIds(prev => { const next = new Set(prev); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); return next; })} onLaunch={startLaunch} onBatchLaunch={launchSelectedBatch} />
        <div className="launch-groups"><h3>Группировка по номенклатуре</h3><PlanGroups groups={data?.groups || []} onLaunch={startLaunch} /></div>
      </section>
      <aside className="dispatch-side">
        <section className="card">
          <h2>Быстрая партия</h2>
          {launch ? <LaunchForm launch={launch} setLaunch={setLaunch} submitLaunch={submitLaunch} /> : <Empty text="Выберите заказ или группу номенклатуры для партии" />}
        </section>
        <DispatchEventFeed events={events} />
        <details className="card collapsible-load-card">
          <summary><div><h2>Загрузка участков</h2><p className="small">{loadSummary(loads)}</p></div><span className="collapse-indicator"><span className="show">Показать</span><span className="hide">Скрыть</span></span></summary>
          <SectionLoadCompact loads={hotLoads} />
        </details>
      </aside>
    </div>
  </>;
}

function LaunchForm({ launch, setLaunch, submitLaunch }: { launch: ProductionLaunch; setLaunch: (launch: ProductionLaunch | null) => void; submitLaunch: (e: React.FormEvent) => void }) {
  return <form className="launch-form" onSubmit={submitLaunch}>
    <div className="launch-summary">
      <span>Итог партии</span>
      <b>{launch.quantity} шт. · {priorityLabel(launch.priority)}</b>
      <p>{launch.orderNumber} · {launch.productCode} {launch.productName || ''}</p>
    </div>
    <label><span>Заказ</span><input name="launch-order-number" value={launch.orderNumber} readOnly /></label>
    <label><span>Номенклатура</span><input name="launch-product" value={`${launch.productCode} ${launch.productName || ''}`} readOnly /></label>
    <label><span>Количество</span><input name="launch-quantity" type="number" min="1" max={launch.max} value={launch.quantity} onChange={e=>setLaunch({...launch, quantity:Math.min(launch.max, Math.max(1, Number(e.target.value)||1))})} /></label>
    <label><span>Приоритет</span><select name="launch-priority" value={launch.priority} onChange={e=>setLaunch({...launch, priority:e.target.value as Priority})}><option value="high">Высокий</option><option value="normal">Обычный</option><option value="low">Низкий</option></select></label>
    <label><span>Комментарий</span><input name="launch-comment" value={launch.comment} onChange={e=>setLaunch({...launch, comment:e.target.value})} placeholder="Исполнитель, смена или причина партии" /></label>
    <div className="launch-actions"><button disabled={!launch.max}>Запустить {launch.quantity} шт.</button><button type="button" className="secondary" onClick={()=>setLaunch(null)}>Отмена</button></div>
    <p className="small">Остаток по заказу: {launch.max} шт.</p>
  </form>;
}

function DispatchActionBoard({ inWork, loads }: { inWork: Array<{ run: ProductionRun; unit: ProductionUnit }>; loads: SectionLoad[] }) {
  return <section className="dispatch-board">
    <DispatchLane title="В работе и паузе" tone="work" items={inWork.slice(0, 6)} empty="Активных единиц нет" />
    <details className="card dispatch-lane load-lane collapsible-load-card"><summary><div><h2>Узкие места</h2><p className="small">{loadSummary(loads)}</p></div><span className="collapse-indicator"><span className="show">Показать</span><span className="hide">Скрыть</span></span></summary>{loads.length ? <div className="load-chip-list">{loads.map(load=><div className="load-chip" key={load.section}><div><b>{load.section}</b><span>{loadShortLabel(load)}</span></div><strong className={load.loadPct>100?'text-danger':''}>{load.loadPct}%</strong></div>)}</div> : <Empty text="Нет загрузки по участкам" />}</details>
  </section>;
}

function DispatchEventFeed({ events }: { events: TerminalRecentEvent[] }) {
  const visible = events.slice(0, 8);
  return <section className="card dispatch-events"><div className="card-head"><div><h2>Последние события</h2><p className="small">Старт, пауза, завершение и передачи по заказам и партиям</p></div></div>{visible.length ? <div className="dispatch-event-list">{visible.map(event => <div key={event.id} className="dispatch-event"><span className={`source-badge ${event.sourceType === 'production-run' ? 'production' : 'order'}`}>{event.sourceType === 'production-run' ? 'Партия' : 'Заказ'}</span><div><b>{event.eventType} · {event.title || 'операция'}</b><p>{event.title}</p><small>{displayOrderNumber(event.orderNumber || event.runId)}{event.unitLabel ? ` · ед. ${event.unitLabel}` : ''}{event.actor ? ` · ${event.actor}` : ''} · {new Date(event.timestamp).toLocaleString('ru-RU')}</small></div></div>)}</div> : <Empty text="Событий пока нет" />}</section>;
}

function DispatchLane({ title, tone, items, empty, onReleased }: { title: string; tone: string; items: Array<{ run: ProductionRun; unit: ProductionUnit }>; empty: string; onReleased?: () => void }) {
  async function release(run: ProductionRun, unit: ProductionUnit) {
    const res = await fetch(`${API}/production/runs/${encodeURIComponent(run.id)}/units/${encodeURIComponent(unit.unitId)}/dispatch/release`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ operator:'Диспетчер' }) });
    if (!res.ok) return alert(apiErrorMessage(await res.json(), 'Не удалось передать следующие процессы в работу'));
    await onReleased?.();
  }
  return <section className={`card dispatch-lane ${tone}`}><h2>{title}</h2>{items.length ? <div className="dispatch-lane-list">{items.map(({run, unit}) => { const current = currentUnitOperation(unit); return <div className="dispatch-task" key={`${title}-${unit.unitId}`}><div><b>{displayRunTitle(run)}</b><span>{unit.unitNo}/{run.launchedQuantity || run.quantity} · {run.productName}</span></div><p>{current?.section || 'участок не определен'} · {displayOperationTitle(current)}</p><div className="task-meta"><span className={`status ${unit.status}`}>{runStatusLabel(unit.status)}</span><small>{unit.progress}% · готово к старту {unit.nextReadyOperations?.length || 0}</small></div>{onReleased && <button disabled={!unit.canReleaseNext || unit.dispatchStatus === 'done'} onClick={()=>release(run, unit)}>Передать</button>}</div>; })}</div> : <Empty text={empty} />}</section>;
}

function PlanOrdersTable({ orders, selectedIds, onToggle, onLaunch, onBatchLaunch }: { orders: PlanOrder[]; selectedIds: Set<number>; onToggle: (order: PlanOrder) => void; onLaunch: (order: PlanOrder) => void; onBatchLaunch: () => void }) {
  if (!orders.length) return <Empty text="Заказы в плане не найдены" />;
  const selectedAvailable = orders.filter(order => selectedIds.has(order.id) && order.availableQuantity > 0);
  const selectedQuantity = selectedAvailable.reduce((sum, order) => sum + order.availableQuantity, 0);
  const selectedProducts = Array.from(new Set(selectedAvailable.map(order => order.productCode))).length;
  return <><div className="batch-toolbar"><div><b>Выбрано: {selectedAvailable.length}</b><span>{selectedQuantity} шт. · {selectedProducts} номенклатур</span></div><button disabled={!selectedAvailable.length} onClick={onBatchLaunch}>Запустить партию</button></div><table><thead><tr><th>Выбор</th><th>Заказ</th><th>Номенклатура</th><th>Кол-во</th><th>КД / комментарий</th><th>Дата отгрузки</th><th>Готовность</th><th>Этапы</th><th>Действия</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className={selectedIds.has(o.id) ? 'selected-row' : ''}><td><input name={`plan-order-${o.id}`} type="checkbox" checked={selectedIds.has(o.id)} disabled={o.availableQuantity<=0} onChange={()=>onToggle(o)} /></td><td><b>{o.orderNumber}</b><div className="small">запущено {o.launchedQuantity}, готово {o.readyQuantity}</div></td><td>{o.productCode}<div className="small">{o.productName}</div></td><td>{o.quantity}<div className="small">доступно {o.availableQuantity}</div></td><td><b>{o.kd || 'КД не указана'}</b><div className="small">{o.comment || '—'}</div></td><td className={o.overdue?'text-danger':''}>{date(o.shipmentDate)}</td><td><b>{o.progress}%</b><div className="bar"><i style={{width:`${o.progress}%`}} /></div></td><td><div className="stage-line">{o.stages.map(s=><span key={`${o.id}-${s.operationCode}`} className={`status ${s.status}`}>{s.section}</span>)}</div></td><td><button disabled={o.availableQuantity<=0} onClick={()=>onLaunch(o)}>Запустить часть</button></td></tr>)}</tbody></table></>;
}

function PlanGroups({ groups, onLaunch }: { groups: PlanGroup[]; onLaunch: (order: PlanOrder) => void }) {
  if (!groups.length) return <Empty text="Группы номенклатуры не найдены" />;
  return <div className="group-list">{groups.map(g=><details key={g.productCode}><summary><b>{g.productName || g.productCode}</b><span>{g.quantity} шт · доступно {g.availableQuantity} · в партиях {g.launchedQuantity} · готово {g.readyQuantity}</span></summary><div className="group-orders">{g.orders.map(o=><div key={o.id} className="group-order"><span>{o.orderNumber}</span><b>{o.availableQuantity}/{o.quantity} доступно</b><button disabled={o.availableQuantity<=0} onClick={()=>onLaunch(o)}>В партию</button></div>)}</div></details>)}</div>;
}

type PlanProductGroup = { key: string; productCode: string; productName: string; orderNumber: string; runs: ProductionRun[]; units: Array<{ run: ProductionRun; unit: ProductionUnit }> };

function PlanGroupBlocks({ units }: { units: Array<{ run: ProductionRun; unit: ProductionUnit }> }) {
  const operations = units.flatMap(({ unit }) => unit.operations.map(op => ({ ...op, unitNo: unit.unitNo, unitId: unit.unitId })));
  const blocks = buildOperationControlBlocks(operations).slice(0, 6);
  if (!blocks.length) return null;
  return <div className="plan-block-strip">{blocks.map(block => <div key={block.key} className={`plan-block-chip ${block.category === 'Панель' ? 'panel' : block.category === 'Печь' ? 'furnace' : ''}`}><div><span>{block.category}</span><b>{block.title}</b></div><strong>{block.progress}%</strong><small>{block.current ? `${displayOperationTitle(block.current)} · ${block.current.section}` : 'активной операции нет'}</small><em>{block.unitNo ? `${block.unitNo} из ${block.unitCount}` : `${block.unitCount} ед.`}</em></div>)}</div>;
}

function PlanUnits({ runs }: { runs: ProductionRun[] }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  if (!runs.length) return <Empty text="Поштучные партии пока не созданы" />;
  const toggleGroup = (key: string) => setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const grouped = runs.reduce<PlanProductGroup[]>((acc, run) => {
    const orderNumber = run.orderNumber || '';
    const key = `${run.productId || run.productCode}-${orderNumber || 'without-order'}`;
    let group = acc.find(item => item.key === key);
    if (!group) {
      group = { key, productCode: run.productCode, productName: run.productName, orderNumber, runs: [], units: [] };
      acc.push(group);
    }
    group.runs.push(run);
    (run.units || []).forEach(unit => group?.units.push({ run, unit }));
    return acc;
  }, []);
  return <div className="plan-doc"><table className="plan-doc-table"><thead><tr><th>Номенклатура / заказ</th><th>Партия</th><th>Единица</th><th>Следующий участок и операция</th><th>Статус</th><th>Прогресс</th></tr></thead>{grouped.map(group => {
    const collapsed = collapsedGroups.has(group.key);
    const quantity = group.runs.reduce((sum, run) => sum + (run.launchedQuantity || run.quantity || 0), 0);
    const active = group.units.filter(({ unit }) => unit.status === 'work' || unit.status === 'paused').length;
    const progress = group.units.length ? Math.round(group.units.reduce((sum, { unit }) => sum + unit.progress, 0) / group.units.length) : 0;
    return <tbody key={group.key} className={collapsed ? 'plan-group-collapsed' : ''}><tr className="plan-product-row"><td colSpan={6}><div className="plan-product-head"><button type="button" className="light-btn plan-group-toggle" aria-expanded={!collapsed} onClick={()=>toggleGroup(group.key)}>{collapsed ? 'Развернуть' : 'Свернуть'}</button><div><b>{group.productName || 'Номенклатура без названия'}</b><span>{group.productCode}{group.orderNumber ? ` · заказ ${displayOrderNumber(group.orderNumber)}` : ' · без заказа'}</span></div></div><div className="plan-product-metrics"><span>Партий: {group.runs.length}</span><span>Единиц: {quantity}</span><span>Активно: {active}</span><span>Прогресс: {progress}%</span></div></td></tr>{!collapsed && group.runs.map(run => { const units = run.units || []; return units.map((unit, index) => { const current = currentUnitOperation(unit); return <tr className={unit.canReleaseNext && unit.dispatchStatus !== 'done' ? 'needs-action' : ''} key={unit.unitId}><td>{index === 0 ? <><b>{displayRunTitle(run)}</b><span>{run.operator || run.comment || 'ручной запуск заказа'}</span></> : null}</td><td>{index === 0 ? <><b>{date(run.createdAt)}</b><span>{priorityLabel(run.priority)}</span><details className="technical-details"><summary>Технические данные</summary><small>{run.id}</small></details></> : null}</td><td><b>{unit.unitNo}/{run.launchedQuantity || run.quantity}</b></td><td><b>{current?.section || 'нет участка'}</b><span>{displayOperationDetail(current)}</span></td><td><span className={`status ${unit.status}`}>{runStatusLabel(unit.status)}</span></td><td><div className="plan-progress"><span>{unit.progress}%</span><div className="bar"><i style={{width:`${unit.progress}%`}} /></div></div></td></tr>; }); })}</tbody>;
  })}</table></div>;
}

function currentUnitOperation(unit: ProductionUnit) {
  return unit.operations.find(op => op.status === 'work')
    || unit.operations.find(op => op.status === 'paused')
    || unit.operations.find(op => op.status !== 'done')
    || unit.operations[unit.operations.length - 1]
    || null;
}

function controlBlockTitle(op: { partOrAssembly?: string; name?: string }) {
  const text = `${op.partOrAssembly || ''} ${op.name || ''}`.toLowerCase();
  if (text.includes('блок управления')) return 'Блок управления';
  if (text.includes('верхн') && text.includes('панел')) return 'Верхняя панель';
  if (text.includes('нижн') && text.includes('панел')) return 'Нижняя панель';
  if (text.includes('передн') && text.includes('панел')) return 'Передняя панель';
  if (text.includes('задн') && text.includes('панел')) return 'Задняя панель';
  if (text.includes('средн') && text.includes('панел')) return 'Средняя панель';
  if (text.includes('монтажн') && text.includes('панел')) return 'Монтажная панель';
  if (text.includes('боков')) return 'Боковины печи';
  if (text.includes('корпус печи') || text.includes('печ')) return 'Корпус печи';
  return op.partOrAssembly || 'Общий маршрут';
}

function controlBlockCategory(title: string) {
  const text = title.toLowerCase();
  if (text.includes('панел')) return 'Панель';
  if (text.includes('печ') || text.includes('боков')) return 'Печь';
  if (text.includes('блок управления')) return 'Блок управления';
  return 'Узел';
}

function flattenProductionRunOperations(run: ProductionRun): ControlBlockOperation[] {
  if (run.units?.length) return run.units.flatMap(unit => unit.operations.map(op => ({ ...op, unitNo: unit.unitNo, unitId: unit.unitId })));
  return run.operations.map(op => ({ ...op, unitNo: 1, unitId: run.id }));
}

function buildOperationControlBlocks(operations: ControlBlockOperation[]): OperationControlBlock[] {
  const groups = new Map<string, { title: string; category: string; operations: ControlBlockOperation[] }>();
  operations.forEach(op => {
    const title = controlBlockTitle(op);
    const key = title.toLowerCase();
    const group = groups.get(key) || { title, category: controlBlockCategory(title), operations: [] };
    group.operations.push(op);
    groups.set(key, group);
  });
  return Array.from(groups.entries()).map(([key, group]) => {
    const sorted = [...group.operations].sort((a, b) => ((a.unitNo || 0) - (b.unitNo || 0)) || (a.sequence - b.sequence));
    const stagesByCode = new Map<string, ControlBlockOperation>();
    sorted.forEach(op => { if (!stagesByCode.has(op.operationId)) stagesByCode.set(op.operationId, op); });
    const total = sorted.length;
    const done = sorted.filter(op => op.status === 'done').length;
    const work = sorted.filter(op => op.status === 'work').length;
    const paused = sorted.filter(op => op.status === 'paused').length;
    const queued = sorted.filter(op => op.status === 'queued').length;
    const unitNos = Array.from(new Set(sorted.map(op => op.unitNo).filter((value): value is number => typeof value === 'number'))).sort((a, b) => a - b);
    const current = sorted.find(op => op.status === 'work')
      || sorted.find(op => op.status === 'paused')
      || sorted.find(op => op.status === 'queued' && op.canStart)
      || sorted.find(op => op.status === 'queued');
    return {
      key,
      title: group.title,
      category: group.category,
      operations: sorted,
      stages: Array.from(stagesByCode.values()).sort((a, b) => a.sequence - b.sequence),
      sections: Array.from(new Set(sorted.map(op => op.section))).sort(),
      total,
      done,
      work,
      paused,
      queued,
      progress: total ? Math.round((done / total) * 100) : 0,
      normHours: sorted.reduce((sum, op) => sum + Number(op.normHours || 0), 0),
      actualHours: sorted.reduce((sum, op) => sum + Number(op.actualHours || 0), 0),
      groupCapable: sorted.filter(op => op.groupCapable).length,
      unitCount: unitNos.length,
      unitNo: current?.unitNo,
      current,
    };
  }).sort((a, b) => (a.stages[0]?.sequence || 0) - (b.stages[0]?.sequence || 0));
}

function SectionLoadCompact({ loads }: { loads: SectionLoad[] }) {
  if (!loads.length) return <Empty text="Нет активной загрузки" />;
  return <div className="section-load-compact">{loads.map(load=><div key={load.section}><div><b>{load.section}</b><span>{loadResourceLabel(load)}</span></div><div className="bar"><i style={{width:`${Math.min(load.loadPct, 160)}%`}} /></div><strong className={load.loadPct>100?'text-danger':''}>{load.loadPct}%</strong></div>)}</div>;
}

const PROCESS_PHASE_LABELS: Record<ProcessGraphPhase, string> = { done: 'Выполнено', current: 'Текущая', ready: 'Готова к старту', blocked: 'Заблокирована', upcoming: 'Предстоящая' };

function ProcessGraphView() {
  const [data, setData] = useState<ProcessGraphData | null>(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function loadGraph(key = selectedKey, silent = false) {
    if (!silent) setLoading(true); setError('');
    try {
      const [runId, unitId] = key.split('|');
      const suffix = runId && unitId ? `?runId=${encodeURIComponent(runId)}&unitId=${encodeURIComponent(unitId)}` : '';
      const json = await getJson<ProcessGraphData>(`${API}/production/process-graph${suffix}`);
      setData(json);
      const nextKey = key || (json.graph ? `${json.graph.metadata.runId}|${json.graph.metadata.unitId}` : json.units[0] ? `${json.units[0].runId}|${json.units[0].unitId}` : '');
      setSelectedKey(nextKey);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка графа процесса'); } finally { if (!silent) setLoading(false); }
  }
  useEffect(() => { loadGraph(''); }, []);
  useEffect(() => { if (selectedKey) loadGraph(selectedKey); }, [selectedKey]);
  useEffect(() => {
    const timer = window.setInterval(() => loadGraph(selectedKey, true), APP_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [selectedKey]);
  const selectedUnit = data?.units.find(unit => `${unit.runId}|${unit.unitId}` === selectedKey) || data?.units[0] || null;
  return <>
    <PageTitle title="Граф процесса" subtitle="Поштучный граф этапов изготовления: сделанные, текущие, готовые к старту, заблокированные и предстоящие операции" />
    {error && <div className="alert">{error}</div>}{loading && <div className="loading">Загрузка графа процесса...</div>}
    <section className="card top-filter-card"><div className="filters process-graph-filter"><select value={selectedKey} onChange={e=>setSelectedKey(e.target.value)}><option value="">Выберите позицию изготовления</option>{(data?.units || []).map(unit=><option key={`${unit.runId}|${unit.unitId}`} value={`${unit.runId}|${unit.unitId}`}>{displayOrderNumber(unit.orderNumber)} · {unit.productName} · позиция {unit.unitLabel} · {runStatusLabel(unit.status)}</option>)}</select><button onClick={()=>loadGraph(selectedKey)}>Обновить</button></div>{selectedUnit && <p className="small">Заказ/партия: <b>{displayOrderNumber(selectedUnit.orderNumber)}</b> · номенклатура: <b>{selectedUnit.productName}</b> · позиция: <b>{selectedUnit.unitLabel}</b> · статус: <b>{runStatusLabel(selectedUnit.status)}</b></p>}</section>
    {data?.graph ? <ProcessGraphPanel graph={data.graph} unit={selectedUnit} /> : <section className="card"><Empty text="Нет активных поштучных запусков для построения графа" /></section>}
  </>;
}

function ProcessGraphPanel({ graph, unit }: { graph: ProcessGraph; unit: ProcessGraphUnit | null }) {
  const current = graph.nodes.find(node => node.phase === 'current') || graph.nodes.find(node => node.phase === 'ready') || graph.nodes.find(node => node.phase === 'blocked') || null;
  return <>
    <div className="kpis process-summary"><Kpi title="Готовность" value={`${graph.metadata.progress}%`} /><Kpi title="Выполнено" value={graph.summary.done} tone="success" /><Kpi title="Текущих" value={graph.summary.current} /><Kpi title="Готово к старту" value={graph.summary.ready} /><Kpi title="Заблокировано" value={graph.summary.blocked} tone="danger" /><Kpi title="Предстоящих" value={graph.summary.upcoming} tone="warn" /></div>
    <section className="card process-unit-card"><div className="card-head"><div><h2>{graph.metadata.productName} · {graph.metadata.productCode}</h2><p className="small">{displayOrderNumber(graph.metadata.orderNumber)} · позиция {graph.metadata.unitLabel} · количество в партии {graph.metadata.quantity}</p></div><span className={`status ${unit?.status || 'draft'}`}>{runStatusLabel(unit?.status || 'draft')}</span></div><div className="bar big"><i style={{width:`${graph.metadata.progress}%`}} /></div><p>Текущий этап: <b>{current ? current.title : 'нет активных этапов'}</b>{current ? ` · ${current.section}` : ''}</p></section>
    <section className="card process-graph-canvas-card"><div className="card-head"><div><h2>Граф процесса по уровням</h2><p className="small">Прокрутите поле для просмотра всех уровней и параллельных веток</p></div><ProcessLegend /></div>{graph.layout ? <ProcessGraphCanvas graph={graph} /> : <div className="process-flow">{graph.nodes.map((node, index)=><ProcessGraphNodeCard key={node.id} node={node} incoming={graph.edges.filter(edge => edge.to === node.operationId || edge.to === node.id).map(edge => edge.fromOperationId || edge.from)} hasPrev={index > 0} />)}</div>}</section>
  </>;
}

function ProcessLegend() { return <div className="process-legend">{(Object.keys(PROCESS_PHASE_LABELS) as ProcessGraphPhase[]).map(phase=><span key={phase} className={`phase-pill ${phase}`}>{PROCESS_PHASE_LABELS[phase]}</span>)}</div>; }

function ProcessGraphCanvas({ graph }: { graph: ProcessGraph }) {
  const layout = graph.layout!;
  const nodeWidth = layout.nodeWidth || 280;
  const nodeHeight = layout.nodeHeight || 176;
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const nodesById = new Map(graph.nodes.map(node => [node.id, node]));
  const visualNode = (node: ProcessGraphNode) => {
    const offset = nodeOffsets[node.id] || { x: 0, y: 0 };
    return { ...node, x: Number(node.x || 0) + offset.x, y: Number(node.y || 0) + offset.y };
  };
  const visualNodesById = new Map(graph.nodes.map(node => [node.id, visualNode(node)]));
  const levels = Array.from(new Set(graph.nodes.map(node => node.level || 1))).sort((a, b) => a - b);
  const connectedNodeIds = hoveredNodeId ? new Set(graph.edges.flatMap(edge => (edge.from === hoveredNodeId || edge.to === hoveredNodeId ? [edge.from, edge.to] : []))) : new Set<string>();
  const graphWidth = Math.max(layout.canvasWidth, ...Array.from(visualNodesById.values()).map(node => Number(node.x || 0) + nodeWidth + 80));
  const graphHeight = Math.max(layout.canvasHeight, ...Array.from(visualNodesById.values()).map(node => Number(node.y || 0) + nodeHeight + 80));
  const pathFor = (edge: ProcessGraph['edges'][number]) => {
    const sourceBase = nodesById.get(edge.from) || graph.nodes.find(node => node.operationId === edge.fromOperationId || node.operationId === edge.from);
    const targetBase = nodesById.get(edge.to) || graph.nodes.find(node => node.operationId === edge.toOperationId || node.operationId === edge.to);
    const source = sourceBase ? visualNodesById.get(sourceBase.id) : null;
    const target = targetBase ? visualNodesById.get(targetBase.id) : null;
    if (!source || !target) return '';
    const sx = Number(source.x || 0) + nodeWidth;
    const sy = Number(source.y || 0) + nodeHeight / 2;
    const tx = Number(target.x || 0);
    const ty = Number(target.y || 0) + nodeHeight / 2;
    const midX = sx + Math.max(48, (tx - sx) / 2);
    return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
  };
  const startDrag = (event: React.MouseEvent<HTMLDivElement>, node: ProcessGraphNode) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const offset = nodeOffsets[node.id] || { x: 0, y: 0 };
    dragRef.current = { id: node.id, startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    setDraggingNodeId(node.id);
  };
  const onDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    setNodeOffsets(prev => ({ ...prev, [drag.id]: { x: drag.originX + (event.clientX - drag.startX) / zoom, y: drag.originY + (event.clientY - drag.startY) / zoom } }));
  };
  const finishDrag = () => { dragRef.current = null; setDraggingNodeId(null); };
  const setBoundedZoom = (value: number) => setZoom(Math.min(1.8, Math.max(0.5, Number(value.toFixed(2)))));
  const fitZoom = () => setBoundedZoom(Math.min(1, (expanded ? window.innerWidth - 96 : 1120) / Math.max(graphWidth, 1)));
  const wheelZoom = (event: WheelEvent) => {
    event.preventDefault();
    const scroll = scrollRef.current;
    const next = Math.min(1.8, Math.max(0.5, Number((zoom + (event.deltaY > 0 ? -0.08 : 0.08)).toFixed(2))));
    if (!scroll || next === zoom) return setZoom(next);
    const rect = scroll.getBoundingClientRect();
    const cx = event.clientX - rect.left + scroll.scrollLeft;
    const cy = event.clientY - rect.top + scroll.scrollTop;
    const ratio = next / zoom;
    setZoom(next);
    requestAnimationFrame(() => {
      scroll.scrollLeft = cx * ratio - (event.clientX - rect.left);
      scroll.scrollTop = cy * ratio - (event.clientY - rect.top);
    });
  };
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.addEventListener('wheel', wheelZoom, { passive: false });
    return () => scroll.removeEventListener('wheel', wheelZoom);
  }, [zoom]);
  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.process-node-wrap')) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    panRef.current = { startX: event.clientX, startY: event.clientY, scrollLeft: scroll.scrollLeft, scrollTop: scroll.scrollTop };
    scroll.setPointerCapture(event.pointerId);
  };
  const beginMousePan = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 0 && (event.target as HTMLElement).closest('.process-node-wrap')) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    if (event.button !== 0) event.preventDefault();
    panRef.current = { startX: event.clientX, startY: event.clientY, scrollLeft: scroll.scrollLeft, scrollTop: scroll.scrollTop };
  };
  const panTo = (clientX: number, clientY: number) => {
    const state = panRef.current;
    const scroll = scrollRef.current;
    if (!state || !scroll) return;
    scroll.scrollLeft = state.scrollLeft - (clientX - state.startX);
    scroll.scrollTop = state.scrollTop - (clientY - state.startY);
  };
  const pan = (event: React.PointerEvent<HTMLDivElement>) => { panTo(event.clientX, event.clientY); };
  const moveCanvasMouse = (event: React.MouseEvent<HTMLDivElement>) => {
    if (panRef.current) return panTo(event.clientX, event.clientY);
    onDrag(event);
  };
  const endPan = () => { panRef.current = null; };
  const canvas = <div ref={scrollRef} className="process-graph-canvas" onContextMenu={event=>event.preventDefault()} onMouseDown={beginMousePan} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onMouseMove={moveCanvasMouse} onMouseUp={()=>{ finishDrag(); endPan(); }} onMouseLeave={()=>{ finishDrag(); endPan(); }}>
    <div className="process-canvas-stage" style={{ width: graphWidth * zoom, height: graphHeight * zoom }}>
      <div className="process-canvas-scaled" style={{ width: graphWidth, height: graphHeight, transform: `scale(${zoom})` }}>
        {levels.map(level=><div key={level} className="process-level-label" style={{ left: 48 + (level - 1) * layout.columnWidth }}>Уровень {level}</div>)}
        <svg className="process-edges" width={graphWidth} height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`}><defs><marker id="process-arrow-head" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>{graph.edges.map((edge, index) => { const path = pathFor(edge); const highlighted = hoveredNodeId && (edge.from === hoveredNodeId || edge.to === hoveredNodeId); const muted = hoveredNodeId && !highlighted; return path ? <path key={`${edge.from}-${edge.to}-${index}`} d={path} className={`process-edge ${highlighted ? 'highlighted' : ''} ${muted ? 'muted' : ''}`} markerEnd="url(#process-arrow-head)" /> : null; })}</svg>
        {graph.nodes.map(node=>{ const visual = visualNodesById.get(node.id) || node; const related = hoveredNodeId && connectedNodeIds.has(node.id); const muted = hoveredNodeId && !related; return <ProcessGraphNodeCard key={node.id} node={visual} incoming={graph.edges.filter(edge => edge.to === node.id || edge.toOperationId === node.operationId).map(edge => edge.fromOperationId || edge.from)} onMouseDown={(event)=>startDrag(event, node)} onMouseEnter={()=>setHoveredNodeId(node.id)} onMouseLeave={()=>setHoveredNodeId(null)} dragging={draggingNodeId === node.id} muted={!!muted} highlighted={!!related} />; })}
      </div>
    </div>
  </div>;
  return <div className={`process-graph-shell ${expanded ? 'expanded' : ''}`}><div className="process-graph-toolbar"><span className="small">Можно масштабировать, перетаскивать блоки и раскрыть граф на весь экран</span><div className="process-graph-controls"><button type="button" className="secondary" onClick={()=>setBoundedZoom(zoom - 0.1)}>−</button><button type="button" className="secondary" onClick={()=>setBoundedZoom(1)}>100%</button><button type="button" className="secondary" onClick={()=>setBoundedZoom(zoom + 0.1)}>+</button><button type="button" className="secondary" onClick={fitZoom}>Вписать</button><button type="button" className="secondary" onClick={()=>setNodeOffsets({})}>Сбросить расположение</button><button type="button" onClick={()=>setExpanded(!expanded)}>{expanded ? 'Свернуть' : 'На весь экран'}</button></div></div>{canvas}</div>;
}

function ProcessGraphNodeCard({ node, incoming, hasPrev, onMouseDown, onMouseEnter, onMouseLeave, dragging, muted, highlighted }: { node: ProcessGraphNode; incoming: string[]; hasPrev?: boolean; onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void; onMouseEnter?: () => void; onMouseLeave?: () => void; dragging?: boolean; muted?: boolean; highlighted?: boolean }) {
  const positioned = Number.isFinite(node.x) && Number.isFinite(node.y);
  const style = positioned ? { left: node.x, top: node.y } : undefined;
  return <div className={`process-node-wrap ${dragging ? 'dragging' : ''} ${muted ? 'muted' : ''} ${highlighted ? 'highlighted' : ''}`} style={style} onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{hasPrev && <div className="process-arrow">→</div>}<article className={`process-node ${node.phase}`}><div className="node-top"><b>Этап {node.sequence}</b><span className={`phase-pill ${node.phase}`}>{PROCESS_PHASE_LABELS[node.phase]}</span></div><h3>{node.title}</h3><p>{node.section}</p><p className="small">Ур. {node.level || '—'} · ряд {node.row || '—'} · {hours(node.normHours)}</p><p className="small">{node.part || 'деталь/узел не указан'}</p>{incoming.length ? <p className="small">Есть зависимости: {incoming.length}</p> : <p className="small">Начальный этап</p>}{node.blockedBy.length ? <p className="small text-danger">Ожидает предыдущие операции: {node.blockedBy.length}</p> : null}{node.lockedBy ? <p className="small">В работе у: {node.lockedBy}</p> : null}<p className="small">Статус: {statusLabel(node.status as OperationStatus)}{node.startedAt ? ` · старт ${new Date(node.startedAt).toLocaleString('ru-RU')}` : ''}{node.completedAt ? ` · готово ${new Date(node.completedAt).toLocaleString('ru-RU')}` : ''}</p></article></div>;
}

function newNomenclatureDraft(): ProductProcess {
  const id = `manual-${Date.now()}`;
  return {
    id,
    equipment: '',
    productCode: '',
    category: 'Ручная номенклатура',
    sourceFile: 'Конструктор техпроцесса',
    sourceWorkbookSheets: ['Blueprint'],
    sourceDimensions: { Blueprint: { rows: 1, columns: 11 } },
    summary: {},
    processSteps: [{
      sequence: 1,
      operationId: 'ОР-00001',
      level: 1,
      x: 56,
      y: 56,
      partOrAssembly: 'Общее',
      name: 'Запуск производственного заказа',
      section: 'Диспетчеризация',
      previousOperationCodes: [],
      nextOperationCodes: [],
      normHours: 0.3,
      sourceRow: 1,
      confidence: 'manual',
    }],
    operationsCount: 1,
    totalNormHours: 0.3,
    confidence: 'manual',
    notes: ['Создано вручную в конструкторе техпроцесса.'],
    extractedAt: new Date().toISOString(),
    sourceType: 'manual',
  };
}

function NomenclatureProcesses({ user }: { user: AuthUser }) {
  const [items, setItems] = useState<NomenclatureItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<'card' | 'route' | 'builder'>('card');
  const [process, setProcess] = useState<ProductProcess | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData>({ sections: [], operations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canEdit = user.role === 'technologist' || user.role === 'dispatcher' || user.role === 'admin';
  const createNew = () => { setSelectedId('__new__'); setProcess(newNomenclatureDraft()); setView('builder'); setError(''); };
  useEffect(() => { let ignore = false; setLoading(true); getJson<{ products: NomenclatureItem[]; categories: string[] }>(`${API}/nomenclature${category ? `?category=${encodeURIComponent(category)}` : ''}`).then(json => { if (ignore) return; setItems(json.products); setCategories(json.categories); const nextId = json.products.some(p => p.id === selectedId) ? selectedId : json.products[0]?.id || ''; setSelectedId(nextId); }).catch(e => setError(e.message)).finally(() => !ignore && setLoading(false)); return () => { ignore = true; }; }, [category]);
  useEffect(() => { let ignore = false; getJson<ReferenceData>(`${API}/reference-data`).then(json => { if (!ignore) setReferenceData(json); }).catch(e => setError(e.message)); return () => { ignore = true; }; }, []);
  useEffect(() => { if (!selectedId) { setProcess(null); return; } if (selectedId === '__new__') return; let ignore = false; setError(''); getJson<ProductProcess>(`${API}/nomenclature/${encodeURIComponent(selectedId)}/process`).then(json => { if (!ignore) setProcess(json); }).catch(e => setError(e.message)); return () => { ignore = true; }; }, [selectedId]);
  const sections = process ? Array.from(new Set(process.processSteps.map(step => step.section))).sort() : [];
  const sectionRows = process ? sections.map(section => {
    const steps = process.processSteps.filter(step => step.section === section);
    return { section, count: steps.length, normHours: steps.reduce((sum, step) => sum + Number(step.normHours || 0), 0), first: steps[0], last: steps[steps.length - 1] };
  }).sort((a, b) => b.normHours - a.normHours) : [];
  return <>
    <PageTitle title="Номенклатура" subtitle="Карточка номенклатуры из НСИ и техпроцесс изготовления. Пока только чтение." />
    {error && <div className="alert">{error}</div>}{loading && <div className="loading">Загрузка номенклатуры...</div>}
    <section className="card"><div className="filters"><select name="nomenclature-category" aria-label="Категория номенклатуры" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Все категории</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select name="nomenclature-item" aria-label="Номенклатура" value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Номенклатура не выбрана</option>{items.map(item=><option key={item.id} value={item.id}>{item.equipment} · {item.productCode}</option>)}</select>{canEdit && <button onClick={createNew}>{'\u041d\u043e\u0432\u0430\u044f \u043d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u0430'}</button>}</div><div className="nomenclature-tiles">{items.map(item=><button key={item.id} className={`nomenclature-tile ${item.id===selectedId?'active':''}`} onClick={()=>setSelectedId(item.id)}><b>{item.equipment}</b><span>{item.productCode}</span><small>{item.category} · {item.operationsCount} операций · {hours(item.totalNormHours)}</small></button>)}</div></section>
    {process && <section className="card nomenclature-card"><div className="card-head"><div><h2>{process.equipment} · {process.productCode}</h2><p className="small">Карточка справочника номенклатуры</p></div><span className="status done">{process.sourceType === 'manual' ? 'ручной техпроцесс' : 'только чтение'}</span></div><div className="nomenclature-tabs"><button className={view === 'card' ? '' : 'light-btn'} onClick={()=>setView('card')}>Карточка</button><button className={view === 'route' ? '' : 'light-btn'} onClick={()=>setView('route')}>Маршрут</button>{canEdit && <button className={view === 'builder' ? '' : 'light-btn'} onClick={()=>setView('builder')}>Конструктор</button>}</div>{view === 'route' ? <ProcessStepsTable rows={process.processSteps} /> : view === 'builder' && canEdit ? <TechProcessBuilder process={process} referenceData={referenceData} onSaved={(saved)=>{ setProcess(saved); setSelectedId(saved.id); setItems(prev => [{ id: saved.id, equipment: saved.equipment, productCode: saved.productCode, category: saved.category, operationsCount: saved.processSteps.length, totalNormHours: saved.totalNormHours, confidence: saved.confidence, notes: saved.notes, sourceType: saved.sourceType }, ...prev.filter(item => item.id !== saved.id && item.productCode !== saved.productCode)]); setCategories(prev => Array.from(new Set([...prev, saved.category])).sort()); setView('card'); }} /> : <NomenclatureCard process={process} sections={sections} sectionRows={sectionRows} />}</section>}
  </>;
}

function NomenclatureCard({ process, sections, sectionRows }: { process: ProductProcess; sections: string[]; sectionRows: Array<{ section: string; count: number; normHours: number; first?: ProcessStep; last?: ProcessStep }> }) {
  const sourceDimensions = Object.entries(process.sourceDimensions || {});
  const summary = Object.entries(process.summary || {}).filter(([, value]) => value);
  return <div className="nomenclature-readonly">
    <div className="nomenclature-fields">
      <div><span>Код</span><b>{process.productCode}</b></div>
      <div><span>Наименование</span><b>{process.equipment}</b></div>
      <div><span>Категория</span><b>{process.category}</b></div>
      <div><span>Идентификатор</span><b>{process.id}</b></div>
      <div><span>Операций</span><b>{process.processSteps.length}</b></div>
      <div><span>Норма</span><b>{hours(process.totalNormHours)}</b></div>
      <div><span>Участков</span><b>{sections.length}</b></div>
      <div><span>Качество данных</span><b>{process.confidence}</b></div>
    </div>
    <section className="nomenclature-band"><h3>Источник данных</h3><div className="nomenclature-source"><div><span>Файл</span><b>{process.sourceFile}</b></div><div><span>Листы</span><b>{process.sourceWorkbookSheets.join(', ') || 'не указаны'}</b></div>{sourceDimensions.map(([sheet, dim])=><div key={sheet}><span>{sheet}</span><b>{dim.rows} x {dim.columns}</b></div>)}</div>{summary.length ? <div className="nomenclature-summary">{summary.map(([key, value])=><p key={key}><b>{key}</b><span>{value}</span></p>)}</div> : null}{process.notes?.length ? <div className="nomenclature-notes">{process.notes.map(note=><p key={note}>{note}</p>)}</div> : null}</section>
    <ProcessRouteBlocks steps={process.processSteps} />
    <section className="nomenclature-band"><h3>Маршрут по участкам</h3><table className="compact-table"><thead><tr><th>Участок</th><th>Опер.</th><th>Норма</th><th>Первая операция</th><th>Последняя операция</th></tr></thead><tbody>{sectionRows.map(row=><tr key={row.section}><td><b>{row.section}</b></td><td>{row.count}</td><td>{hours(row.normHours)}</td><td>{row.first?.operationId} {row.first?.name}</td><td>{row.last?.operationId} {row.last?.name}</td></tr>)}</tbody></table></section>
  </div>;
}

function ProcessRouteBlocks({ steps }: { steps: ProcessStep[] }) {
  const blocks = useMemo(() => buildOperationControlBlocks(steps.map(step => ({
    id: step.operationId,
    operationId: step.operationId,
    sequence: step.sequence,
    level: step.level,
    partOrAssembly: step.partOrAssembly,
    name: step.name,
    section: step.section,
    normHours: Number(step.normHours || 0),
    actualHours: 0,
    status: 'queued' as ProductionOperationStatus,
    canStart: false,
    groupCapable: Boolean(step.groupCapable),
  }))), [steps]);
  if (!blocks.length) return null;
  return <section className="nomenclature-band"><h3>Блоки и панели маршрута</h3><div className="route-block-list">{blocks.map(block=><article key={block.key} className={`route-block ${block.category === 'Панель' ? 'panel' : ''}`}><div><b>{block.title}</b><span>{block.category} · {block.stages.length} опер. · {hours(block.normHours)}</span></div><div className="stage-line">{block.stages.slice(0, 10).map(stage=><span key={`${block.key}-${stage.operationId}`} className="status queued">{stage.operationId}</span>)}</div><p className="small">Участки: {block.sections.join(', ') || 'не указаны'}</p></article>)}</div></section>;
}

function ProcessStepsTable({ rows }: { rows: ProcessStep[] }) {
  if (!rows.length) return <Empty text="Операции не найдены" />;
  return <table><thead><tr><th>№</th><th>Op.ID</th><th>Деталь/узел</th><th>Операция</th><th>Участок</th><th>Норма</th><th>Группа</th><th>Связи</th></tr></thead><tbody>{rows.map(step=><tr key={`${step.operationId}-${step.sequence}`}><td>{step.sequence}<div className="small">ур. {step.level || '—'}, строка {step.sourceRow}</div></td><td><b>{step.operationId}</b></td><td>{step.partOrAssembly}</td><td>{step.name}<div className="small">confidence: {step.confidence}</div></td><td>{step.section}</td><td>{hours(step.normHours)}</td><td>{step.groupCapable ? <span className="status done">да</span> : <span className="status queued">нет</span>}</td><td><div className="small">← {step.previousOperationCodes.join(', ') || '—'}</div><div className="small">→ {step.nextOperationCodes.join(', ') || '—'}</div></td></tr>)}</tbody></table>;
}

function ProductionRuns() {
  const [items, setItems] = useState<NomenclatureItem[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [operator, setOperator] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<ProductionRun | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function loadProduction(nextSelectedId = selectedId, silent = false) {
    if (!silent) setLoading(true); setError('');
    try {
      const [nom, list] = await Promise.all([getJson<{ products: NomenclatureItem[] }>(`${API}/nomenclature`), getJson<ProductionRun[]>(`${API}/production/runs`)]);
      setItems(nom.products); setRuns(list);
      if (!productId) setProductId(nom.products[0]?.id || '');
      const id = nextSelectedId || list[0]?.id || '';
      setSelectedId(id); setSelected(id ? await getJson<ProductionRun>(`${API}/production/runs/${encodeURIComponent(id)}`) : null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка производства'); } finally { if (!silent) setLoading(false); }
  }
  useEffect(() => { loadProduction(''); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => loadProduction(selectedId, true), APP_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [selectedId]);
  async function createRun(startNow = false) {
    const res = await fetch(`${API}/production/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber: orderNumber.trim(), productId, quantity, operator, priority }) });
    if (!res.ok) return alert((await res.json()).message || 'Не удалось создать партию');
    const run: ProductionRun = await res.json();
    if (startNow) await fetch(`${API}/production/runs/${encodeURIComponent(run.id)}/start`, { method: 'POST' });
    await loadProduction(run.id);
  }
  async function openRun(id: string) { setSelectedId(id); setSelected(await getJson<ProductionRun>(`${API}/production/runs/${encodeURIComponent(id)}`)); }
  async function startRun() { if (!selected) return; const res = await fetch(`${API}/production/runs/${encodeURIComponent(selected.id)}/start`, { method: 'POST' }); if (!res.ok) return alert((await res.json()).message || 'Не удалось запустить производство'); await loadProduction(selected.id); }
  async function deleteRun() { if (!selected) return; const res = await fetch(`${API}/production/runs/${encodeURIComponent(selected.id)}`, { method: 'DELETE' }); if (!res.ok) { setError(apiErrorMessage(await res.json(), 'Не удалось удалить партию')); return; } setConfirmDelete(false); await loadProduction(''); }
  async function releaseUnit(unit: ProductionUnit) { if (!selected) return; const res = await fetch(`${API}/production/runs/${encodeURIComponent(selected.id)}/units/${encodeURIComponent(unit.unitId)}/dispatch/release`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ operator: selected.operator || operator || 'Диспетчер' }) }); if (!res.ok) return alert(apiErrorMessage(await res.json(), 'Не удалось передать единицу в работу')); await loadProduction(selected.id); }
  const sections = selected ? Array.from(new Set(selected.operations.map(op => op.section))).sort() : [];
  return <>
    <PageTitle title="Запуск партии" subtitle="Производственный документ: номер партии, заказ, номенклатура из НСИ и количество единиц" />
    {error && <div className="alert">{error}</div>}{loading && <div className="loading">Загрузка партий...</div>}
    <section className="card"><h2>Новая партия</h2><div className="filters production-create"><input value={orderNumber} maxLength={20} onChange={e=>setOrderNumber(e.target.value.slice(0, 20))} placeholder="Номер заказа, до 20 символов" /><select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Выберите номенклатуру</option>{items.map(item=><option key={item.id} value={item.id}>{item.equipment} · {item.productCode} · {item.operationsCount} операций</option>)}</select><input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1, Number(e.target.value) || 1))} /><select value={priority} onChange={e=>setPriority(e.target.value as Priority)}><option value="high">Высокий приоритет</option><option value="normal">Обычный приоритет</option><option value="low">Низкий приоритет</option></select><input value={operator} onChange={e=>setOperator(e.target.value)} placeholder="Оператор / инициатор" /><button onClick={()=>createRun(true)} disabled={!productId}>Запустить партию</button></div><p className="small">Партия хранит номер заказа, выбранную номенклатуру, количество, инициатора и приоритет.</p></section>
    <div className="grid2"><section className="card"><h2>Партии</h2>{runs.length ? <div className="run-list">{runs.map(run=><button key={run.id} className={`run-tile ${run.id===selectedId?'active':''}`} onClick={()=>openRun(run.id)}><div><b>{displayRunTitle(run)}</b><span className={`status ${run.status}`}>{runStatusLabel(run.status)}</span></div><strong>{run.productName} · {run.productCode}</strong><small>{run.quantity} шт · {run.progress}% · {priorityLabel(run.priority)}</small><div className="bar"><i style={{width:`${run.progress}%`}} /></div></button>)}</div> : <Empty text="Партий пока нет" />}</section><section className="card">{selected ? <><div className="card-head"><h2>{selected.productName} · {selected.productCode}</h2><div className="inline-actions">{selected.status !== 'done' && <button onClick={startRun}>Перевести в работу</button>}<button className="danger-btn" onClick={()=>setConfirmDelete(true)}>Удалить партию</button></div></div><div className="order-info"><div><span>Партия</span><b>{displayRunTitle(selected)}</b></div><div><span>Номер заказа</span><b>{displayOrderNumber(selected.orderNumber)}</b></div><div><span>Количество</span><b>{selected.quantity}</b></div><div><span>Статус</span><b>{runStatusLabel(selected.status)}</b></div><div><span>Приоритет</span><b>{priorityLabel(selected.priority)}</b></div><div><span>Готовность</span><b>{selected.progress}%</b></div><div><span>Норма</span><b>{hours(selected.normHours)}</b></div><div><span>Оператор</span><b>{selected.operator || selected.batchCreatedBy || 'не указан'}</b></div></div><details className="technical-details"><summary>Технические данные</summary><small>{selected.id}</small></details><div className="bar big"><i style={{width:`${selected.progress}%`}} /></div><div className="section-tags">{sections.map(section=><span key={section}>{section}</span>)}</div><p className="small">Текущая операция: {selected.activeOperation ? `${displayOperationTitle(selected.activeOperation)} · ${selected.activeOperation.section}` : 'нет'}</p></> : <Empty text="Выберите партию" />}</section></div>
    {selected && <OperationControlBoard run={selected} />}
    {selected?.units?.length ? <section className="card"><div className="card-head"><div><h2>Единицы партии</h2><p className="small">Табличный документ по единицам партии: текущая операция, диспетчеризация и доступность следующих операций.</p></div></div><ProductionUnitsDocument run={selected} onRelease={releaseUnit} /></section> : null}
    {selected && confirmDelete && <ConfirmModal title="Удалить партию?" body={`Партия ${displayRunTitle(selected)} будет удалена из производственной базы. Это действие нельзя отменить.`} confirmText="Удалить партию" onCancel={()=>setConfirmDelete(false)} onConfirm={deleteRun} />}
  </>;
}

function ConfirmModal({ title, body, confirmText, onCancel, onConfirm }: { title: string; body: string; confirmText: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{title}</h2><p>{body}</p><div className="modal-actions"><button className="secondary" onClick={onCancel}>Отмена</button><button className="danger-btn" onClick={onConfirm}>{confirmText}</button></div></section></div>;
}

function ProductionUnitsDocument({ run, onRelease }: { run: ProductionRun; onRelease: (unit: ProductionUnit) => void }) {
  const units = run.units || [];
  if (!units.length) return <Empty text="Единицы партии не найдены" />;
  return <div className="unit-doc"><table className="unit-doc-table"><thead><tr><th>Номенклатура</th><th>Партия</th><th>Единица</th><th>Текущая операция</th><th>Статус</th><th>Прогресс</th><th>Передача</th><th>Готово</th><th>Ожидает</th><th>Действие</th></tr></thead><tbody>{units.map((unit, index) => { const current = currentUnitOperation(unit); const readyCount = unit.nextReadyOperations?.length || 0; const waitingCount = unit.nextBlockedOperations?.length || 0; const dispatched = unit.dispatchStatus === 'done'; return <tr key={unit.unitId} className={unit.canReleaseNext && !dispatched ? 'needs-action' : ''}><td>{index === 0 ? <><b>{run.productName}</b><span>{run.productCode}</span></> : null}</td><td>{index === 0 ? <><b>{displayRunTitle(run)}</b><span>{displayOrderNumber(run.orderNumber)} · {priorityLabel(run.priority)}</span><details className="technical-details"><summary>Технические данные</summary><small>{run.id}</small></details></> : null}</td><td><b>{unit.unitNo}/{run.launchedQuantity || run.quantity}</b></td><td><b>{current?.section || 'нет участка'}</b><span>{displayOperationDetail(current)}</span></td><td><span className={`status ${unit.status}`}>{runStatusLabel(unit.status)}</span></td><td><div className="plan-progress"><span>{unit.progress}%</span><div className="bar"><i style={{width:`${unit.progress}%`}} /></div></div></td><td>{unit.dispatchOperationId ? <><b>{dispatched ? 'передано' : 'ожидает передачи'}</b><span>{unit.dispatchCompletedAt ? new Date(unit.dispatchCompletedAt).toLocaleString('ru-RU') : 'готово к передаче'}</span></> : <span className="small">не передавалась</span>}</td><td>{readyCount}</td><td>{waitingCount ? displayBlockedBy(unit.nextBlockedOperations) || waitingCount : '—'}</td><td><button disabled={!unit.canReleaseNext || dispatched} onClick={()=>onRelease(unit)}>{dispatched ? 'Передано' : 'Передать'}</button></td></tr>; })}</tbody></table></div>;
}

function OperationControlBoard({ run }: { run: ProductionRun }) {
  const blocks = useMemo(() => buildOperationControlBlocks(flattenProductionRunOperations(run)), [run]);
  if (!blocks.length) return null;
  return <section className="card operation-control-card"><div className="card-head"><div><h2>Операционный блок изделия</h2><p className="small">Одна строка на панель, печь или общий маршрут: готовность, текущая единица и участки внутри блока.</p></div><span className="queue-count">{blocks.length}</span></div><div className="control-block-grid">{blocks.map(block=><article key={block.key} className={`control-block ${block.category === 'Панель' ? 'panel' : block.category === 'Печь' ? 'furnace' : ''}`}><div className="control-block-head"><div><span>{block.category}</span><h3>{block.title}</h3></div><strong>{block.progress}%</strong></div><div className="bar"><i style={{width:`${block.progress}%`}} /></div><div className="control-block-metrics"><div><span>Операций</span><b>{block.total}</b></div><div><span>Готово</span><b>{block.done}</b></div><div><span>В работе</span><b>{block.work + block.paused}</b></div><div><span>Единица</span><b>{block.unitNo ? `${block.unitNo}/${block.unitCount || run.quantity}` : '—'}</b></div></div><p className="small">{block.current ? `Текущая: ${displayOperationTitle(block.current)} · ${block.current.section}` : 'Активной операции нет'}</p><div className="stage-line">{block.stages.slice(0, 12).map(stage=><span key={`${block.key}-${stage.operationId}`} className={`status ${stage.status}`}>{stage.name}</span>)}</div><p className="small">Участки: {block.sections.join(', ') || 'не указаны'} · групповых операций: {block.groupCapable}</p></article>)}</div></section>;
}

function ProductionOperationsTable({ rows, onAction }: { rows: ProductionOperation[]; onAction: (op: ProductionOperation, action: 'start' | 'pause' | 'resume' | 'complete') => void }) {
  if (!rows.length) return <Empty text="Операции партии не найдены" />;
  return <table><thead><tr><th>№</th><th>Операция</th><th>Участок</th><th>Статус</th><th>Приоритет</th><th>Норма / факт</th><th>Связи</th><th>Блокировка</th><th>Действия</th></tr></thead><tbody>{rows.map(op=>{ const blocked = op.canStart === false && op.status === 'queued'; return <tr key={op.id} className={blocked ? 'blocked-op' : ''}><td>{op.sequence}<div className="small">ур. {op.level || '—'}</div></td><td><b>{op.name}</b><div className="small">{op.partOrAssembly}</div><details className="technical-details"><summary>Технические данные</summary><small>{op.operationId}</small></details></td><td>{op.section}</td><td><span className={`status ${blocked ? 'blocked' : op.status}`}>{blocked ? 'Ожидает' : statusLabel(op.status as OperationStatus)}</span><div className="small">{op.startedAt ? `старт ${new Date(op.startedAt).toLocaleString('ru-RU')}` : 'не стартовала'}</div></td><td><span className={`priority ${op.priority || 'normal'}`}>{priorityLabel(op.priority)}</span></td><td>{hours(op.normHours)}<div className="small">факт {hours(op.actualHours)}</div></td><td><div className="small">предыдущих: {op.previousOperationCodes.length || '—'}</div><div className="small">следующих: {op.nextOperationCodes.length || '—'}</div></td><td>{op.lockedBy ? <><b>{op.lockedBy}</b><div className="small">{op.lockReason || 'work'} {op.lockedAt ? new Date(op.lockedAt).toLocaleString('ru-RU') : ''}</div></> : (blocked ? <span className="text-danger">Ожидает: {displayBlockedBy(op.blockedBy) || 'предыдущие операции'}</span> : '—')}</td><td><div className="actions inline-actions">{blocked && <span className="blocked-note">Ожидает предшествующие</span>}{op.status === 'queued' && <button disabled={blocked} onClick={()=>onAction(op,'start')}>Старт</button>}{op.status === 'work' && <button className="pause" onClick={()=>onAction(op,'pause')}>Пауза</button>}{op.status === 'paused' && <button onClick={()=>onAction(op,'resume')}>Возобновить</button>}{op.status !== 'done' && <button className="done-action" onClick={()=>onAction(op,'complete')}>Завершить</button>}</div></td></tr>; })}</tbody></table>;
}

function ReferenceSections() {
  const [items, setItems] = useState<ReferenceSection[]>([]);
  const [name, setName] = useState('');
  const [availableHours, setAvailableHours] = useState(160);
  const [error, setError] = useState('');
  async function loadReferences() { try { const data = await getJson<ReferenceData>(`${API}/reference-data`); setItems(data.sections); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка справочника участков'); } }
  useEffect(() => { loadReferences(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/reference-sections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, availableHours }) });
    if (!res.ok) return setError(apiErrorMessage(await res.json(), 'Не удалось добавить участок'));
    setName('');
    setAvailableHours(160);
    await loadReferences();
  }
  async function toggle(section: ReferenceSection) {
    const res = await fetch(`${API}/reference-sections/${section.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !section.isActive }) });
    if (!res.ok) return setError(apiErrorMessage(await res.json(), 'Не удалось обновить участок'));
    await loadReferences();
  }
  return <section className="card"><PageTitle title="Справочник участков" subtitle="Участки производства и терминалы рабочих мест" />{error && <div className="alert">{error}</div>}<form className="row" onSubmit={add}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Название участка" required /><input value={availableHours} onChange={e=>setAvailableHours(Number(e.target.value) || 0)} type="number" min="0" step="1" placeholder="Часы/месяц" /><button>Добавить участок</button></form><table><thead><tr><th>Участок</th><th>Статус</th><th>Терминал</th><th>Действие</th></tr></thead><tbody>{items.map(section=><tr key={section.id}><td><b>{section.name}</b></td><td><span className={`status ${section.isActive === false ? 'canceled' : 'done'}`}>{section.isActive === false ? 'выключен' : 'активен'}</span></td><td>{section.terminalLogin || 'создается автоматически'}</td><td><button className={section.isActive === false ? '' : 'secondary'} onClick={()=>toggle(section)}>{section.isActive === false ? 'Включить' : 'Выключить'}</button></td></tr>)}</tbody></table></section>;
}

function ReferenceOperations() {
  const [data, setData] = useState<ReferenceData>({ sections: [], operations: [] });
  const [draft, setDraft] = useState({ name: '', defaultSection: '', defaultNormHours: 1, partOrAssembly: '' });
  const [error, setError] = useState('');
  async function loadReferences() { try { setData(await getJson<ReferenceData>(`${API}/reference-data`)); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка справочника операций'); } }
  useEffect(() => { loadReferences(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/reference-operations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (!res.ok) return setError(apiErrorMessage(await res.json(), 'Не удалось добавить операцию'));
    setDraft({ name: '', defaultSection: '', defaultNormHours: 1, partOrAssembly: '' });
    await loadReferences();
  }
  async function toggle(operation: ReferenceOperationRef) {
    const res = await fetch(`${API}/reference-operations/${operation.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !operation.isActive }) });
    if (!res.ok) return setError(apiErrorMessage(await res.json(), 'Не удалось обновить операцию'));
    await loadReferences();
  }
  return <section className="card"><PageTitle title="Справочник операций" subtitle="Типовые операции для конструктора техпроцесса" />{error && <div className="alert">{error}</div>}<form className="row" onSubmit={add}><input value={draft.name} onChange={e=>setDraft({...draft, name:e.target.value})} placeholder="Название операции" required /><select value={draft.defaultSection} onChange={e=>setDraft({...draft, defaultSection:e.target.value})}><option value="">Участок не выбран</option>{data.sections.map(section=><option key={section.id}>{section.name}</option>)}</select><input value={draft.defaultNormHours} onChange={e=>setDraft({...draft, defaultNormHours:Number(e.target.value) || 0})} type="number" min="0" step="0.1" placeholder="Норма, ч" /><input value={draft.partOrAssembly} onChange={e=>setDraft({...draft, partOrAssembly:e.target.value})} placeholder="Деталь / узел" /><button>Добавить операцию</button></form><table><thead><tr><th>Код</th><th>Операция</th><th>Участок</th><th>Норма</th><th>Деталь / узел</th><th>Статус</th><th>Действие</th></tr></thead><tbody>{data.operations.map(operation=><tr key={operation.id}><td><b>{operation.operationCode}</b></td><td>{operation.name}</td><td>{operation.defaultSection || '—'}</td><td>{hours(operation.defaultNormHours ?? undefined)}</td><td>{operation.partOrAssembly || '—'}</td><td><span className={`status ${operation.isActive === false ? 'canceled' : 'done'}`}>{operation.isActive === false ? 'выключена' : 'активна'}</span></td><td><button className={operation.isActive === false ? '' : 'secondary'} onClick={()=>toggle(operation)}>{operation.isActive === false ? 'Включить' : 'Выключить'}</button></td></tr>)}</tbody></table></section>;
}

function ShiftsKpi({ sections, people }: { sections: string[]; people: Person[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [reasons, setReasons] = useState<DeviationReason[]>([]);
  const [section, setSection] = useState(sections[0] || '');
  const [shiftDate, setShiftDate] = useState(today);
  const [worker, setWorker] = useState('');
  const [sectionReport, setSectionReport] = useState<SectionShiftReport | null>(null);
  const [workerReport, setWorkerReport] = useState<WorkerReport | null>(null);
  const [draft, setDraft] = useState({ section: sections[0] || '', startsAt: `${today}T08:00`, endsAt: `${today}T20:00`, brigade: '', master: '', workCenterId: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const params = new URLSearchParams();
      if (section) params.set('section', section);
      if (shiftDate) params.set('date', shiftDate);
      const [wc, sf, rs] = await Promise.all([
        getJson<WorkCenter[]>(`${API}/work-centers`),
        getJson<WorkShift[]>(`${API}/shifts?${params.toString()}`),
        getJson<DeviationReason[]>(`${API}/deviation-reasons`),
      ]);
      setWorkCenters(wc);
      setShifts(sf);
      setReasons(rs);
      setError('');
      const reportParams = new URLSearchParams();
      if (section) reportParams.set('section', section);
      if (shiftDate) reportParams.set('date', shiftDate);
      setSectionReport(await getJson<SectionShiftReport>(`${API}/reports/section-shift?${reportParams.toString()}`));
      const workerParams = new URLSearchParams();
      if (worker) workerParams.set('person', worker);
      if (shiftDate) {
        workerParams.set('from', `${shiftDate}T00:00:00.000Z`);
        workerParams.set('to', `${shiftDate}T23:59:59.999Z`);
      }
      setWorkerReport(await getJson<WorkerReport>(`${API}/reports/worker?${workerParams.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить смены и KPI');
    }
  }

  useEffect(() => { if (!section && sections[0]) setSection(sections[0]); }, [sections, section]);
  useEffect(() => { if (!draft.section && sections[0]) setDraft(prev => ({ ...prev, section: sections[0] })); }, [sections, draft.section]);
  useEffect(() => { load(); }, [section, shiftDate, worker]);

  async function createShift(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...draft, workCenterId: draft.workCenterId ? Number(draft.workCenterId) : undefined, shiftDate, startsAt: new Date(draft.startsAt).toISOString(), endsAt: new Date(draft.endsAt).toISOString() };
    const res = await fetch(`${API}/shifts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return setError(apiErrorMessage(await res.json(), 'Не удалось создать смену'));
    await load();
  }

  async function closeShift(id: number) {
    const res = await fetch(`${API}/shifts/${id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closedBy: 'frontend', closeComment: 'Закрыто из MES' }) });
    if (!res.ok) return setError(apiErrorMessage(await res.json(), 'Не удалось закрыть смену'));
    await load();
  }

  const activeWorkCenters = workCenters.filter(wc => wc.isActive !== false && (!draft.section || wc.section === draft.section));
  const kpi = sectionReport?.kpi;
  return <>
    <PageTitle title="Смены и KPI" subtitle="Рабочие центры, причины отклонений и сменная производительность из нормализованного факта" />
    {error && <div className="alert">{error}</div>}
    <section className="card"><h2>Фильтр отчетов</h2><div className="filters"><select value={section} onChange={e=>setSection(e.target.value)}><option value="">Все участки</option>{sections.map(s=><option key={s}>{s}</option>)}</select><input type="date" value={shiftDate} onChange={e=>setShiftDate(e.target.value)} /><select value={worker} onChange={e=>setWorker(e.target.value)}><option value="">Все исполнители</option>{people.map(p=><option key={p.id} value={p.fullName}>{p.fullName} · {p.section}</option>)}</select><button onClick={load}>Обновить</button></div></section>
    <div className="kpi-grid">{kpi && <><Kpi title="Операции" value={kpi.operations} /><Kpi title="Готово" value={kpi.completed} tone="good" /><Kpi title="Факт / норма" value={`${hours(kpi.actualHours)} / ${hours(kpi.normHours)}`} /><Kpi title="Производительность" value={`${kpi.productivityPct}%`} /><Kpi title="Брак" value={`${kpi.defectQty} (${kpi.defectRatePct}%)`} tone={kpi.defectQty ? 'bad' : 'good'} /></>}</div>
    <section className="card"><h2>Создать смену</h2><form className="row" onSubmit={createShift}><select value={draft.section} onChange={e=>setDraft({...draft, section:e.target.value, workCenterId:''})}>{sections.map(s=><option key={s}>{s}</option>)}</select><select value={draft.workCenterId} onChange={e=>setDraft({...draft, workCenterId:e.target.value})}><option value="">Рабочий центр участка</option>{activeWorkCenters.map(wc=><option key={wc.id} value={wc.id}>{wc.name}</option>)}</select><input type="datetime-local" value={draft.startsAt} onChange={e=>setDraft({...draft, startsAt:e.target.value})} /><input type="datetime-local" value={draft.endsAt} onChange={e=>setDraft({...draft, endsAt:e.target.value})} /><input value={draft.brigade} onChange={e=>setDraft({...draft, brigade:e.target.value})} placeholder="Бригада" /><input value={draft.master} onChange={e=>setDraft({...draft, master:e.target.value})} placeholder="Мастер" /><button>Создать смену</button></form></section>
    <div className="grid2"><section className="card"><h2>Смены</h2>{shifts.length ? <table className="compact-table"><thead><tr><th>Участок</th><th>Период</th><th>Бригада</th><th>Статус</th><th>Действие</th></tr></thead><tbody>{shifts.map(shift=><tr key={shift.id}><td><b>{shift.section}</b></td><td>{dateTime(shift.startsAt)}<div className="small">{dateTime(shift.endsAt)}</div></td><td>{shift.brigade || shift.master || '—'}</td><td><span className={`status ${shift.status === 'closed' ? 'done' : 'work'}`}>{shift.status}</span></td><td>{shift.status === 'closed' ? '—' : <button className="secondary" onClick={()=>closeShift(shift.id)}>Закрыть</button>}</td></tr>)}</tbody></table> : <Empty text="Смены не найдены" />}</section><section className="card"><h2>Причины отклонений</h2>{reasons.length ? <table className="compact-table"><thead><tr><th>Причина</th><th>Категория</th></tr></thead><tbody>{reasons.map(reason=><tr key={reason.id}><td><b>{reason.name}</b><details className="technical-details"><summary>Технические данные</summary><small>{reason.code}</small></details></td><td>{reason.category}</td></tr>)}</tbody></table> : <Empty text="Причины не настроены" />}</section></div>
    <div className="grid2"><section className="card"><h2>Причины в смене</h2>{sectionReport?.reasons.length ? <table className="compact-table"><thead><tr><th>Причина</th><th>Категория</th><th>Часы</th><th>События</th></tr></thead><tbody>{sectionReport.reasons.map(reason=><tr key={reason.code}><td><b>{reason.name}</b><details className="technical-details"><summary>Технические данные</summary><small>{reason.code}</small></details></td><td>{reason.category}</td><td>{hours(reason.hours)}</td><td>{reason.count}</td></tr>)}</tbody></table> : <Empty text="Отклонений по фильтру нет" />}</section><section className="card"><h2>Выработка исполнителей</h2>{workerReport?.workers.length ? <table className="compact-table"><thead><tr><th>Исполнитель</th><th>Опер.</th><th>Готово</th><th>Факт</th><th>Норма</th><th>KPI</th></tr></thead><tbody>{workerReport.workers.map(row=><tr key={row.worker}><td><b>{row.worker}</b></td><td>{row.operations}</td><td>{row.completed}</td><td>{hours(row.actualHours)}</td><td>{hours(row.normHours)}</td><td>{row.productivityPct}%</td></tr>)}</tbody></table> : <Empty text="Выработка по фильтру не найдена" />}</section></div>
  </>;
}

function Import({ onDone }: { onDone: () => void }) { const [result, setResult] = useState<any>(null); async function upload(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); const res = await fetch(`${API}/import/orders-excel`, { method: 'POST', body: form }); setResult(await res.json()); onDone(); } return <section className="card"><h2>Импорт заказов из Excel</h2><form onSubmit={upload} className="row"><input name="file" type="file" accept=".xlsx,.xls" required /><button>Импортировать</button></form>{result && <pre>{JSON.stringify(result, null, 2)}</pre>}</section>; }
function Orders({ orders, onOpenOrder }: { orders: Order[]; onOpenOrder: (id: number) => void }) { return <section className="card"><h2>Заказы</h2><OrderTiles orders={orders} onOpenOrder={onOpenOrder} /></section>; }
function OrderTiles({ orders, onOpenOrder, compact }: { orders: Order[]; onOpenOrder: (id: number) => void; compact?: boolean }) { return <div className={compact ? 'order-tiles compact' : 'order-tiles'}>{orders.map(o => <button className="order-tile" key={o.id} onClick={() => onOpenOrder(o.id)}><div className="tile-top"><b>{o.orderNumber}</b><span>{o.progress}%</span></div><div className="small">{o.productCode} {o.productName}</div><div>Количество: <b>{o.quantity}</b></div><div>Срок: {date(o.dueDate)}</div><div className="bar"><i style={{width:`${o.progress}%`}} /></div></button>)}</div>; }
function OrderCard({ orderId, people, onBack, onArchived }: { orderId: number; people: Person[]; onBack: () => void; onArchived: () => void }) { const [order, setOrder] = useState<any>(null); async function loadOrder() { setOrder(await getJson(`${API}/orders/${orderId}`)); } useEffect(() => { loadOrder(); }, [orderId]); async function setStage(op: Operation & any, action: 'start'|'finish') { const person = people.find(p => p.section === op.section || p.fullName === op.name); const effectiveAction = action === 'start' && (op.status === 'work' || op.status === 'done') ? 'reset' : action === 'finish' && op.status === 'done' ? 'start' : action; const res = await fetch(`${API}/orders/${orderId}/operations/${op.id}/${effectiveAction}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ personId: person?.id }) }); if (!res.ok) alert((await res.json()).message || 'Не удалось обновить этап'); await loadOrder(); } async function archiveOrder() { const res = await fetch(`${API}/orders/${orderId}/archive`, { method:'POST' }); if (!res.ok) return alert((await res.json()).message || 'Не удалось архивировать заказ'); onArchived(); } if (!order) return <section className="card">Загрузка карточки заказа...</section>; const allDone = order.operations.length > 0 && order.operations.every((op: Operation) => op.status === 'done'); const archived = order.status === 'archived'; return <><section className="card"><div className="card-head"><button onClick={onBack}>← К списку заказов</button>{allDone && !archived && <button className="archive-btn" onClick={archiveOrder}>Закончить работу с заказом</button>}{archived && <span className="archive-badge">Архив</span>}</div><h2>Карточка заказа {order.orderNumber}</h2><div className="order-info"><div><span>Изделие</span><b>{order.productCode} {order.productName}</b></div><div><span>Количество</span><b>{order.quantity}</b></div><div><span>Срок</span><b>{date(order.dueDate)}</b></div><div><span>Готовность</span><b>{order.progress}%</b></div></div><div className="bar big"><i style={{width:`${order.progress}%`}} /></div></section><section className="card"><h2>Этапы и статусы</h2><table><thead><tr><th>№</th><th>Этап</th><th>Статус</th><th>Принято в работу</th><th>Готов</th><th>Исполнитель</th><th>Старт</th><th>Финиш</th></tr></thead><tbody>{order.operations.map((op: Operation & any)=><tr key={op.id}><td>{op.operationCode}</td><td>{op.name}<div className="small">{op.section}</div></td><td><span className={`status ${op.status}`}>{op.status}</span></td><td>{archived ? '—' : <button className="light-btn" onClick={()=>setStage(op,'start')}>{op.status === 'work' || op.status === 'done' ? '✓ Снять' : 'Принято'}</button>}</td><td>{archived ? '—' : <button className="light-btn done-btn" onClick={()=>setStage(op,'finish')}>{op.status === 'done' ? '✓ Снять' : 'Готов'}</button>}</td><td>{people.find(p=>p.id===op.assignedPersonId)?.fullName || ''}</td><td>{op.startedAt ? new Date(op.startedAt).toLocaleString('ru-RU') : ''}</td><td>{op.finishedAt ? new Date(op.finishedAt).toLocaleString('ru-RU') : ''}</td></tr>)}</tbody></table></section></>; }
function ProductionRunCard({ runId, onBack }: { runId: string; onBack: () => void }) {
  const [run, setRun] = useState<ProductionRun | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setRun(null); setError(''); getJson<ProductionRun>(`${API}/production/runs/${encodeURIComponent(runId)}`).then(setRun).catch(e => setError(e instanceof Error ? e.message : 'Не удалось открыть карточку партии')); }, [runId]);
  if (error) return <section className="card"><button onClick={onBack}>← К архиву</button><div className="alert">{error}</div></section>;
  if (!run) return <section className="card">Загрузка карточки партии...</section>;
  const units = run.units || [];
  const operations = units.length ? units.flatMap(unit => unit.operations.map(op => ({ ...op, unitNo: unit.unitNo, unitId: unit.unitId }))) : run.operations.map(op => ({ ...op, unitNo: 1, unitId: run.id }));
  return <><section className="card run-card"><div className="card-head"><button onClick={onBack}>← К архиву</button>{run.status === 'done' && <span className="archive-badge">Архив</span>}</div><h2>Карточка партии {displayRunTitle(run)}</h2><div className="order-info"><div><span>Номенклатура</span><b>{run.productCode} {run.productName}</b></div><div><span>Номер заказа</span><b>{displayOrderNumber(run.orderNumber)}</b></div><div><span>Количество</span><b>{run.launchedQuantity || run.quantity}</b></div><div><span>Статус</span><b>{runStatusLabel(run.status)}</b></div><div><span>Готовность</span><b>{run.progress}%</b></div><div><span>Норма</span><b>{hours(run.normHours)}</b></div><div><span>Факт от начала до конца</span><b>{durationLabel(run.actualDurationMinutes, run.actualDurationHours)}</b></div><div><span>Создан</span><b>{dateTime(run.createdAt)}</b></div><div><span>Старт</span><b>{dateTime(run.startedAt)}</b></div><div><span>Финиш</span><b>{dateTime(run.completedAt)}</b></div><div><span>Инициатор</span><b>{run.operator || 'не указан'}</b></div></div><details className="technical-details"><summary>Технические данные</summary><small>{run.id}</small></details><div className="bar big"><i style={{width:`${run.progress}%`}} /></div>{run.comment && <p className="small">{run.comment}</p>}</section><OperationControlBoard run={run} /><section className="card"><h2>Единицы партии</h2>{units.length ? <table className="compact-table"><thead><tr><th>Единица</th><th>Статус</th><th>Готовность</th><th>Старт</th><th>Финиш</th><th>Факт</th></tr></thead><tbody>{units.map(unit=><tr key={unit.unitId}><td><b>{unit.unitNo}/{run.launchedQuantity || run.quantity}</b><details className="technical-details"><summary>Технические данные</summary><small>{unit.unitId}</small></details></td><td><span className={`status ${unit.status}`}>{runStatusLabel(unit.status)}</span></td><td>{unit.progress}%</td><td>{dateTime(unit.startedAt)}</td><td>{dateTime(unit.completedAt)}</td><td>{durationLabel(unit.actualDurationMinutes, unit.actualDurationHours)}</td></tr>)}</tbody></table> : <Empty text="Единицы партии не найдены" />}</section><section className="card"><h2>Операции партии</h2><ProductionRunOperationsReadonly rows={operations} /></section></>;
}

function ProductionRunOperationsReadonly({ rows }: { rows: Array<ProductionOperation & { unitNo?: number; unitId?: string }> }) {
  if (!rows.length) return <Empty text="Операции партии не найдены" />;
  return <table className="compact-table run-card-ops"><thead><tr><th>Ед.</th><th>Этап</th><th>Операция</th><th>Участок</th><th>Статус</th><th>Норма</th><th>Факт</th><th>Старт</th><th>Финиш</th><th>Связи</th></tr></thead><tbody>{rows.map(op=><tr key={`${op.unitId || 'run'}-${op.id}`}><td>{op.unitNo || 1}</td><td><b>{op.sequence}</b><div className="small">ур. {op.level || '—'}</div></td><td>{op.name}<div className="small">{op.partOrAssembly}</div><details className="technical-details"><summary>Технические данные</summary><small>{op.operationId}</small></details></td><td>{op.section}</td><td><span className={`status ${op.status}`}>{statusLabel(op.status as OperationStatus)}</span></td><td>{hours(op.normHours)}</td><td>{hours(op.actualHours)}</td><td>{dateTime(op.startedAt)}</td><td>{dateTime(op.completedAt)}</td><td><div className="small">предыдущих: {op.previousOperationCodes.length || '—'}</div><div className="small">следующих: {op.nextOperationCodes.length || '—'}</div></td></tr>)}</tbody></table>;
}

const A = {
  title: '\u0410\u0440\u0445\u0438\u0432',
  note: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043d\u044b\u0435 \u0437\u0430\u043a\u0430\u0437\u044b \u0438 \u0433\u043e\u0442\u043e\u0432\u044b\u0435 \u043f\u0430\u0440\u0442\u0438\u0438 \u043d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u044b.',
  orders: '\u0417\u0430\u043a\u0430\u0437\u044b',
  noOrders: '\u0410\u0440\u0445\u0438\u0432\u043d\u044b\u0445 \u0437\u0430\u043a\u0430\u0437\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442',
  runs: '\u041f\u0430\u0440\u0442\u0438\u0438 \u043d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u044b',
  run: '\u041f\u0430\u0440\u0442\u0438\u044f / \u0437\u0430\u043a\u0430\u0437',
  product: '\u041d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u0430',
  order: '\u0417\u0430\u043a\u0430\u0437',
  qty: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e',
  readiness: '\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c',
  completed: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e',
  manual: '\u043d\u043e\u043c\u0435\u0440 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d',
  noRuns: '\u0413\u043e\u0442\u043e\u0432\u044b\u0445 \u043f\u0430\u0440\u0442\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442',
};
function Archive({ orders, productionRuns, onOpenOrder, onOpenRun }: { orders: Order[]; productionRuns: ProductionRun[]; onOpenOrder: (id: number) => void; onOpenRun: (id: string) => void }) {
  return <section className="card"><h2>{A.title}</h2><p className="small">{A.note}</p><h3>{A.orders}</h3>{orders.length ? <OrderTiles orders={orders} onOpenOrder={onOpenOrder} /> : <Empty text={A.noOrders} />}<h3>{A.runs}</h3>{productionRuns.length ? <table className="compact-table"><thead><tr><th>{A.run}</th><th>{A.product}</th><th>{A.qty}</th><th>{A.readiness}</th><th>Факт</th><th>{A.completed}</th></tr></thead><tbody>{productionRuns.map(run=><tr key={run.id} className="clickable" onClick={()=>onOpenRun(run.id)}><td><b>{displayRunTitle(run)}</b><div className="small">открыть карточку</div></td><td>{run.productName}<div className="small">{run.productCode}</div></td><td>{run.launchedQuantity || run.quantity}</td><td>{run.progress}%</td><td>{durationLabel(run.actualDurationMinutes, run.actualDurationHours)}</td><td>{run.completedAt ? new Date(run.completedAt).toLocaleString('ru-RU') : '?'}</td></tr>)}</tbody></table> : <Empty text={A.noRuns} />}</section>;
}
function People({ people, sections, onDone }: { people: Person[]; sections: string[]; onDone: () => void }) { async function add(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); await fetch(`${API}/people`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(form)) }); e.currentTarget.reset(); onDone(); } return <section className="card"><h2>Исполнители</h2><form className="row" onSubmit={add}><input name="fullName" placeholder="ФИО" required /><select name="section">{sections.map(s=><option key={s}>{s}</option>)}</select><button>Добавить</button></form><table><tbody>{people.map(p=><tr key={p.id}><td>{p.fullName}</td><td>{p.section}</td></tr>)}</tbody></table></section>; }

createRoot(document.getElementById('root')!).render(<App />);
