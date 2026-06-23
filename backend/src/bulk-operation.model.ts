export function isGroupCapableText(text: string) {
  const normalized = text.trim().toLowerCase();
  return normalized.includes('лазер')
    || normalized.includes('зачист')
    || normalized.includes('пробив')
    || normalized.includes('координат');
}

export function isGroupCapableEntity(entity: { name?: unknown; section?: unknown; groupCapable?: unknown }) {
  if (entity.groupCapable === true) return true;
  return isGroupCapableText(`${entity.name || ''} ${entity.section || ''}`);
}

export function isBulkGroupAllowedProductionOperation(op: { operationId?: unknown; name?: unknown; section?: unknown }) {
  return isGroupCapableText(`${op.operationId || ''} ${op.name || ''} ${op.section || ''}`);
}
