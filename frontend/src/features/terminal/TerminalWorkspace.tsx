import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { API, apiErrorMessage, getJson } from '../../api/client';
import type { AuthUser, Operation, Person, TerminalData, TerminalFilter, TerminalRecentEvent } from '../../api/types';
import { Empty, PageTitle, displayBlockedBy, displayOperationBatch, displayOperationDetail, displayOperationTitle, displayOrderNumber, hours, statusLabel } from '../../components/common';
import { isGroupCapableText } from '../../domain/group-capability';

const TERMINAL_REFRESH_MS = 5000;
const TERMINAL_HEARTBEAT_MS = 15000;
const TERMINAL_CLIENT_ID_KEY = 'robopulse:terminal-client-id';
const OPERATION_EXIT_MS = 950;
const OPERATION_START_MS = 1100;
const OPERATION_FLASH_MS = 2000;
type ProductionSelection = { operationKey: string; operationPk: string; lockToken: string; lockExpiresAt?: string | null; lockVersion?: number };
type TerminalOperationAction = 'start'|'pause'|'resume'|'complete';

export function TerminalWorkspace({ user, onLogout, onChangeServer }: { user: AuthUser; onLogout: () => void; onChangeServer?: () => void }) {
  return <div className="terminal-shell"><header className="terminal-top"><div><div className="logo">Robo<span>Pulse</span><small>MES</small></div><p>{user.displayName} · {user.workCenterSection || 'участок не назначен'}</p></div><div className="terminal-top-actions">{onChangeServer && <button className="server-change-button" onClick={onChangeServer}>Сервер</button>}<button className="secondary" onClick={onLogout}>Выйти</button></div></header><main className="terminal-main"><WorkCenterTerminal sections={user.workCenterSection ? [user.workCenterSection] : []} people={[]} onDone={()=>{}} user={user} terminalMode /></main></div>;
}

