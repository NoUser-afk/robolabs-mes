import React, { useState } from 'react';
import { API, apiErrorMessage } from '../../api/client';
import type { ProductProcess, TechProcessExcelImportIssue, TechProcessExcelImportPreview, TechProcessExcelImportResult } from '../../api/types';
import { hours } from '../../components/common';

type ImportMode = 'draft' | 'active';

type Props = {
  onImported: (process: ProductProcess) => void;
};

export function TechProcessExcelImport({ onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [replaceExistingProductCode, setReplaceExistingProductCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<TechProcessExcelImportPreview | null>(null);
  const [result, setResult] = useState<TechProcessExcelImportResult | null>(null);

  async function send(mode: 'dry-run' | ImportMode) {
    if (!file) {
      setError('Выберите Excel-файл техпроцесса');
      return null;
    }
    setBusy(true);
    setError('');
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    form.append('replaceExistingProductCode', String(replaceExistingProductCode));
    const endpoint = mode === 'dry-run' ? `${API}/import/techprocess-excel/preview` : `${API}/import/techprocess-excel`;
    try {
      const res = await fetch(endpoint, { method: 'POST', body: form, credentials: 'include' });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setPreview(json || null);
        setError(apiErrorMessage(json, 'Не удалось загрузить техпроцесс из Excel'));
        return null;
      }
      if (mode === 'dry-run') {
        setPreview(json as TechProcessExcelImportPreview);
        return json as TechProcessExcelImportPreview;
      }
      const saved = json as TechProcessExcelImportResult;
      setResult(saved);
      setPreview(saved);
      onImported(saved.process);
      return saved;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить техпроцесс из Excel');
      return null;
    } finally {
      setBusy(false);
    }
  }

  const summary = preview?.summary || result?.summary;
  return <div className="techprocess-import">
    <div className="techprocess-import-grid">
      <label>
        <span>Excel-файл техпроцесса</span>
        <input type="file" accept=".xlsx,.xls" onChange={event => {
          setFile(event.target.files?.[0] || null);
          setPreview(null);
          setResult(null);
          setError('');
        }} />
      </label>
      <label className="check-row techprocess-import-check">
        <input type="checkbox" checked={replaceExistingProductCode} onChange={event => setReplaceExistingProductCode(event.target.checked)} />
        Сохранить как новую версию существующей номенклатуры при совпадении кода
      </label>
    </div>
    <div className="inline-actions techprocess-import-actions">
      <button className="light-btn" disabled={busy || !file} onClick={() => send('dry-run')}>{busy ? 'Проверка...' : 'Проверить'}</button>
      <button className="light-btn" disabled={busy || !file || Boolean(preview?.errors?.length)} onClick={() => send('draft')}>{busy ? 'Сохранение...' : 'Сохранить черновик'}</button>
      <button className="done-action" disabled={busy || !file || Boolean(preview?.errors?.length)} onClick={() => send('active')}>{busy ? 'Сохранение...' : 'Сохранить и сделать активным'}</button>
    </div>
    {error && <div className="alert">{error}</div>}
    {summary && <div className="techprocess-import-summary">
      <div><span>Код</span><b>{summary.productCode}</b></div>
      <div><span>Наименование</span><b>{summary.equipment}</b></div>
      <div><span>Категория</span><b>{summary.category}</b></div>
      <div><span>Операций</span><b>{summary.operationsCount}</b></div>
      <div><span>Норма</span><b>{hours(summary.totalNormHours)}</b></div>
    </div>}
    {preview && <div className="techprocess-import-diagnostics">
      <IssueList title="Ошибки" tone="error" issues={preview.errors || []} empty="Ошибок не найдено" />
      <IssueList title="Предупреждения" tone="warning" issues={preview.warnings || []} empty="Предупреждений нет" />
    </div>}
    {result && <div className="success-note">Техпроцесс загружен: версия v{result.version?.versionNo || result.process.versionNo || '—'}.</div>}
  </div>;
}

function IssueList({ title, tone, issues, empty }: { title: string; tone: 'error' | 'warning'; issues: TechProcessExcelImportIssue[]; empty: string }) {
  return <section className={`techprocess-import-issues ${tone}`}>
    <h3>{title}</h3>
    {issues.length ? <ul>{issues.map((issue, index) => <li key={`${issue.field || 'issue'}-${issue.row || 0}-${index}`}>
      {issue.row ? <b>Строка {issue.row}: </b> : null}
      {issue.field ? <span>{issue.field}: </span> : null}
      {issue.message}
    </li>)}</ul> : <p>{empty}</p>}
  </section>;
}
