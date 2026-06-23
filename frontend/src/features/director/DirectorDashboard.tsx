import { useEffect, useMemo, useState } from 'react';
import { API, getJson } from '../../api/client';
import type { DirectorDashboardData, DirectorRiskOperation, Order, SectionLoad, Summary } from '../../api/types';
import { Empty, Kpi, MiniChart, OrderProgress, PageTitle, Quality, date, displayOperationTitle, displayOrderNumber, hours, loadResourceLabel } from '../../components/common';

const APP_REFRESH_MS = 15000;

function directorRiskReason(reason?: string | null) {
  return reason ? reason.replace(/Ожидает:\s*ОР-\d+/gi, 'Ожидает предыдущую операцию').replace(/\bОР-\d+\b/gi, 'предыдущая операция') : '';
}

export function DirectorDashboard({ fallback }: { fallback: { summary: Summary; loads: SectionLoad[]; orders: Order[] } }) {
  const [data, setData] = useState<DirectorDashboardData | null>(null);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    async function loadDirector(silent = false) {
      if (!silent) setLoading(true);
      try {
        const json = await getJson<DirectorDashboardData>(`${API}/director/dashboard`);
        if (!ignore) { setData(json); setError(''); }
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Ошибка директорского монитора');
      } finally {
        if (!ignore && !silent) setLoading(false);
      }
    }
    loadDirector();
    const timer = window.setInterval(() => loadDirector(true), APP_REFRESH_MS);
    return () => { ignore = true; window.clearInterval(timer); };
  }, []);
  const kpi = data?.kpi || { orders: fallback.summary.orders, avgProgress: fallback.summary.avgProgress, overdue: 0, completedOperations: fallback.summary.doneOps, inWorkOperations: fallback.summary.workOps, pausedOperations: fallback.summary.pausedOps || 0, bottlenecks: fallback.loads.filter(l=>l.loadPct>=100).length };
  const allRows: Array<Order & { sourceType?: 'order' | 'production-run'; displayId?: string; isWithoutOrder?: boolean }> = data?.orderProgress || fallback.orders;
  const allLoads = data?.sectionLoad || fallback.loads;
  const allRisks = data?.riskOperations || [];
  const sections = Array.from(new Set([...allLoads.map(load => load.section), ...allRisks.map(risk => risk.section)])).filter(Boolean).sort();
  const q = query.trim().toLowerCase();
  const rows = allRows.filter(row => (!q || `${row.displayId || row.orderNumber || ''} ${row.productCode || ''} ${row.productName || ''}`.toLowerCase().includes(q)));
  const loads = allLoads.filter(load => !section || load.section === section);
  const risks = allRisks.filter(risk => (!section || risk.section === section) && (!q || `${risk.orderNumber || ''} ${risk.runId || ''} ${risk.productCode || ''} ${risk.productName || ''} ${risk.operationId} ${risk.name} ${risk.section}`.toLowerCase().includes(q)));
  const decisions = [
    ...risks.slice(0, 5).map(risk => ({ key: `${risk.sourceType}-${risk.runId || risk.orderNumber}-${risk.operationId}`, title: displayOperationTitle(risk), text: `${displayOrderNumber(risk.orderNumber || risk.runId)} · ${risk.section} · ${directorRiskReason(risk.reason)}`, tone: 'danger' as const })),
    ...loads.filter(load => load.loadPct >= 100).slice(0, 3).map(load => ({ key: `load-${load.section}`, title: load.section, text: `Загрузка ${load.loadPct}% · ${hours(load.remainingHours)} осталось`, tone: 'warn' as const })),
  ].slice(0, 8);
  return <>
    <PageTitle title="Дашборд директора" subtitle="Готовность заказов и партий, загрузка участков и узкие места" />
    {loading && <div className="loading">Загрузка директорского монитора...</div>}
    {error && <div className="alert">{error}. Показаны базовые данные.</div>}
    <section className="card director-filter-card"><div className="filters"><input name="director-search" aria-label="Поиск по директорскому монитору" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск: заказ, партия, номенклатура, операция" /><select name="director-section" aria-label="Участок директорского монитора" value={section} onChange={e=>setSection(e.target.value)}><option value="">Все участки</option>{sections.map(item=><option key={item}>{item}</option>)}</select><button type="button" className="light-btn" onClick={()=>{ setQuery(''); setSection(''); }}>Сброс</button></div></section>
    <div className="kpis"><Kpi title="Объектов" value={kpi.orders} /><Kpi title="Партий в производстве" value={kpi.productionRuns || 0} /><Kpi title="Готовность" value={`${kpi.avgProgress}%`} /><Kpi title="Просрочек" value={kpi.overdue} tone="danger" /><Kpi title="Операций завершено" value={kpi.completedOperations} /><Kpi title="На паузе" value={kpi.pausedOperations || 0} tone="warn" /><Kpi title="Узких мест" value={kpi.bottlenecks} tone="warn" /></div>
    <section className="card director-decision-card"><h2>Что требует решения сейчас</h2><DirectorDecisionList items={decisions} /></section>
    <div className="grid2"><section className="card"><h2>Готовность заказов и партий</h2><OrderProgress rows={rows} /></section><section className="card"><h2>Загрузка участков</h2><DirectorLoadDrilldown loads={loads} risks={risks} /></section></div>
    <div className="grid2"><section className="card"><h2>Операции с риском просрочки</h2><DirectorRiskList risks={risks} /></section><section className="card"><h2>Тренд выпуска</h2><MiniChart rows={data?.productionDynamics || []} /></section></div>
    <div className="grid2"><section className="card"><h2>Расшифровка готовности</h2><DirectorReadiness rows={rows} /></section><section className="card"><h2>Качество</h2><Quality quality={data?.quality} /></section></div>
  </>;
}

