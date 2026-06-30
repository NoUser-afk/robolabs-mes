import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { API, apiErrorMessage } from '../../api/client';
import type { BlueprintAddOptions, BlueprintContextMenu, BlueprintEditForm, BlueprintGraphWindowProps, BlueprintStepDraft, BlueprintValidationIssue, ProductProcess, ReferenceData, ReferenceOperationRef } from '../../api/types';
import { Empty, hours } from '../../components/common';
import { isGroupCapableText } from '../../domain/group-capability';

function blueprintStepsFromProcess(process: ProductProcess): BlueprintStepDraft[] {
  return process.processSteps.map(step => ({
    operationId: step.operationId,
    level: step.level || 1,
    x: typeof step.x === 'number' ? step.x : undefined,
    y: typeof step.y === 'number' ? step.y : undefined,
    partOrAssembly: step.partOrAssembly || 'Общее',
    name: step.name,
    section: step.section,
    normHours: Number(step.normHours || 0),
    previousOperationCodes: step.previousOperationCodes || [],
    nextOperationCodes: step.nextOperationCodes || [],
    groupCapable: Boolean(step.groupCapable),
  }));
}

function nextBlueprintOperationId(steps: BlueprintStepDraft[]) {
  const used = new Set(steps.map(step => step.operationId));
  for (let index = steps.length + 1; index < 100000; index += 1) {
    const code = `ОР-${String(index).padStart(5, '0')}`;
    if (!used.has(code)) return code;
  }
  return `ОР-${Date.now().toString().slice(-5)}`;
}

function emptyBlueprintStep(index: number, previous?: BlueprintStepDraft, operationId = `ОР-${String(index + 1).padStart(5, '0')}`): BlueprintStepDraft {
  const level = previous ? previous.level + 1 : 1;
  const position = previous?.x !== undefined && previous?.y !== undefined ? { x: previous.x + 260, y: previous.y + 40 } : { x: 56 + Math.max(0, level - 1) * 260, y: 56 + index * 154 };
  return { operationId, x: position.x, y: position.y, level, partOrAssembly: 'Общее', name: index === 0 ? 'Запуск производственного заказа' : 'Новая операция', section: index === 0 ? 'Диспетчеризация' : 'Участок', normHours: index === 0 ? 0.3 : 1, previousOperationCodes: previous ? [previous.operationId] : [], nextOperationCodes: [], groupCapable: false };
}


function cloneBlueprintSteps(steps: BlueprintStepDraft[]) {
  return steps.map(step => ({ ...step, previousOperationCodes: [...step.previousOperationCodes], nextOperationCodes: [...step.nextOperationCodes] }));
}

function blueprintRightLayout(steps: BlueprintStepDraft[]) {
  const perLevel = new Map<number, number>();
  return steps.map((step) => {
    const level = Math.max(1, Number(step.level || 1));
    const row = perLevel.get(level) || 0;
    perLevel.set(level, row + 1);
    return { ...step, level, x: 56 + (level - 1) * 290, y: 56 + row * 168 };
  });
}

function ensureBlueprintPositions(steps: BlueprintStepDraft[]) {
  const layout = blueprintRightLayout(steps);
  return steps.map((step, index) => ({ ...step, ...(step.x === undefined || step.y === undefined ? { x: layout[index].x, y: layout[index].y } : {}) }));
}

function blueprintDraftPayload(equipment: string, productCode: string, category: string, notes: string, steps: BlueprintStepDraft[]) {
  return { equipment, productCode, category, notes: notes.split('\n').map(item => item.trim()).filter(Boolean), processSteps: steps };
}

const PRODUCT_CODE_EXISTS = 'NOMENCLATURE_PRODUCT_CODE_EXISTS';

function productCodeConflictPayload(payload: any) {
  if (payload?.code === PRODUCT_CODE_EXISTS) return payload;
  if (payload?.message?.code === PRODUCT_CODE_EXISTS) return payload.message;
  return null;
}

