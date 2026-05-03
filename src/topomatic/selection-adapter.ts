import type { InternalBcfComponentRef } from "../domain/model";

export function readSelectedComponents(cadview: unknown): { components: InternalBcfComponentRef[]; warnings: string[] } {
  const warnings: string[] = [];
  const selected = readUnknownSelection(cadview);

  if (selected.length === 0) {
    warnings.push("Предупреждение: нет components");
  }

  if (selected.length > 1000) {
    warnings.push("Предупреждение: выбрано больше 1000 components");
  }

  return {
    components: selected.map(toComponentRef).filter((component): component is InternalBcfComponentRef => component !== undefined),
    warnings
  };
}

function readUnknownSelection(cadview: unknown): unknown[] {
  if (!isRecord(cadview)) {
    return [];
  }

  const layer = cadview.layer;
  if (isRecord(layer) && typeof layer.selectedObjects === "function") {
    try {
      return Array.from(layer.selectedObjects.call(layer));
    } catch {
      return [];
    }
  }

  const candidates = [cadview.selection, cadview.selectedObjects, cadview.selected, cadview.objects];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function toComponentRef(value: unknown): InternalBcfComponentRef | undefined {
  if (typeof value === "string") {
    return { ifcGuid: value };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const ifcGuid = stringField(value, "ifcGuid") ?? stringField(value, "ifc_guid") ?? stringField(value, "guid") ?? stringField(value, "globalId") ?? stringField(value, "GlobalId");
  const originatingSystem = stringField(value, "originatingSystem") ?? stringField(value, "originating_system");
  const authoringToolId = stringField(value, "authoringToolId") ?? stringField(value, "authoring_tool_id") ?? scalarField(value, "id") ?? scalarField(value, "Id");

  if (!ifcGuid && !authoringToolId) {
    return undefined;
  }

  return { ifcGuid, originatingSystem, authoringToolId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: Record<string, unknown>, field: string): string | undefined {
  return typeof value[field] === "string" ? value[field] : undefined;
}

function scalarField(value: Record<string, unknown>, field: string): string | undefined {
  const candidate = value[field];
  if (typeof candidate === "string" || typeof candidate === "number") {
    return String(candidate);
  }
  return undefined;
}