function DirectorDecisionList({ items }: { items: Array<{ key: string; title: string; text: string; tone: 'danger' | 'warn' }> }) {
  if (!items.length) return <Empty text="Критичных решений по текущему фильтру нет" />;
  return <div className="director-decision-list">{items.map(item => <div key={item.key} className={`director-decision ${item.tone}`}><b>{item.title}</b><span>{item.text}</span></div>)}</div>;
}

function DirectorLoadDrilldown({ loads, risks }: { loads: SectionLoad[]; risks: DirectorRiskOperation[] }) {
  if (!loads.length) return <Empty text="Нет данных по загрузке участков" />;
  return <div className="director-loads">{loads.map(load => { const sectionRisks = risks.filter(risk => risk.section === load.section).slice(0, 5); return <details key={load.section} className="director-load-item" open={load.loadPct >= 100}><summary><div><b>{load.section}</b><span>{loadResourceLabel(load)}</span></div><strong className={load.loadPct>100?'text-danger':''}>{load.loadPct}%</strong></summary><div className="bar big"><i style={{width:`${Math.min(load.loadPct, 160)}%`}} /></div>{sectionRisks.length ? <div className="director-risk-mini">{sectionRisks.map(risk => <p key={`${risk.sourceType}-${risk.runId || risk.orderNumber}-${risk.operationId}`}><b>{displayOperationTitle(risk)}</b><span>{directorRiskReason(risk.reason)}</span></p>)}</div> : <p className="small">Рисковые операции по участку не найдены.</p>}</details>; })}</div>;
}

function DirectorRiskList({ risks }: { risks: DirectorRiskOperation[] }) {
  if (!risks.length) return <Empty text="Рисковых операций по фильтру нет" />;
  return <div className="director-risk-list">{risks.slice(0, 12).map(risk => <div key={`${risk.sourceType}-${risk.runId || risk.orderNumber}-${risk.operationId}-${risk.unitLabel || ''}`}><span className={`source-badge ${risk.sourceType === 'production-run' ? 'production' : 'order'}`}>{risk.sourceType === 'production-run' ? 'Партия' : 'Заказ'}</span><div><b>{displayOperationTitle(risk)}</b><p>{risk.section} · {directorRiskReason(risk.reason)}</p><small>{displayOrderNumber(risk.orderNumber || risk.runId)}{risk.unitLabel ? ` · ед. ${risk.unitLabel}` : ''}{risk.dueDate ? ` · срок ${date(risk.dueDate)}` : ''}</small></div></div>)}</div>;
}

function DirectorReadiness({ rows }: { rows: Array<Order & { sourceType?: string; displayId?: string; isWithoutOrder?: boolean }> }) {
  if (!rows.length) return <Empty text="Нет объектов по фильтру" />;
  const groups = { ready: rows.filter(row => row.progress >= 100), risk: rows.filter(row => row.progress < 100 && row.dueDate && new Date(row.dueDate) < new Date()), active: rows.filter(row => row.progress > 0 && row.progress < 100), waiting: rows.filter(row => row.progress === 0) };
  return <div className="director-readiness"><div><span>Готово</span><b>{groups.ready.length}</b></div><div><span>В риске</span><b>{groups.risk.length}</b></div><div><span>В работе</span><b>{groups.active.length}</b></div><div><span>Ожидает старта</span><b>{groups.waiting.length}</b></div></div>;
}