function validateBlueprintDraft(equipment: string, productCode: string, category: string, steps: BlueprintStepDraft[]): BlueprintValidationIssue[] {
  const issues: BlueprintValidationIssue[] = [];
  if (!equipment.trim()) issues.push({ type: 'error', message: 'Укажите наименование номенклатуры' });
  if (!productCode.trim()) issues.push({ type: 'error', message: 'Укажите код номенклатуры' });
  if (!category.trim()) issues.push({ type: 'warning', message: 'Категория не заполнена' });
  if (!steps.length) return [...issues, { type: 'error', message: 'В техпроцессе должна быть хотя бы одна операция' }];

  const counts = new Map<string, number>();
  steps.forEach(step => counts.set(step.operationId, (counts.get(step.operationId) || 0) + 1));
  const codes = new Set(steps.map(step => step.operationId));
  const adjacency = new Map<string, string[]>();

  steps.forEach(step => {
    const code = step.operationId;
    if (!code.trim()) issues.push({ type: 'error', message: 'Найдена операция без Op.ID' });
    if ((counts.get(code) || 0) > 1) issues.push({ type: 'error', code, message: `Дублируется Op.ID ${code}` });
    if (!step.name.trim()) issues.push({ type: 'error', code, message: 'Не заполнено название операции' });
    if (!step.section.trim()) issues.push({ type: 'error', code, message: 'Не указан участок' });
    if (Number(step.normHours) < 0 || Number.isNaN(Number(step.normHours))) issues.push({ type: 'error', code, message: 'Норма времени должна быть числом не ниже 0' });

    const next = Array.from(new Set(step.nextOperationCodes.filter(Boolean)));
    adjacency.set(code, next.filter(target => codes.has(target)));
    [...step.previousOperationCodes, ...step.nextOperationCodes].forEach(target => {
      if (!codes.has(target)) issues.push({ type: 'error', code, message: `Связь ведет к отсутствующей операции ${target}` });
    });
    next.forEach(target => {
      const targetStep = steps.find(item => item.operationId === target);
      if (targetStep && !targetStep.previousOperationCodes.includes(code)) issues.push({ type: 'warning', code, message: `Связь ${code} -> ${target} не отражена во входящих связях целевого блока` });
    });
    step.previousOperationCodes.forEach(source => {
      const sourceStep = steps.find(item => item.operationId === source);
      if (sourceStep && !sourceStep.nextOperationCodes.includes(code)) issues.push({ type: 'warning', code, message: `Входящая связь ${source} -> ${code} не отражена в исходящих связях источника` });
    });
  });

  const starts = steps.filter(step => !step.previousOperationCodes.length);
  if (!starts.length) issues.push({ type: 'error', message: 'Нет стартовой операции без входящих связей' });
  if (starts.length > 1) issues.push({ type: 'warning', message: `Найдено несколько стартовых операций: ${starts.map(step => step.operationId).join(', ')}` });

  const visited = new Set<string>();
  const visitFrom = (code: string) => {
    if (visited.has(code)) return;
    visited.add(code);
    (adjacency.get(code) || []).forEach(visitFrom);
  };
  starts.forEach(step => visitFrom(step.operationId));
  steps.forEach(step => {
    if (!visited.has(step.operationId)) issues.push({ type: 'warning', code: step.operationId, message: 'Операция недостижима от стартового блока' });
  });

  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const dfs = (code: string) => {
    const current = state.get(code);
    if (current === 'visiting') {
      const start = stack.indexOf(code);
      issues.push({ type: 'error', code, message: `Найден цикл: ${stack.slice(Math.max(0, start)).concat(code).join(' -> ')}` });
      return;
    }
    if (current === 'done') return;
    state.set(code, 'visiting');
    stack.push(code);
    (adjacency.get(code) || []).forEach(dfs);
    stack.pop();
    state.set(code, 'done');
  };
  steps.forEach(step => dfs(step.operationId));

  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.type}|${issue.code || ''}|${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function blueprintIssueMap(issues: BlueprintValidationIssue[]) {
  return issues.reduce((map, issue) => {
    if (!issue.code) return map;
    const current = map.get(issue.code);
    if (issue.type === 'error' || current !== 'error') map.set(issue.code, issue.type);
    return map;
  }, new Map<string, BlueprintValidationIssue['type']>());
}

export function TechProcessBuilder({ process, referenceData, onSaved, versionEndpoint, versionMethod = 'POST' }: { process: ProductProcess; referenceData: ReferenceData; onSaved: (process: ProductProcess) => void; versionEndpoint?: string; versionMethod?: 'POST' | 'PATCH' }) {
  const [equipment, setEquipment] = useState(process.equipment);
  const [productCode, setProductCode] = useState(process.productCode);
  const [category, setCategory] = useState(process.sourceType === 'manual' ? process.category : 'Ручная номенклатура');
  const [notes, setNotes] = useState(process.notes?.join('\n') || '');
  const [steps, setSteps] = useState<BlueprintStepDraft[]>(() => ensureBlueprintPositions(blueprintStepsFromProcess(process)));
  const [selectedCode, setSelectedCode] = useState(process.processSteps[0]?.operationId || '');
  const [graphOpen, setGraphOpen] = useState(false);
  const [linkFrom, setLinkFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [versionComment, setVersionComment] = useState('');
  const [builderQuery, setBuilderQuery] = useState('');
  const [history, setHistory] = useState<BlueprintStepDraft[][]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(blueprintDraftPayload(process.equipment, process.productCode, process.sourceType === 'manual' ? process.category : 'Ручная номенклатура', process.notes?.join('\n') || '', ensureBlueprintPositions(blueprintStepsFromProcess(process)))));
  useEffect(() => {
    const nextCategory = process.sourceType === 'manual' ? process.category : 'Ручная номенклатура';
    const nextNotes = process.notes?.join('\n') || '';
    const nextSteps = ensureBlueprintPositions(blueprintStepsFromProcess(process));
    setEquipment(process.equipment);
    setProductCode(process.productCode);
    setCategory(nextCategory);
    setNotes(nextNotes);
    setSteps(nextSteps);
    setSelectedCode(nextSteps[0]?.operationId || '');
    setGraphOpen(false);
    setLinkFrom('');
    setMessage('');
    setVersionComment('');
    setHistory([]);
    setSavedSnapshot(JSON.stringify(blueprintDraftPayload(process.equipment, process.productCode, nextCategory, nextNotes, nextSteps)));
  }, [process.id]);
  const selected = steps.find(step => step.operationId === selectedCode) || steps[0];
  const stepCodes = steps.map(step => step.operationId);
  const sectionOptions = Array.from(new Set([...referenceData.sections.filter(section => section.isActive !== false).map(section => section.name), ...steps.map(step => step.section)].filter(Boolean))).sort();
  const operationOptions = referenceData.operations.filter(operation => operation.isActive !== false);
  const dirty = JSON.stringify(blueprintDraftPayload(equipment, productCode, category, notes, steps)) !== savedSnapshot;
  const validationIssues = useMemo(() => validateBlueprintDraft(equipment, productCode, category, steps), [equipment, productCode, category, steps]);
  const validationErrors = validationIssues.filter(issue => issue.type === 'error');
  const issueMap = useMemo(() => blueprintIssueMap(validationIssues), [validationIssues]);
  const levelGroups = useMemo(() => Array.from(steps.reduce((map, step) => {
    const level = Math.max(1, Number(step.level || 1));
    const list = map.get(level) || [];
    list.push(step);
    map.set(level, list);
    return map;
  }, new Map<number, BlueprintStepDraft[]>())).sort(([a], [b]) => a - b), [steps]);
  const normalizedBuilderQuery = builderQuery.trim().toLowerCase();
  const filteredSteps = normalizedBuilderQuery ? steps.filter(step => `${step.operationId} ${step.name} ${step.section} ${step.partOrAssembly}`.toLowerCase().includes(normalizedBuilderQuery)) : steps;
  const remember = () => setHistory(prev => [...prev.slice(-39), cloneBlueprintSteps(steps)]);
  const undo = () => setHistory(prev => {
    const last = prev[prev.length - 1];
    if (!last) return prev;
    setSteps(cloneBlueprintSteps(last));
    setSelectedCode(code => last.some(step => step.operationId === code) ? code : last[0]?.operationId || '');
    setLinkFrom('');
    return prev.slice(0, -1);
  });
  useEffect(() => {
    if (!graphOpen) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [graphOpen, history, steps]);
  const updateStep = (code: string, patch: Partial<BlueprintStepDraft>) => { remember(); setSteps(prev => prev.map(step => step.operationId === code ? { ...step, ...patch } : step)); };
  const commitStepEdit = (oldCode: string, patch: Partial<BlueprintStepDraft>) => {
    const clean = String(patch.operationId || oldCode).trim().toUpperCase();
    if (!clean) { setMessage('Укажите ID операции'); return false; }
    if (clean !== oldCode && stepCodes.includes(clean)) { setMessage(`Операция ${clean} уже есть в техпроцессе`); return false; }
    const nextName = String(patch.name ?? '').trim();
    const nextSection = String(patch.section ?? '').trim();
    const nextPart = String(patch.partOrAssembly ?? '').trim();
    remember();
    setMessage('');
    setSelectedCode(clean);
    setLinkFrom(current => current === oldCode ? clean : current);
    setSteps(prev => prev.map(step => {
      const mapCodes = (codes: string[]) => codes.map(code => code === oldCode ? clean : code);
      if (step.operationId === oldCode) return {
        ...step,
        ...patch,
        operationId: clean,
        name: nextName || step.name,
        section: nextSection || step.section,
        partOrAssembly: nextPart || step.partOrAssembly,
        level: Math.max(1, Number(patch.level ?? step.level) || 1),
        normHours: Math.max(0, Number(patch.normHours ?? step.normHours) || 0),
        previousOperationCodes: mapCodes(patch.previousOperationCodes || step.previousOperationCodes),
        nextOperationCodes: mapCodes(patch.nextOperationCodes || step.nextOperationCodes),
      };
      return { ...step, previousOperationCodes: mapCodes(step.previousOperationCodes), nextOperationCodes: mapCodes(step.nextOperationCodes) };
    }));
    return true;
  };
  const moveStep = (code: string, x: number, y: number) => setSteps(prev => prev.map(step => step.operationId === code ? { ...step, x: Math.max(12, Math.round(x)), y: Math.max(12, Math.round(y)) } : step));
  const reflowRight = () => { remember(); setSteps(prev => blueprintRightLayout(prev)); };
  const addStep = (options: BlueprintAddOptions = {}) => { remember(); setSteps(prev => {
    const after = options.afterCode ? prev.find(step => step.operationId === options.afterCode) : undefined;
    const appendToLast = !options.afterCode && options.x === undefined && options.y === undefined;
    const previous = after || (appendToLast ? prev[prev.length - 1] : undefined);
    const next = emptyBlueprintStep(prev.length, previous, nextBlueprintOperationId(prev));
    if (options.x !== undefined) {
      next.x = Math.max(12, Math.round(options.x));
      next.level = Math.max(1, Math.round((next.x - 56) / 290) + 1);
    }
    if (options.y !== undefined) next.y = Math.max(12, Math.round(options.y));
    setSelectedCode(next.operationId);
    setLinkFrom('');
    const base = previous ? prev.map(step => step.operationId === previous.operationId ? { ...step, nextOperationCodes: Array.from(new Set([...step.nextOperationCodes, next.operationId])) } : step) : prev;
    return [...base, next];
  }); };
  const duplicateStep = (code: string, position?: Pick<BlueprintAddOptions, 'x' | 'y'>) => { remember(); setSteps(prev => {
    const source = prev.find(step => step.operationId === code);
    if (!source) return prev;
    const next = {
      ...source,
      operationId: nextBlueprintOperationId(prev),
      name: `${source.name} копия`,
      x: Math.max(12, Math.round(position?.x ?? (source.x ?? 56) + 36)),
      y: Math.max(12, Math.round(position?.y ?? (source.y ?? 56) + 36)),
      previousOperationCodes: [],
      nextOperationCodes: [],
    };
    setSelectedCode(next.operationId);
    setLinkFrom('');
    return [...prev, next];
  }); };
  const removeStep = (code: string) => { remember(); setSteps(prev => {
    if (prev.length <= 1) return prev;
    const removedIndex = prev.findIndex(step => step.operationId === code);
    const next = prev.filter(step => step.operationId !== code).map(step => ({ ...step, previousOperationCodes: step.previousOperationCodes.filter(item => item !== code), nextOperationCodes: step.nextOperationCodes.filter(item => item !== code) }));
    setSelectedCode(next[Math.max(0, removedIndex - 1)]?.operationId || next[0]?.operationId || '');
    setLinkFrom(current => current === code ? '' : current);
    return next;
  }); };
  const clearStepLinks = (code: string) => { remember(); setSteps(prev => prev.map(step => step.operationId === code ? { ...step, previousOperationCodes: [], nextOperationCodes: [] } : { ...step, previousOperationCodes: step.previousOperationCodes.filter(item => item !== code), nextOperationCodes: step.nextOperationCodes.filter(item => item !== code) })); setLinkFrom(current => current === code ? '' : current); };
  const applyOperationRef = (oldCode: string, nextCode: string) => {
    const ref = operationOptions.find(item => item.operationCode === nextCode);
    const clean = nextCode.trim().toUpperCase();
    if (!clean || (clean !== oldCode && stepCodes.includes(clean))) return;
    remember();
    setSelectedCode(clean);
    setSteps(prev => prev.map(step => {
      if (step.operationId === oldCode) return {
        ...step,
        operationId: clean,
        name: ref?.name || step.name,
        section: ref?.defaultSection || step.section,
        normHours: Number(ref?.defaultNormHours ?? step.normHours ?? 0),
        partOrAssembly: ref?.partOrAssembly || step.partOrAssembly,
        groupCapable: Boolean(step.groupCapable || isGroupCapableText(`${ref?.name || step.name} ${ref?.defaultSection || step.section}`)),
      };
      return {
        ...step,
        previousOperationCodes: step.previousOperationCodes.map(code => code === oldCode ? clean : code),
        nextOperationCodes: step.nextOperationCodes.map(code => code === oldCode ? clean : code),
      };
    }));
  };
  const toggleLink = (from: string, to: string) => {
    if (from === to) return;
    remember();
    setSteps(prev => prev.map(step => {
      if (step.operationId === from) {
        const linked = step.nextOperationCodes.includes(to);
        return { ...step, nextOperationCodes: linked ? step.nextOperationCodes.filter(code => code !== to) : [...step.nextOperationCodes, to] };
      }
      if (step.operationId === to) {
        const linked = step.previousOperationCodes.includes(from);
        return { ...step, previousOperationCodes: linked ? step.previousOperationCodes.filter(code => code !== from) : [...step.previousOperationCodes, from] };
      }
      return step;
    }));
  };
  const clickGraphNode = (code: string) => {
    if (linkFrom && linkFrom !== code) {
      toggleLink(linkFrom, code);
      setSelectedCode(code);
      setLinkFrom('');
      return;
    }
    setSelectedCode(code);
  };
  const selectedOperationInReference = operationOptions.some(item => item.operationCode === selected?.operationId);
  const selectedSectionInReference = sectionOptions.includes(selected?.section || '');
  async function save(activate = true) {
    if (validationErrors.length) {
      const first = validationErrors[0];
      if (first.code) setSelectedCode(first.code);
      setMessage(`Нельзя сохранить техпроцесс: ${first.message}`);
      return;
    }
    setSaving(true); setMessage('');
    const draftPayload = blueprintDraftPayload(equipment, productCode, category, notes, steps);
    const payload = { ...draftPayload, activate, versionComment: versionComment.trim() };
    const savePayload = async (replaceExistingProductCode = false) => {
      const res = await fetch(versionEndpoint || `${API}/nomenclature/processes`, {
        method: versionEndpoint ? versionMethod : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replaceExistingProductCode ? { ...payload, replaceExistingProductCode } : payload),
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { res, json };
    };
    let { res, json } = await savePayload();
    const conflict = !res.ok ? productCodeConflictPayload(json) : null;
    if (conflict) {
      const existing = conflict.existing || {};
      const existingLabel = [existing.equipment, existing.productCode].filter(Boolean).join(' · ') || 'существующей номенклатуры';
      const confirmed = window.confirm(`Код номенклатуры "${productCode}" уже используется: ${existingLabel}.\n\nСохранить этот техпроцесс как новую версию существующей номенклатуры?`);
      if (!confirmed) {
        setSaving(false);
        setMessage('Сохранение отменено: код номенклатуры уже используется.');
        return;
      }
      ({ res, json } = await savePayload(true));
    }
    setSaving(false);
    if (!res.ok) return setMessage(apiErrorMessage(json, 'Не удалось сохранить техпроцесс'));
    setSavedSnapshot(JSON.stringify(draftPayload));
    setHistory([]);
    setVersionComment('');
    setMessage(activate ? 'Техпроцесс сохранен и сделан активным' : 'Черновик версии сохранен');
    onSaved(json);
  }
  return <div className="blueprint-builder">
    {message && <div className={message.includes('сохранен') ? 'success-note' : 'alert'}>{message}</div>}
    {dirty && <div className="draft-note">Есть несохраненный черновик. Изменения попадут в базу только после кнопки «Сохранить техпроцесс».</div>}
    <BlueprintValidationPanel issues={validationIssues} onJump={(code)=>setSelectedCode(code)} />
    <BlueprintBuilderActions canUndo={Boolean(history.length)} dirty={dirty} hasErrors={Boolean(validationErrors.length)} saving={saving} versionMode={Boolean(versionEndpoint)} editMode={versionMethod === 'PATCH'} canActivateVersion={process.versionStatus !== 'active'} onAdd={()=>addStep()} onUndo={undo} onSaveDraft={()=>save(false)} onSaveActive={()=>save(true)} />
    <BlueprintRequisites equipment={equipment} productCode={productCode} category={category} notes={notes} onEquipment={setEquipment} onProductCode={setProductCode} onCategory={setCategory} onNotes={setNotes} />
    <label className="version-comment-field"><span>Комментарий к версии</span><input name="blueprint-version-comment" value={versionComment} onChange={event=>setVersionComment(event.target.value)} placeholder="Что изменилось в техпроцессе" /></label>
    <div className="blueprint-layout">
      <BlueprintOperationList steps={steps} filteredSteps={filteredSteps} selectedCode={selected?.operationId || ''} query={builderQuery} levelGroups={levelGroups} issueMap={issueMap} onQuery={setBuilderQuery} onSelect={setSelectedCode} onOpenGraph={()=>setGraphOpen(true)} />
      <BlueprintStepEditor selected={selected} steps={steps} operationOptions={operationOptions} sectionOptions={sectionOptions} issueMap={issueMap} selectedOperationInReference={selectedOperationInReference} selectedSectionInReference={selectedSectionInReference} onRemove={removeStep} onApplyOperationRef={applyOperationRef} onUpdate={updateStep} onToggleLink={toggleLink} />
    </div>
    {graphOpen && createPortal(<BlueprintGraphWindow steps={steps} selectedCode={selected?.operationId || ''} linkFrom={linkFrom} sectionOptions={sectionOptions} operationOptions={operationOptions} validationIssues={validationIssues} onClose={()=>{ setGraphOpen(false); setLinkFrom(''); }} onSelect={setSelectedCode} onNodeClick={clickGraphNode} onStartLink={(code)=>setLinkFrom(linkFrom === code ? '' : code)} onToggleLink={toggleLink} onMove={moveStep} onBeginEdit={remember} onEditStep={commitStepEdit} onReflow={reflowRight} onRemove={removeStep} onClearLinks={clearStepLinks} onDuplicate={duplicateStep} onAdd={addStep} onUndo={undo} canUndo={Boolean(history.length)} dirty={dirty} />, document.body)}
  </div>;
}

function BlueprintRequisites({ equipment, productCode, category, notes, onEquipment, onProductCode, onCategory, onNotes }: { equipment: string; productCode: string; category: string; notes: string; onEquipment: (value: string) => void; onProductCode: (value: string) => void; onCategory: (value: string) => void; onNotes: (value: string) => void }) {
  return <div className="blueprint-requisites">
    <input name="blueprint-equipment" aria-label="Наименование номенклатуры" value={equipment} onChange={e=>onEquipment(e.target.value)} placeholder="Наименование номенклатуры" />
    <input name="blueprint-product-code" aria-label="Код номенклатуры" value={productCode} onChange={e=>onProductCode(e.target.value)} placeholder="Код номенклатуры" />
    <input name="blueprint-category" aria-label="Категория" value={category} onChange={e=>onCategory(e.target.value)} placeholder="Категория" />
    <textarea name="blueprint-notes" aria-label="Примечания" value={notes} onChange={e=>onNotes(e.target.value)} placeholder="Примечания" />
  </div>;
}

function BlueprintOperationList({ steps, filteredSteps, selectedCode, query, levelGroups, issueMap, onQuery, onSelect, onOpenGraph }: { steps: BlueprintStepDraft[]; filteredSteps: BlueprintStepDraft[]; selectedCode: string; query: string; levelGroups: Array<[number, BlueprintStepDraft[]]>; issueMap: Map<string, BlueprintValidationIssue['type']>; onQuery: (value: string) => void; onSelect: (code: string) => void; onOpenGraph: () => void }) {
  const totalHours = steps.reduce((sum, step) => sum + Number(step.normHours || 0), 0);
  return <section className="blueprint-list">
    <div className="card-head"><div><h3>Операции техпроцесса</h3><p className="small">{steps.length} операций | {hours(totalHours)}</p></div><button onClick={onOpenGraph}>Открыть граф</button></div>
    <div className="blueprint-list-tools"><input name="blueprint-builder-search" aria-label="Поиск операций техпроцесса" value={query} onChange={e=>onQuery(e.target.value)} placeholder="Поиск: Op.ID, название, участок" /><button className="light-btn" onClick={()=>onQuery('')}>Сброс</button></div>
    <div className="blueprint-level-map">{levelGroups.map(([level, group]) => <button key={level} className={group.some(step => step.operationId === selectedCode) ? '' : 'light-btn'} onClick={()=>onSelect(group[0].operationId)}>Ур. {level}<span>{group.length}</span></button>)}</div>
    {filteredSteps.length ? filteredSteps.map(step => {
      const issue = issueMap.get(step.operationId);
      return <button key={step.operationId} className={`blueprint-list-row ${selectedCode === step.operationId ? 'active' : ''} ${issue ? `has-${issue}` : ''}`} onClick={()=>onSelect(step.operationId)}><b>{step.operationId}</b><span>{step.name}</span><small>{step.section} | пред: {step.previousOperationCodes.join(', ') || 'старт'} | след: {step.nextOperationCodes.join(', ') || 'нет'}</small></button>;
    }) : <Empty text="Операции по фильтру не найдены" />}
  </section>;
}

function BlueprintStepEditor({ selected, steps, operationOptions, sectionOptions, issueMap, selectedOperationInReference, selectedSectionInReference, onRemove, onApplyOperationRef, onUpdate, onToggleLink }: { selected?: BlueprintStepDraft; steps: BlueprintStepDraft[]; operationOptions: ReferenceOperationRef[]; sectionOptions: string[]; issueMap: Map<string, BlueprintValidationIssue['type']>; selectedOperationInReference: boolean; selectedSectionInReference: boolean; onRemove: (code: string) => void; onApplyOperationRef: (oldCode: string, nextCode: string) => void; onUpdate: (code: string, patch: Partial<BlueprintStepDraft>) => void; onToggleLink: (from: string, to: string) => void }) {
  if (!selected) return <aside className="blueprint-editor"><Empty text="Выберите операцию" /></aside>;
  const issue = issueMap.get(selected.operationId);
  return <aside className={`blueprint-editor ${issue ? `has-${issue}` : ''}`}>
    <div className="card-head"><h3>Операция</h3><button className="danger-btn" disabled={steps.length <= 1} onClick={()=>onRemove(selected.operationId)}>Удалить</button></div>
    {issue && <div className={`blueprint-editor-issue ${issue === 'error' ? 'has-error' : 'has-warning'}`}>{issue === 'error' ? 'В операции есть ошибка валидации' : 'В операции есть предупреждение валидации'}</div>}
    <label><span>ID</span><select name="blueprint-step-operation-id" value={selected.operationId} onChange={e=>onApplyOperationRef(selected.operationId, e.target.value)}>{!selectedOperationInReference && <option value={selected.operationId}>{selected.operationId} - {selected.name}</option>}{operationOptions.map(op=><option key={op.operationCode} value={op.operationCode}>{op.operationCode} - {op.name}</option>)}</select></label>
    <label><span>{'\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435'}</span><input name="blueprint-step-name" value={selected.name} onChange={e=>onUpdate(selected.operationId, { name: e.target.value })} /></label>
    <label><span>{'\u0423\u0447\u0430\u0441\u0442\u043e\u043a'}</span><select name="blueprint-step-section" value={selected.section} onChange={e=>onUpdate(selected.operationId, { section: e.target.value })}>{!selectedSectionInReference && selected.section && <option value={selected.section}>{selected.section}</option>}{sectionOptions.map(section=><option key={section} value={section}>{section}</option>)}</select></label>
    <label><span>Деталь / узел</span><input name="blueprint-step-part" value={selected.partOrAssembly} onChange={e=>onUpdate(selected.operationId, { partOrAssembly: e.target.value })} /></label>
    <div className="blueprint-two"><label><span>Уровень</span><input name="blueprint-step-level" type="number" min="1" value={selected.level} onChange={e=>onUpdate(selected.operationId, { level: Math.max(1, Number(e.target.value) || 1) })} /></label><label><span>Норма, ч</span><input name="blueprint-step-norm-hours" type="number" min="0" step="0.1" value={selected.normHours} onChange={e=>onUpdate(selected.operationId, { normHours: Math.max(0, Number(e.target.value) || 0) })} /></label></div>
    <label className="check-row blueprint-check"><input name="blueprint-step-group-capable" type="checkbox" checked={Boolean(selected.groupCapable)} onChange={e=>onUpdate(selected.operationId, { groupCapable: e.target.checked })} />Групповая операция</label>
    <p className="small">Для лазера, зачистки и пробивного станка можно выбрать несколько единиц в терминале и выполнить групповое действие.</p>
    <div className="blueprint-links"><h4>Связи</h4>{steps.filter(step => step.operationId !== selected.operationId).map(step => <button key={step.operationId} className={selected.nextOperationCodes.includes(step.operationId) ? '' : 'light-btn'} onClick={()=>onToggleLink(selected.operationId, step.operationId)}>{selected.nextOperationCodes.includes(step.operationId) ? '-> ' : '+ '}{step.operationId}</button>)}</div>
  </aside>;
}

function BlueprintBuilderActions({ canUndo, dirty, hasErrors, saving, versionMode, editMode, canActivateVersion, onAdd, onUndo, onSaveDraft, onSaveActive }: { canUndo: boolean; dirty: boolean; hasErrors: boolean; saving: boolean; versionMode?: boolean; editMode?: boolean; canActivateVersion?: boolean; onAdd: () => void; onUndo: () => void; onSaveDraft: () => void; onSaveActive: () => void }) {
  return <div className="blueprint-actions"><button onClick={onAdd}>Добавить операцию</button><button className="light-btn" disabled={!canUndo} onClick={onUndo}>Отменить Ctrl+Z</button>{versionMode && <button className="light-btn" disabled={saving || !dirty || hasErrors} onClick={onSaveDraft}>{saving ? 'Сохранение...' : editMode ? 'Сохранить изменения' : 'Сохранить черновик версии'}</button>}{(!editMode || canActivateVersion) && <button className="done-action" disabled={saving || !dirty || hasErrors} onClick={onSaveActive}>{saving ? 'Сохранение...' : versionMode ? 'Сохранить и сделать активной' : 'Сохранить техпроцесс'}</button>}</div>;
}

function BlueprintValidationPanel({ issues, onJump }: { issues: BlueprintValidationIssue[]; onJump: (code: string) => void }) {
  if (!issues.length) return <div className="blueprint-validation ok"><b>Проверка техпроцесса</b><span>Ошибок связей и обязательных полей не найдено.</span></div>;
  const errors = issues.filter(issue => issue.type === 'error').length;
  const warnings = issues.length - errors;
  return <div className={`blueprint-validation ${errors ? 'has-errors' : 'has-warnings'}`}><div><b>Проверка техпроцесса</b><span>{errors ? `${errors} ошибок` : 'Ошибок нет'}{warnings ? `, ${warnings} предупреждений` : ''}</span></div><div className="blueprint-validation-list">{issues.slice(0, 6).map((issue, index) => <button key={`${issue.type}-${issue.code || 'global'}-${index}`} className={issue.type === 'error' ? 'danger-menu' : 'light-btn'} onClick={()=>issue.code && onJump(issue.code)} disabled={!issue.code}><strong>{issue.type === 'error' ? 'Ошибка' : 'Риск'}</strong>{issue.code ? ` ${issue.code}: ` : ' '}{issue.message}</button>)}{issues.length > 6 && <span>Еще {issues.length - 6}</span>}</div></div>;
}

function BlueprintGraphWindow({ steps, selectedCode, linkFrom, sectionOptions, operationOptions, validationIssues, onClose, onSelect, onNodeClick, onStartLink, onToggleLink, onMove, onBeginEdit, onEditStep, onReflow, onRemove, onClearLinks, onDuplicate, onAdd, onUndo, canUndo, dirty }: BlueprintGraphWindowProps) {
  const [zoom, setZoom] = useState(0.85);
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [contextMenu, setContextMenu] = useState<BlueprintContextMenu | null>(null);
  const [editForm, setEditForm] = useState<BlueprintEditForm | null>(null);
  const [editError, setEditError] = useState('');
  const [graphQuery, setGraphQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ code: string; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const nodeWidth = 220;
  const nodeHeight = 132;
  const padding = 56;
  const positions = new Map(steps.map((step, index) => [step.operationId, { x: step.x ?? (padding + Math.max(0, (step.level || 1) - 1) * 260), y: step.y ?? (padding + index * 154) }]));
  const selected = steps.find(step => step.operationId === selectedCode);
  const graphLevelGroups = useMemo(() => Array.from(steps.reduce((map, step) => {
    const level = Math.max(1, Number(step.level || 1));
    const list = map.get(level) || [];
    list.push(step);
    map.set(level, list);
    return map;
  }, new Map<number, BlueprintStepDraft[]>())).sort(([a], [b]) => a - b), [steps]);
  const graphMatches = useMemo(() => {
    const query = graphQuery.trim().toLowerCase();
    if (!query) return [];
    return steps.filter(step => `${step.operationId} ${step.name} ${step.section} ${step.partOrAssembly}`.toLowerCase().includes(query)).slice(0, 12);
  }, [graphQuery, steps]);
  const graphValidationErrors = validationIssues.filter(issue => issue.type === 'error');
  const issueMap = useMemo(() => blueprintIssueMap(validationIssues), [validationIssues]);
  const relatedCodes = new Set<string>();
  if (selected) {
    relatedCodes.add(selected.operationId);
    selected.previousOperationCodes.forEach(code => relatedCodes.add(code));
    selected.nextOperationCodes.forEach(code => relatedCodes.add(code));
    steps.forEach(step => {
      if (step.previousOperationCodes.includes(selected.operationId) || step.nextOperationCodes.includes(selected.operationId)) relatedCodes.add(step.operationId);
    });
  }
  const dimUnrelated = linkedOnly && Boolean(selected);
  const isRelated = (code: string) => !dimUnrelated || relatedCodes.has(code);
  const edges = steps.flatMap(step => step.nextOperationCodes.map(to => ({ from: step.operationId, to })).filter(edge => positions.has(edge.to)));
  const maxX = Math.max(...steps.map(step => (positions.get(step.operationId)?.x || 0) + nodeWidth), 760);
  const maxY = Math.max(...steps.map(step => (positions.get(step.operationId)?.y || 0) + nodeHeight), 480);
  const width = maxX + padding;
  const height = maxY + padding;
  const setBoundedZoom = (value: number) => setZoom(Math.min(1.8, Math.max(0.35, Number(value.toFixed(2)))));
  const fitZoom = () => setBoundedZoom(Math.min(1, (window.innerWidth - 48) / Math.max(width, 1), (window.innerHeight - 116) / Math.max(height, 1)));
  const scrollToCode = (code: string) => {
    const pos = positions.get(code);
    const scroll = scrollRef.current;
    if (!pos || !scroll) return;
    onSelect(code);
    requestAnimationFrame(() => {
      scroll.scrollTo({ left: Math.max(0, pos.x * zoom - scroll.clientWidth / 2 + nodeWidth * zoom / 2), top: Math.max(0, pos.y * zoom - scroll.clientHeight / 2 + nodeHeight * zoom / 2), behavior: 'smooth' });
    });
  };
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
        setEditForm(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const menuPoint = (clientX: number, clientY: number, widthHint = 260, heightHint = 310) => {
    const gap = 10;
    return {
      x: Math.max(gap, Math.min(window.innerWidth - widthHint - gap, clientX + gap)),
      y: Math.max(gap, Math.min(window.innerHeight - heightHint - gap, clientY + gap)),
    };
  };
  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const scroll = scrollRef.current;
    if (!scroll) return { canvasX: padding, canvasY: padding };
    const rect = scroll.getBoundingClientRect();
    return {
      canvasX: Math.max(12, (event.clientX - rect.left + scroll.scrollLeft) / zoom),
      canvasY: Math.max(12, (event.clientY - rect.top + scroll.scrollTop) / zoom),
    };
  };
  const openEditor = (step: BlueprintStepDraft) => {
    onSelect(step.operationId);
    setContextMenu(null);
    setEditError('');
    setEditForm({
      originalCode: step.operationId,
      operationId: step.operationId,
      name: step.name,
      section: step.section,
      partOrAssembly: step.partOrAssembly,
      level: String(step.level || 1),
      normHours: String(step.normHours ?? 0),
      groupCapable: Boolean(step.groupCapable),
    });
  };
  const applyReferenceToEditor = (operationCode: string) => {
    const ref = operationOptions.find(item => item.operationCode === operationCode);
    setEditError('');
    setEditForm(form => {
      if (!form) return form;
      const name = ref?.name || form.name;
      const section = ref?.defaultSection || form.section;
      return {
        ...form,
        operationId: operationCode,
        name,
        section,
        partOrAssembly: ref?.partOrAssembly || form.partOrAssembly,
        normHours: String(ref?.defaultNormHours ?? form.normHours),
        groupCapable: Boolean(form.groupCapable || isGroupCapableText(`${name} ${section}`)),
      };
    });
  };
  const submitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editForm) return;
    const clean = editForm.operationId.trim().toUpperCase();
    if (!clean) return setEditError('Укажите ID операции');
    if (steps.some(step => step.operationId === clean && step.operationId !== editForm.originalCode)) return setEditError(`Операция ${clean} уже есть в техпроцессе`);
    const ok = onEditStep(editForm.originalCode, {
      operationId: clean,
      name: editForm.name,
      section: editForm.section,
      partOrAssembly: editForm.partOrAssembly,
      level: Math.max(1, Number(editForm.level) || 1),
      normHours: Math.max(0, Number(editForm.normHours) || 0),
      groupCapable: editForm.groupCapable,
    });
    if (ok) setEditForm(null);
  };
  const wheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.cancelable) event.preventDefault();
    const scroll = scrollRef.current;
    const next = Math.min(1.8, Math.max(0.35, Number((zoom + (event.deltaY > 0 ? -0.08 : 0.08)).toFixed(2))));
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
  const pathFor = (from: string, to: string) => {
    const a = positions.get(from);
    const b = positions.get(to);
    if (!a || !b) return '';
    const sx = a.x + nodeWidth;
    const sy = a.y + nodeHeight / 2;
    const tx = b.x;
    const ty = b.y + nodeHeight / 2;
    const mid = sx + Math.max(36, (tx - sx) / 2);
    return `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`;
  };
  const beginDrag = (event: React.PointerEvent<HTMLElement>, step: BlueprintStepDraft) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const pos = positions.get(step.operationId)!;
    dragRef.current = { code: step.operationId, startX: event.clientX, startY: event.clientY, x: pos.x, y: pos.y, moved: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    onBeginEdit();
  };
  const drag = (event: React.PointerEvent<HTMLElement>) => {
    const dragState = dragRef.current;
    if (!dragState) return;
    const dx = (event.clientX - dragState.startX) / zoom;
    const dy = (event.clientY - dragState.startY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragState.moved = true;
    onMove(dragState.code, dragState.x + dx, dragState.y + dy);
  };
  const endDrag = () => { window.setTimeout(() => { dragRef.current = null; }, 0); };
  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button === 0) setContextMenu(null);
    if (event.button !== 0 || (event.target as HTMLElement).closest('.blueprint-graph-node')) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    panRef.current = { startX: event.clientX, startY: event.clientY, scrollLeft: scroll.scrollLeft, scrollTop: scroll.scrollTop };
    scroll.setPointerCapture(event.pointerId);
  };
  const pan = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = panRef.current;
    const scroll = scrollRef.current;
    if (!state || !scroll) return;
    scroll.scrollLeft = state.scrollLeft - (event.clientX - state.startX);
    scroll.scrollTop = state.scrollTop - (event.clientY - state.startY);
  };
  const endPan = () => { panRef.current = null; };
  const openCanvasMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.blueprint-graph-node')) return;
    event.preventDefault();
    setContextMenu({ kind: 'canvas', ...menuPoint(event.clientX, event.clientY, 250, 180), ...canvasPoint(event) });
  };
  const openNodeMenu = (event: React.MouseEvent<HTMLElement>, step: BlueprintStepDraft) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(step.operationId);
    setContextMenu({ kind: 'node', code: step.operationId, ...menuPoint(event.clientX, event.clientY), ...canvasPoint(event) });
  };
  const openNodeMenuFromButton = (event: React.MouseEvent<HTMLButtonElement>, step: BlueprintStepDraft) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const pos = positions.get(step.operationId) || { x: padding, y: padding };
    const point = menuPoint(rect.right, rect.top, 260, 310);
    onSelect(step.operationId);
    setContextMenu({ kind: 'node', code: step.operationId, ...point, canvasX: pos.x, canvasY: pos.y });
  };
  const unlinkedTargets = selected ? steps.filter(step => step.operationId !== selected.operationId && !selected.nextOperationCodes.includes(step.operationId) && !selected.previousOperationCodes.includes(step.operationId)) : [];
  const menuStep = contextMenu?.kind === 'node' ? steps.find(step => step.operationId === contextMenu.code) : null;
  const editOperationInReference = editForm ? operationOptions.some(item => item.operationCode === editForm.operationId) : false;
  const editSectionInReference = editForm ? sectionOptions.includes(editForm.section) : false;
  return <div className="blueprint-window" onClick={()=>setContextMenu(null)}>
    <div className="blueprint-window-toolbar">
      <div><b>Blueprint техпроцесса</b><span>{dirty ? 'Черновик не сохранен. Перетаскивайте блоки, соединяйте стрелками и используйте правый клик для быстрых действий.' : 'Сохраненная версия. Блоки можно перетаскивать, редактировать через меню и фильтровать по связям.'}</span></div>
      <div className="blueprint-window-actions"><button onClick={()=>setBoundedZoom(zoom - 0.1)}>-</button><button onClick={()=>setBoundedZoom(1)}>{Math.round(zoom * 100)}%</button><button onClick={()=>setBoundedZoom(zoom + 0.1)}>+</button><button onClick={fitZoom}>Вписать</button><button onClick={onReflow}>Выровнять вправо</button><button className={linkedOnly ? 'light-btn' : ''} aria-pressed={linkedOnly} disabled={!selected} onClick={()=>setLinkedOnly(value => !value)}>Связи выделенной</button><button className="light-btn" disabled={!canUndo} onClick={onUndo}>Ctrl+Z</button><button onClick={()=>onAdd()}>Добавить операцию</button><button className="danger-btn" onClick={onClose}>Закрыть</button></div>
    </div>
    {validationIssues.length > 0 && <div className={`blueprint-window-validation ${graphValidationErrors.length ? 'has-errors' : 'has-warnings'}`}><b>{graphValidationErrors.length ? `Ошибки: ${graphValidationErrors.length}` : 'Ошибок нет'}</b>{validationIssues.slice(0, 5).map((issue, index) => <button key={`${issue.type}-${issue.code || 'global'}-${index}`} disabled={!issue.code} onClick={()=>issue.code && scrollToCode(issue.code)}>{issue.type === 'error' ? 'Ошибка' : 'Риск'}{issue.code ? ` ${issue.code}` : ''}: {issue.message}</button>)}</div>}
    <div className="blueprint-window-nav"><input name="blueprint-graph-search" aria-label="Поиск операций на графе" value={graphQuery} onChange={event=>setGraphQuery(event.target.value)} placeholder="Поиск: Op.ID, название, участок" />{graphMatches.map(step => <button key={step.operationId} onClick={()=>scrollToCode(step.operationId)}>{step.operationId}</button>)}{graphQuery && !graphMatches.length && <span>Ничего не найдено</span>}<div className="blueprint-mini-levels">{graphLevelGroups.map(([level, group]) => <button key={level} className={group.some(step => step.operationId === selectedCode) ? '' : 'light-btn'} onClick={()=>scrollToCode(group[0].operationId)}>Ур. {level}<span>{group.length}</span></button>)}</div></div>
    {linkedOnly && selected && <div className="blueprint-filter-bar"><b>Фильтр: {selected.operationId}</b><span>Связанные операции подсвечены, остальные оставлены в контексте и приглушены.</span>{unlinkedTargets.slice(0, 18).map(step => <button key={step.operationId} onClick={()=>onToggleLink(selected.operationId, step.operationId)}>+ {step.operationId}</button>)}</div>}
    <div className="blueprint-window-body">
    <div ref={scrollRef} className="blueprint-graph-scroll" onWheel={wheelZoom} onContextMenu={openCanvasMenu} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan}>
      <div className="blueprint-graph-stage" style={{ width: width * zoom, height: height * zoom }}>
        <div className="blueprint-graph-scaled" style={{ width, height, transform: `scale(${zoom})` }}>
          <svg className="blueprint-edges" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs><marker id="blueprint-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
            {edges.map(edge => { const related = isRelated(edge.from) && isRelated(edge.to); return <path key={`${edge.from}-${edge.to}`} className={dimUnrelated ? (related ? 'highlighted' : 'muted') : ''} d={pathFor(edge.from, edge.to)} markerEnd="url(#blueprint-arrow)" />; })}
          </svg>
          {steps.map(step => {
            const pos = positions.get(step.operationId)!;
            const related = isRelated(step.operationId);
            const issue = issueMap.get(step.operationId);
            return <article key={step.operationId} className={`blueprint-graph-node ${selectedCode === step.operationId ? 'active' : ''} ${linkFrom === step.operationId ? 'linking' : ''} ${dimUnrelated ? (related ? 'highlighted' : 'muted') : ''} ${issue ? `has-${issue}` : ''}`} style={{ left: pos.x, top: pos.y }} onContextMenu={(event)=>openNodeMenu(event, step)} onPointerDown={(event)=>beginDrag(event, step)} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={()=>{ if (dragRef.current?.moved) return; onNodeClick(step.operationId); }}>
              <div><b>{step.operationId}</b><span className="blueprint-node-tools"><button title="Действия" onClick={(event)=>openNodeMenuFromButton(event, step)}>...</button><button title="Создать связь" onClick={(event)=>{ event.stopPropagation(); onStartLink(step.operationId); }}>{'->'}</button><button title="Удалить операцию" className="danger-btn" disabled={steps.length <= 1} onClick={(event)=>{ event.stopPropagation(); onRemove(step.operationId); }}>x</button></span></div>
              <h3>{step.name}</h3><p>{step.section} | {hours(step.normHours)}</p><p>{step.partOrAssembly}</p><small>&lt;- {step.previousOperationCodes.join(', ') || 'старт'}</small><small>-&gt; {step.nextOperationCodes.join(', ') || 'нет'}</small>
            </article>;
          })}
        </div>
      </div>
    </div>
    <aside className="blueprint-inspector">{selected ? <><span>Выбранный блок</span><h3>{selected.operationId}</h3><b>{selected.name}</b><p>{selected.section} | {selected.partOrAssembly}</p><div className="blueprint-inspector-grid"><div><span>Уровень</span><strong>{selected.level || 1}</strong></div><div><span>Норма</span><strong>{hours(selected.normHours)}</strong></div><div><span>Входы</span><strong>{selected.previousOperationCodes.length}</strong></div><div><span>Выходы</span><strong>{selected.nextOperationCodes.length}</strong></div></div><div className="blueprint-inspector-links"><span>Предыдущие</span><p>{selected.previousOperationCodes.join(', ') || 'старт'}</p><span>Следующие</span><p>{selected.nextOperationCodes.join(', ') || 'нет'}</p></div><div className="blueprint-inspector-actions"><button onClick={()=>openEditor(selected)}>Редактировать</button><button className={linkFrom === selected.operationId ? '' : 'light-btn'} onClick={()=>onStartLink(selected.operationId)}>{linkFrom === selected.operationId ? 'Отменить связь' : 'Связать отсюда'}</button><button className="light-btn" onClick={()=>{ const pos = positions.get(selected.operationId); onDuplicate(selected.operationId, { x: (pos?.x ?? padding) + 36, y: (pos?.y ?? padding) + 36 }); }}>Дублировать</button><button className="danger-btn" disabled={steps.length <= 1} onClick={()=>onRemove(selected.operationId)}>Удалить</button></div></> : <Empty text="Выберите блок" />}</aside>
    </div>
    {contextMenu && <div className="blueprint-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={event=>event.stopPropagation()}>
      {contextMenu.kind === 'node' && menuStep ? <>
        <div className="blueprint-context-title">{menuStep.operationId}<span>{menuStep.name}</span></div>
        <button onClick={()=>openEditor(menuStep)}>Редактировать</button>
        <button onClick={()=>{ const pos = positions.get(menuStep.operationId); onAdd({ afterCode: menuStep.operationId, x: (pos?.x ?? contextMenu.canvasX) + 290, y: (pos?.y ?? contextMenu.canvasY) + 24 }); setContextMenu(null); }}>Добавить после</button>
        <button onClick={()=>{ const pos = positions.get(menuStep.operationId); onDuplicate(menuStep.operationId, { x: (pos?.x ?? contextMenu.canvasX) + 36, y: (pos?.y ?? contextMenu.canvasY) + 36 }); setContextMenu(null); }}>Дублировать рядом</button>
        <button onClick={()=>{ onStartLink(menuStep.operationId); setContextMenu(null); }}>{linkFrom === menuStep.operationId ? 'Отменить связь' : 'Связать отсюда'}</button>
        <button onClick={()=>{ onClearLinks(menuStep.operationId); setContextMenu(null); }}>Разорвать связи блока</button>
        <button className="danger-menu" disabled={steps.length <= 1} onClick={()=>{ onRemove(menuStep.operationId); setContextMenu(null); }}>Удалить блок</button>
      </> : <>
        <div className="blueprint-context-title">Поле графа<span>{Math.round(contextMenu.canvasX)}, {Math.round(contextMenu.canvasY)}</span></div>
        <button onClick={()=>{ onAdd({ x: contextMenu.canvasX, y: contextMenu.canvasY }); setContextMenu(null); }}>Добавить операцию здесь</button>
        <button onClick={()=>{ onReflow(); setContextMenu(null); }}>Выровнять вправо</button>
        <button disabled={!canUndo} onClick={()=>{ onUndo(); setContextMenu(null); }}>Отменить Ctrl+Z</button>
      </>}
    </div>}
    {editForm && <div className="blueprint-edit-backdrop" onClick={event=>event.stopPropagation()} onPointerDown={event=>{ if (event.target === event.currentTarget) setEditForm(null); }}>
      <form className="blueprint-edit-panel" onSubmit={submitEdit}>
        <div className="card-head"><div><h3>Редактирование блока</h3><p className="small">{editForm.originalCode}</p></div><button type="button" className="light-btn" onClick={()=>setEditForm(null)}>Закрыть</button></div>
        {editError && <div className="blueprint-edit-error">{editError}</div>}
        <label><span>ID / справочник</span><select name="blueprint-edit-operation-id" value={editForm.operationId} onChange={event=>applyReferenceToEditor(event.target.value)}>{!editOperationInReference && <option value={editForm.operationId}>{editForm.operationId} - {editForm.name}</option>}{operationOptions.map(op => <option key={op.operationCode} value={op.operationCode}>{op.operationCode} - {op.name}</option>)}</select></label>
        <label><span>Наименование</span><input name="blueprint-edit-name" value={editForm.name} onChange={event=>{ setEditError(''); setEditForm(form => form ? { ...form, name: event.target.value } : form); }} /></label>
        <label><span>Участок</span><select name="blueprint-edit-section" value={editForm.section} onChange={event=>setEditForm(form => form ? { ...form, section: event.target.value } : form)}>{!editSectionInReference && editForm.section && <option value={editForm.section}>{editForm.section}</option>}{sectionOptions.map(section => <option key={section} value={section}>{section}</option>)}</select></label>
        <label><span>Деталь / узел</span><input name="blueprint-edit-part" value={editForm.partOrAssembly} onChange={event=>setEditForm(form => form ? { ...form, partOrAssembly: event.target.value } : form)} /></label>
        <div className="blueprint-two"><label><span>Уровень</span><input name="blueprint-edit-level" type="number" min="1" value={editForm.level} onChange={event=>setEditForm(form => form ? { ...form, level: event.target.value } : form)} /></label><label><span>Норма, ч</span><input name="blueprint-edit-norm-hours" type="number" min="0" step="0.1" value={editForm.normHours} onChange={event=>setEditForm(form => form ? { ...form, normHours: event.target.value } : form)} /></label></div>
        <label className="check-row blueprint-check blueprint-edit-check"><input name="blueprint-edit-group-capable" type="checkbox" checked={editForm.groupCapable} onChange={event=>setEditForm(form => form ? { ...form, groupCapable: event.target.checked } : form)} />Групповая операция</label>
        <div className="blueprint-edit-actions"><button type="button" className="light-btn" onClick={()=>setEditForm(null)}>Отмена</button><button type="submit" className="done-action">Применить</button></div>
      </form>
    </div>}
  </div>;
}