function terminalOperationKey(op?: Operation | null) { return op ? `${op.sourceType || 'order'}-${op.runId || ''}-${op.unitId || ''}-${op.operationId || op.id}` : ''; }
function delay(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)); }
function terminalOperationFlashClass(action?: TerminalOperationAction) {
  if (action === 'start' || action === 'resume') return 'terminal-operation-flash-start';
  if (action === 'pause') return 'terminal-operation-flash-pause';
  if (action === 'complete') return 'terminal-operation-flash-complete';
  return '';
}
function terminalClientId() {
  const current = window.localStorage.getItem(TERMINAL_CLIENT_ID_KEY);
  if (current) return current;
  const id = `client-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  window.localStorage.setItem(TERMINAL_CLIENT_ID_KEY, id);
  return id;
}
const DEFAULT_TERMINAL_FILTER: TerminalFilter = { query: '', operationCode: '', status: 'active', orderNumber: '', productCode: '', groupOnly: false };
function terminalFilterStorageKey(section: string, user?: AuthUser) { return `robopulse:terminal-filter:${user?.id || 'shared'}:${section || 'all'}`; }
function readTerminalFilter(section: string, user?: AuthUser): TerminalFilter {
  try {
    return { ...DEFAULT_TERMINAL_FILTER, ...JSON.parse(window.localStorage.getItem(terminalFilterStorageKey(section, user)) || '{}') };
  } catch {
    return DEFAULT_TERMINAL_FILTER;
  }
}
function writeTerminalFilter(section: string, user: AuthUser | undefined, filter: TerminalFilter) {
  window.localStorage.setItem(terminalFilterStorageKey(section, user), JSON.stringify(filter));
}
function operationGroupText(op: Operation) { return `${op.operationCode || op.operationId || ''} ${op.operation || op.name || ''} ${op.section || ''}`; }
function isNamedBulkGroupOperation(op: Operation) { return isGroupCapableText(operationGroupText(op)); }
function isGroupCapableOperation(op: Operation) { return Boolean(op.groupCapable || isNamedBulkGroupOperation(op)); }
function isBulkActionSelectableOperation(op: Operation) { return op.sourceType === 'production-run' && op.bulkGroupAllowed === true; }
function isSelectableProductionOperation(op?: Operation | null) { return Boolean(op?.sourceType === 'production-run' && op.status === 'queued' && op.canStart !== false && op.id); }
function filterTerminalQueue(queue: Operation[], filter: TerminalFilter) {
  return queue.filter(op => {
    const text = `${op.operationCode} ${op.operation || op.name} ${op.orderNumber || op.displayId || ''} ${op.productCode || ''} ${op.productName || ''} ${op.unitLabel || ''}`.toLowerCase();
    const matchesStatus = filter.status === 'all'
      || (filter.status === 'active' ? op.status !== 'done' && op.status !== 'canceled' : op.status === filter.status);
    return (!filter.query || text.includes(filter.query.toLowerCase()))
      && (!filter.operationCode || op.operationCode === filter.operationCode)
      && (!filter.orderNumber || String(op.orderNumber || op.displayId || '').includes(filter.orderNumber))
      && (!filter.productCode || String(op.productCode || '').toLowerCase().includes(filter.productCode.toLowerCase()))
      && matchesStatus
      && (!filter.groupOnly || isBulkActionSelectableOperation(op));
  });
}
type BlockingOperationTitles = Map<string, string>;
type BlockingOperationRef = NonNullable<Operation['blockedByOperations']>[number];
function operationLookupKeys(op: Operation) {
  return [op.operationId, op.operationCode, op.displayId, String(op.id || '')]
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}
function buildBlockingOperationTitles(queue: Operation[]) {
  const titles: BlockingOperationTitles = new Map();
  queue.forEach(op => {
    const title = displayOperationTitle(op);
    operationLookupKeys(op).forEach(key => titles.set(key, title));
  });
  return titles;
}
function blockingOperationLabel(op: BlockingOperationRef) {
  const title = displayOperationTitle(op);
  return op.section ? `${title} · ${op.section}` : title;
}

function blockedOperationLabels(items: string[] | undefined, titles: BlockingOperationTitles, operations?: Operation['blockedByOperations']) {
  if (operations?.length) return operations.map(blockingOperationLabel);
  if (!items?.length) return [];
  return items.map(item => titles.get(String(item || '').trim().toLowerCase()) || displayBlockedBy([item]));
}

function BlockedOperationsList({ items, titles, operations, compact = false }: { items?: string[]; titles: BlockingOperationTitles; operations?: Operation['blockedByOperations']; compact?: boolean }) {
  const labels = blockedOperationLabels(items, titles, operations).filter(Boolean);
  if (!labels.length) return <span>предшествующие операции</span>;
  if (labels.length === 1) return <span>{labels[0]}</span>;
  return <details className={compact ? 'blocked-operations-list compact' : 'blocked-operations-list'}><summary>{labels.length} предыдущие операции</summary><ul>{labels.map((label, index) => <li key={`${label}-${index}`}>{label}</li>)}</ul></details>;
}

export function WorkCenterTerminal({ sections, people, onDone, user, terminalMode }: { sections: string[]; people: Person[]; onDone: () => void; user?: AuthUser; terminalMode?: boolean }) {
  const [section, setSection] = useState(sections[0] || '');
  const [data, setData] = useState<TerminalData | null>(null);
  const [selectedTerminalOperationKey, setSelectedTerminalOperationKey] = useState('');
  const [selectedOperationKeys, setSelectedOperationKeys] = useState<Set<string>>(() => new Set());
  const [productionSelection, setProductionSelection] = useState<ProductionSelection | null>(null);
  const [exitingOperationKeys, setExitingOperationKeys] = useState<Set<string>>(() => new Set());
  const [startingOperationKeys, setStartingOperationKeys] = useState<Set<string>>(() => new Set());
  const [operationFlashActions, setOperationFlashActions] = useState<Map<string, TerminalOperationAction>>(() => new Map());
  const [filter, setFilter] = useState<TerminalFilter>(() => readTerminalFilter(sections[0] || '', user));
  const [personId, setPersonId] = useState<number | ''>('');
  const [operator, setOperator] = useState(user?.displayName || 'Петров');
  const [error, setError] = useState('');
  useEffect(() => { if (!section && sections[0]) setSection(sections[0]); }, [sections, section]);
  useEffect(() => {
    setFilter(readTerminalFilter(section, user));
    setSelectedOperationKeys(new Set());
    setProductionSelection(null);
    setExitingOperationKeys(new Set());
    setStartingOperationKeys(new Set());
    setOperationFlashActions(new Map());
  }, [section, user?.id]);
  useEffect(() => { writeTerminalFilter(section, user, filter); }, [section, user?.id, filter]);
  async function loadTerminal(target = section) { if (!target && !terminalMode) return; setError(''); try { const url = terminalMode ? `${API}/me/terminal` : `${API}/work-centers/${encodeURIComponent(target)}/terminal`; const json = await getJson<TerminalData>(url); setData(json); setPersonId(user?.personId || json.people[0]?.id || ''); if (user?.displayName) setOperator(user.displayName); else if (!operator && json.people[0]?.fullName) setOperator(json.people[0].fullName); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка терминала'); } }
  useEffect(() => { loadTerminal(); }, [section]);
  useEffect(() => {
    if (exitingOperationKeys.size || startingOperationKeys.size) return;
    const timer = window.setInterval(() => loadTerminal(), TERMINAL_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [section, terminalMode, exitingOperationKeys.size, startingOperationKeys.size]);
  async function releaseProductionSelection(selection = productionSelection) {
    if (!selection?.lockToken) return;
    await fetch(`${API}/me/terminal/production/unit-operations/${encodeURIComponent(selection.operationPk)}/release-selection`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lockToken: selection.lockToken, operator, terminalId: user?.login || section, clientId: terminalClientId() }),
    }).catch(() => {});
  }
  async function selectProductionOperation(op: Operation) {
    const key = terminalOperationKey(op);
    if (!terminalMode || !isSelectableProductionOperation(op)) {
      setSelectedTerminalOperationKey(key);
      return null;
    }
    const existingExpiry = productionSelection?.lockExpiresAt ? new Date(productionSelection.lockExpiresAt).getTime() : 0;
    if (productionSelection?.operationKey === key && productionSelection.lockToken && existingExpiry > Date.now() + 5000) {
      setSelectedTerminalOperationKey(key);
      return productionSelection;
    }
    if (productionSelection && productionSelection.operationKey !== key) await releaseProductionSelection(productionSelection);
    const res = await fetch(`${API}/me/terminal/production/unit-operations/${encodeURIComponent(String(op.id))}/select`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator, terminalId: user?.login || section, clientId: terminalClientId() }),
    });
    if (!res.ok) {
      const message = apiErrorMessage(await res.json(), 'Не удалось выбрать операцию');
      setError(message);
      await loadTerminal();
      return null;
    }
    const json = await res.json() as { id: string; lockToken: string; lockExpiresAt?: string | null; lockVersion?: number };
    const selection = { operationKey: key, operationPk: json.id, lockToken: json.lockToken, lockExpiresAt: json.lockExpiresAt, lockVersion: json.lockVersion };
    setProductionSelection(selection);
    setSelectedTerminalOperationKey(key);
    return selection;
  }
  async function ensureProductionSelection(op: Operation) {
    if (!terminalMode || op.sourceType !== 'production-run' || op.status !== 'queued') return null;
    return selectProductionOperation(op);
  }
  useEffect(() => {
    if (!terminalMode || !productionSelection?.lockToken) return;
    const heartbeat = async () => {
      const res = await fetch(`${API}/me/terminal/production/unit-operations/${encodeURIComponent(productionSelection.operationPk)}/heartbeat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockToken: productionSelection.lockToken, operator, terminalId: user?.login || section, clientId: terminalClientId() }),
      });
      if (!res.ok) {
        setProductionSelection(null);
        setError(apiErrorMessage(await res.json(), 'Операция потеряла актуальность'));
        await loadTerminal();
        return;
      }
      const json = await res.json() as { lockExpiresAt?: string | null; lockVersion?: number };
      setProductionSelection(prev => prev?.operationPk === productionSelection.operationPk ? { ...prev, lockExpiresAt: json.lockExpiresAt, lockVersion: json.lockVersion } : prev);
    };
    const timer = window.setInterval(heartbeat, TERMINAL_HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [terminalMode, productionSelection?.operationPk, productionSelection?.lockToken, operator, section, user?.login]);
  const rawQueue = data?.queue || [];
  const queue = useMemo(() => filterTerminalQueue(rawQueue, filter), [rawQueue, filter]);
  const blockingOperationTitles = useMemo(() => buildBlockingOperationTitles(rawQueue), [rawQueue]);
  const operationOptions = useMemo(() => Array.from(new Map(rawQueue.map(op => [op.operationCode, displayOperationTitle(op)])).entries()).map(([code, title]) => ({ code, title })).sort((a, b) => a.title.localeCompare(b.title, 'ru')), [rawQueue]);
  const selectedOperations = useMemo(() => queue.filter(op => selectedOperationKeys.has(terminalOperationKey(op))), [queue, selectedOperationKeys]);
  useEffect(() => {
    setSelectedOperationKeys(prev => {
      if (!prev.size) return prev;
      const allowedKeys = new Set(queue.filter(isBulkActionSelectableOperation).map(terminalOperationKey));
      const next = new Set<string>();
      let changed = false;
      prev.forEach(key => {
        if (allowedKeys.has(key)) next.add(key);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [queue]);
  useEffect(() => {
    if (!data) return;
    const active = queue.find(op => op.status === 'work') || queue.find(op => op.status === 'paused') || data.currentOperation || queue[0] || null;
    const selectedExists = selectedTerminalOperationKey && queue.some(op => terminalOperationKey(op) === selectedTerminalOperationKey);
    if (!selectedExists) setSelectedTerminalOperationKey(terminalOperationKey(active));
  }, [data, queue, selectedTerminalOperationKey]);
  function flashOperations(keys: string[], type: TerminalOperationAction) {
    if (!keys.length) return;
    setOperationFlashActions(prev => {
      const next = new Map(prev);
      keys.forEach(key => next.set(key, type));
      return next;
    });
    window.setTimeout(() => {
      setOperationFlashActions(prev => {
        const next = new Map(prev);
        keys.forEach(key => {
          if (next.get(key) === type) next.delete(key);
        });
        return next;
      });
    }, OPERATION_FLASH_MS);
  }
  async function action(op: Operation, type: 'start'|'pause'|'resume'|'complete') {
    const key = terminalOperationKey(op);
    const selection = type === 'start' ? await ensureProductionSelection(op) : productionSelection?.operationKey === key ? productionSelection : null;
    if (type === 'start' && terminalMode && op.sourceType === 'production-run' && !selection?.lockToken) return;
    const url = terminalMode
      ? (op.sourceType === 'production-run' && op.runId && op.operationId && op.unitId
        ? `${API}/me/terminal/production/runs/${encodeURIComponent(op.runId)}/units/${encodeURIComponent(op.unitId)}/operations/${encodeURIComponent(op.operationId)}/${type}`
        : `${API}/me/terminal/operations/${op.id}/${type}`)
      : (op.sourceType === 'production-run' && op.runId && op.operationId
        ? (op.unitId
          ? `${API}/production/runs/${encodeURIComponent(op.runId)}/units/${encodeURIComponent(op.unitId)}/operations/${encodeURIComponent(op.operationId)}/${type}`
          : `${API}/production/runs/${encodeURIComponent(op.runId)}/operations/${encodeURIComponent(op.operationId)}/${type}`)
        : `${API}/operations/${op.id}/${type}`);
    const body = op.sourceType === 'production-run' ? { operator, lockToken: selection?.lockToken, expectedVersion: selection?.lockVersion } : { personId: personId || user?.personId || undefined };
    const res = await fetch(url, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!res.ok) {
      alert((await res.json()).message || 'Не удалось выполнить действие');
      return;
    }
    if (type === 'start' && selection?.operationKey === key) setProductionSelection(null);
    if (type === 'pause' || type === 'complete') flashOperations([key], type);
    if (type === 'start' || type === 'resume') {
      flushSync(() => setStartingOperationKeys(prev => new Set(prev).add(key)));
      await delay(OPERATION_START_MS);
    }
    if (type === 'complete') {
      flushSync(() => {
        setExitingOperationKeys(prev => new Set(prev).add(key));
        setSelectedOperationKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });
      await delay(OPERATION_EXIT_MS);
    }
    await loadTerminal();
    if (type === 'start' || type === 'resume') flashOperations([key], type);
    if (type === 'start' || type === 'resume') {
      setStartingOperationKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    if (type === 'complete') {
      setExitingOperationKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      if (productionSelection?.operationKey === key) setProductionSelection(null);
    }
    onDone();
  }
  const toggleOperationSelection = (op: Operation) => {
    if (!isBulkActionSelectableOperation(op)) return;
    const key = terminalOperationKey(op);
    setSelectedOperationKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  async function bulkAction(type: 'start'|'pause'|'resume'|'complete') {
    const items = selectedOperations.filter(op => isBulkActionSelectableOperation(op) && op.runId && op.unitId && op.operationId);
    if (items.length !== selectedOperations.length || items.length < 2) return alert('Выберите минимум две операции одного разрешенного типа: лазер, зачистка или пробивной/координатный станок');
    if (type === 'complete' && items.length > 5 && !window.confirm(`Завершить сразу ${items.length} операций?`)) return;
    const res = await fetch(`${API}/${terminalMode ? 'me/terminal/production/unit-operations/bulk-action' : 'production/unit-operations/bulk-action'}`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:type, operator, lockedBy:operator, items:items.map(op => ({ runId:op.runId, unitId:op.unitId, operationId:op.operationId })) }) });
    if (!res.ok) return alert(apiErrorMessage(await res.json(), 'Не удалось выполнить групповое действие'));
    const actionKeys = items.map(op => terminalOperationKey(op));
    const exitKeys = actionKeys;
    if (type === 'pause' || type === 'complete') flashOperations(actionKeys, type);
    if (type === 'start' || type === 'resume') {
      flushSync(() => {
        setStartingOperationKeys(prev => {
          const next = new Set(prev);
          actionKeys.forEach(key => next.add(key));
          return next;
        });
      });
      await delay(OPERATION_START_MS);
    }
    if (type === 'complete') {
      flushSync(() => {
        setExitingOperationKeys(prev => {
          const next = new Set(prev);
          exitKeys.forEach(key => next.add(key));
          return next;
        });
      });
      await delay(OPERATION_EXIT_MS);
    }
    setSelectedOperationKeys(new Set());
    await loadTerminal();
    if (type === 'start' || type === 'resume') flashOperations(actionKeys, type);
    if (type === 'start' || type === 'resume') {
      setStartingOperationKeys(prev => {
        const next = new Set(prev);
        actionKeys.forEach(key => next.delete(key));
        return next;
      });
    }
    if (type === 'complete') {
      setExitingOperationKeys(prev => {
        const next = new Set(prev);
        exitKeys.forEach(key => next.delete(key));
        return next;
      });
    }
    onDone();
  }
  const availablePeople = data?.people.length ? data.people : people.filter(p=>p.section===section);
  const selectedOperation = queue.find(op => terminalOperationKey(op) === selectedTerminalOperationKey) || data?.currentOperation || null;
  const selectedOperationKey = terminalOperationKey(selectedOperation);
  const selectedOperationFlashClass = terminalOperationFlashClass(operationFlashActions.get(selectedOperationKey));
  const sectionName = data?.section || user?.workCenterSection || section || 'участок не выбран';
  return <>
    {!terminalMode && <PageTitle title="Терминал участка" subtitle="Рабочее место оператора: текущая операция, очередь и быстрые действия" />}
    {error && <div className="alert">{error}</div>}
    <section className="card terminal-header-card"><div className="terminal-header-main"><div><span className="terminal-eyebrow">Участок</span><h2>{sectionName}</h2><p>{rawQueue.length ? `В очереди ${queue.length} из ${rawQueue.length} операций` : 'Очередь пуста'}</p></div><button onClick={()=>loadTerminal()}>Обновить</button></div><div className="terminal-header-meta">{terminalMode ? <><div><span>Аккаунт</span><b>{user?.displayName || operator}</b></div><div><span>Показано</span><b>{queue.length}</b></div><div><span>Скрыто блокировок</span><b>{data?.blockedCount || 0}</b></div></> : <><select value={section} onChange={e=>setSection(e.target.value)}>{sections.map(s=><option key={s}>{s}</option>)}</select><select value={personId} onChange={e=>{ const id = Number(e.target.value) || ''; setPersonId(id); const person = availablePeople.find(p=>p.id===id); if (person) setOperator(person.fullName); }}><option value="">Исполнитель не выбран</option>{availablePeople.map(p=><option key={p.id} value={p.id}>{p.fullName}</option>)}</select><input value={operator} onChange={e=>setOperator(e.target.value)} placeholder="Исполнитель, например Петров" /></>}</div></section>
    <TerminalFilterBar filter={filter} setFilter={setFilter} operationOptions={operationOptions} onReset={()=>setFilter(DEFAULT_TERMINAL_FILTER)} />
    {selectedOperations.length > 0 && <TerminalBulkBar selected={selectedOperations} onClear={()=>setSelectedOperationKeys(new Set())} onAction={bulkAction} />}
    <div className="terminal-workspace-grid">
      <section className="card current-op terminal-current"><div className="card-head"><div><h2>Текущая операция</h2><p className="small">Основное действие на рабочем месте</p></div>{selectedOperation && <span className={`status ${selectedOperation.dependencyStatus === 'blocked' ? 'blocked' : selectedOperation.status}`}>{selectedOperation.dependencyStatus === 'blocked' ? 'Ожидает' : statusLabel(selectedOperation.status)}</span>}</div>{selectedOperation ? <OperationPanel op={selectedOperation} blockingOperationTitles={blockingOperationTitles} exiting={exitingOperationKeys.has(selectedOperationKey)} starting={startingOperationKeys.has(selectedOperationKey)} flashClass={selectedOperationFlashClass} onAction={action} /> : <Empty text="Нет операций в очереди участка" />}</section>
      <section className="card terminal-queue-card"><div className="card-head"><div><h2>Очередь</h2><p className="small">{sectionName}</p></div><span className="queue-count">{queue.length}</span></div><OperationQueue queue={queue} selectedKey={selectedTerminalOperationKey} selectedKeys={selectedOperationKeys} exitingKeys={exitingOperationKeys} startingKeys={startingOperationKeys} flashActions={operationFlashActions} blockingOperationTitles={blockingOperationTitles} onSelect={selectProductionOperation} onToggle={toggleOperationSelection} /></section>
    </div>
    <TerminalRecentEvents events={data?.recentEvents || []} />
  </>;
}

function TerminalFilterBar({ filter, setFilter, operationOptions, onReset }: { filter: TerminalFilter; setFilter: (filter: TerminalFilter) => void; operationOptions: Array<{ code: string; title: string }>; onReset: () => void }) {
  return <section className="card terminal-filter-card"><div className="terminal-filter-grid"><input value={filter.query} onChange={e=>setFilter({...filter, query:e.target.value})} placeholder="Поиск: операция, заказ, изделие, единица" /><select value={filter.operationCode} onChange={e=>setFilter({...filter, operationCode:e.target.value})}><option value="">Все операции</option>{operationOptions.map(item=><option key={item.code} value={item.code}>{item.title}</option>)}</select><select value={filter.status} onChange={e=>setFilter({...filter, status:e.target.value})}><option value="active">Активные</option><option value="all">Все</option><option value="queued">Очередь</option><option value="work">В работе</option><option value="paused">Пауза</option><option value="done">Готово</option></select><input value={filter.orderNumber} onChange={e=>setFilter({...filter, orderNumber:e.target.value})} placeholder="Заказ / партия" /><input value={filter.productCode} onChange={e=>setFilter({...filter, productCode:e.target.value})} placeholder="Код изделия" /><label className="check-row"><input type="checkbox" checked={filter.groupOnly} onChange={e=>setFilter({...filter, groupOnly:e.target.checked})} />Групповые</label><button className="secondary" onClick={onReset}>Сбросить</button></div></section>;
}

function TerminalBulkBar({ selected, onClear, onAction }: { selected: Operation[]; onClear: () => void; onAction: (type: 'start'|'pause'|'resume'|'complete') => void | Promise<unknown> }) {
  const [pending, setPending] = useState(false);
  const groupable = selected.filter(isBulkActionSelectableOperation);
  const sameOperation = new Set(groupable.map(op => `${op.section}|${op.operationCode}`)).size === 1;
  const canRun = groupable.length === selected.length && groupable.length >= 2 && sameOperation;
  const runAction = (type: 'start'|'pause'|'resume'|'complete') => {
    if (pending) return;
    setPending(true);
    Promise.resolve(onAction(type)).finally(() => setPending(false));
  };
  return <section className="card terminal-bulk-card"><div><b>Выбрано {selected.length} шт.</b><span>{canRun ? `${displayOperationTitle(groupable[0])} · ${groupable[0].section}` : 'Выберите несколько операций: лазер, зачистка или пробивной/координатный участок'}</span></div><div className="inline-actions"><button disabled={!canRun || pending} onClick={()=>runAction('start')}>{pending ? 'Загрузка...' : 'Начать'}</button><button disabled={!canRun || pending} className="pause" onClick={()=>runAction('pause')}>{pending ? 'Загрузка...' : 'Пауза'}</button><button disabled={!canRun || pending} onClick={()=>runAction('resume')}>{pending ? 'Загрузка...' : 'Возобновить'}</button><button disabled={!canRun || pending} className="done-action" onClick={()=>runAction('complete')}>{pending ? 'Загрузка...' : 'Завершить'}</button><button className="secondary" disabled={pending} onClick={onClear}>Снять выбор</button></div></section>;
}

function TerminalBatchLabel({ value, compact = false }: { value: string; compact?: boolean }) {
  const match = value.match(/^(.*?)(-\d+)$/);
  const prefix = match ? match[1] : value;
  const suffix = match ? match[2] : '';
  return <span className={`terminal-batch-label ${compact ? 'compact' : ''}`}><span className="terminal-batch-title">Партия</span><span className="terminal-batch-code"><span>{prefix}</span>{suffix && <strong>{suffix}</strong>}</span></span>;
}

function OperationPanel({ op, blockingOperationTitles, exiting = false, starting = false, flashClass = '', onAction }: { op: Operation; blockingOperationTitles: BlockingOperationTitles; exiting?: boolean; starting?: boolean; flashClass?: string; onAction: (op: Operation, type: 'start'|'pause'|'resume'|'complete') => void }) {
  const isRun = op.sourceType === 'production-run';
  return <div className={`op-panel terminal-op-panel ${isRun ? 'production-terminal' : ''} ${op.dependencyStatus === 'blocked' ? 'blocked-op' : ''} ${starting ? 'terminal-operation-start' : ''} ${exiting ? 'terminal-operation-exit' : ''} ${flashClass}`}><div className="terminal-op-main"><span className={`source-badge ${isRun ? 'production' : 'order'}`}>{isRun ? 'Единица' : 'Заказ'}</span><h3>{displayOperationDetail(op)}</h3><p className="terminal-op-line"><span>{op.productCode} {op.productName || 'Изделие'}</span>{isRun ? <TerminalBatchLabel value={displayOperationBatch(op)} /> : <span>{displayOrderNumber(op.orderNumber || op.displayId)}</span>}</p>{op.blockedBy?.length ? <div className="terminal-blocked-detail"><b>Ожидает завершения:</b><BlockedOperationsList items={op.blockedBy} titles={blockingOperationTitles} operations={op.blockedByOperations} /></div> : null}</div><div className="terminal-op-meta"><div><span>Единица</span><b>{op.unitLabel || '—'}</b></div><div><span>Деталь</span><b>{isRun ? (op.part || '—') : '—'}</b></div><div><span>Факт</span><b>{hours(op.actualHours)}</b></div></div><div className="terminal-op-status"><span className={`status ${op.dependencyStatus === 'blocked' ? 'blocked' : op.status}`}>{op.dependencyStatus === 'blocked' ? 'Ожидает' : statusLabel(op.status)}</span><p className="small">{op.lockedBy ? `В работе у: ${op.lockedBy}` : 'Исполнитель не назначен'}</p>{op.timeState?.activeKind && <p className="small">С {new Date(op.timeState.activeStartedAt || '').toLocaleTimeString('ru-RU')}</p>}</div><div className="actions terminal-actions"><OperationActions op={op} blockingOperationTitles={blockingOperationTitles} onAction={onAction} /></div></div>;
}

function OperationActions({ op, blockingOperationTitles, onAction }: { op: Operation; blockingOperationTitles: BlockingOperationTitles; onAction: (op: Operation, type: 'start'|'pause'|'resume'|'complete') => void }) {
  const [pending, setPending] = useState(false);
  const blocked = op.canStart === false && (op.status === 'new' || op.status === 'queued');
  const canComplete = op.status === 'work' || op.status === 'paused';
  const completeReason = canComplete ? '' : 'Операцию нельзя завершить без старта';
  const runAction = (type: 'start'|'pause'|'resume'|'complete') => {
    if (pending) return;
    setPending(true);
    Promise.resolve(onAction(op, type)).finally(() => setPending(false));
  };
  return <>{blocked && <div className="blocked-note terminal-blocked-note"><span>Ожидает:</span><BlockedOperationsList items={op.blockedBy} titles={blockingOperationTitles} operations={op.blockedByOperations} compact /></div>}{(op.status === 'new' || op.status === 'queued') && <button className="terminal-start-btn" disabled={pending || blocked} onClick={()=>runAction('start')}>{pending ? 'Загрузка...' : 'Начать'}</button>}{op.status === 'work' && <button className="terminal-pause-btn" disabled={pending} onClick={()=>runAction('pause')}>{pending ? 'Загрузка...' : 'Приостановить'}</button>}{op.status === 'paused' && <button className="terminal-start-btn" disabled={pending} onClick={()=>runAction('resume')}>{pending ? 'Загрузка...' : 'Начать'}</button>}{op.status !== 'done' && op.status !== 'canceled' && <button className="terminal-stop-btn" disabled={pending || !canComplete} title={completeReason} onClick={()=>runAction('complete')}>{pending ? 'Загрузка...' : 'Завершить'}</button>}</>;
}

function OperationQueue({ queue, selectedKey, selectedKeys, exitingKeys, startingKeys, flashActions, blockingOperationTitles, onSelect, onToggle }: { queue: Operation[]; selectedKey: string; selectedKeys: Set<string>; exitingKeys: Set<string>; startingKeys: Set<string>; flashActions: Map<string, TerminalOperationAction>; blockingOperationTitles: BlockingOperationTitles; onSelect: (op: Operation) => void | Promise<unknown>; onToggle: (op: Operation) => void }) {
  if (!queue.length) return <Empty text="Очередь пуста" />;
  return <div className="terminal-queue-list">{queue.map(op=>{ const key = terminalOperationKey(op); const selected = key === selectedKey; const checked = selectedKeys.has(key); const exiting = exitingKeys.has(key); const starting = startingKeys.has(key); const flashClass = terminalOperationFlashClass(flashActions.get(key)); const runLabel = op.sourceType === 'production-run' ? displayOperationBatch(op) : displayOrderNumber(op.orderNumber || op.displayId); const groupable = isBulkActionSelectableOperation(op); return <div key={key} className={`terminal-queue-item ${groupable ? 'bulk-enabled' : 'bulk-disabled'} ${selected ? 'active' : ''} ${checked ? 'checked' : ''} ${op.sourceType === 'production-run' ? 'production-row' : ''} ${starting ? 'terminal-operation-start' : ''} ${exiting ? 'terminal-operation-exit' : ''} ${flashClass}`}>{groupable && <label className="queue-check"><input type="checkbox" checked={checked} disabled={exiting || starting} onChange={()=>onToggle(op)} /></label>}<button type="button" disabled={exiting} onClick={()=>onSelect(op)}><div><b>{displayOperationDetail(op)}</b><span className="terminal-queue-meta">{op.sourceType === 'production-run' ? <TerminalBatchLabel value={runLabel} compact /> : <>Заказ {runLabel}</>}<span className="terminal-queue-product">· {op.productCode} · ед. {op.unitLabel || '1/1'}</span></span>{groupable && <small>Групповое выполнение</small>}</div><span className={`status ${op.dependencyStatus === 'blocked' ? 'blocked' : op.status}`}>{op.dependencyStatus === 'blocked' ? 'Ожидает' : statusLabel(op.status)}</span></button>{op.blockedBy?.length ? <div className="queue-blocked"><span>Ожидает:</span><BlockedOperationsList items={op.blockedBy} titles={blockingOperationTitles} operations={op.blockedByOperations} compact /></div> : null}</div>; })}</div>;
}

function TerminalRecentEvents({ events }: { events: TerminalRecentEvent[] }) {
  if (!events.length) return <section className="card terminal-events-card"><div className="card-head"><div><h2>Последние действия</h2><p className="small">По этому участку пока нет событий</p></div></div></section>;
  return <section className="card terminal-events-card"><div className="card-head"><div><h2>Последние действия</h2><p className="small">Короткая история операций участка</p></div><span className="queue-count">{events.length}</span></div><div className="terminal-event-list">{events.map(event => <div key={event.id} className="terminal-event-row"><span className={`source-badge ${event.sourceType === 'production-run' ? 'production' : 'order'}`}>{event.sourceType === 'production-run' ? 'Единица' : 'Заказ'}</span><div><b>{event.title || 'Операция'}</b><small>{displayOrderNumber(event.orderNumber || event.runId)}{event.unitLabel ? ` · ед. ${event.unitLabel}` : ''}{event.actor ? ` · ${event.actor}` : ''}</small></div><strong>{eventLabel(event.eventType)}</strong><time>{new Date(event.timestamp).toLocaleString('ru-RU')}</time></div>)}</div></section>;
}

function eventLabel(type: string) {
  return ({ start: 'Старт', work: 'Старт', pause: 'Пауза', resume: 'Возобновлено', complete: 'Готово', done: 'Готово', reset: 'Сброс' } as Record<string, string>)[type] || type;
}
