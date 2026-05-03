import type { InternalBcfIssue, InternalBcfSnapshot, InternalBcfViewpoint } from "../domain/model";

export function enrichViewpointFromCadView(viewpoint: InternalBcfViewpoint, cadview: unknown): { viewpoint: InternalBcfViewpoint; warnings: string[] } {
  const warnings: string[] = [];
  const camera = readCamera(cadview);
  const nativeViewState = storeNativeView(cadview);

  if (!camera) {
    warnings.push("Предупреждение: камера Topomatic недоступна для BCF viewpoint");
    return { viewpoint: { ...viewpoint, nativeViewState }, warnings };
  }

  return {
    viewpoint: {
      ...viewpoint,
      nativeViewState,
      perspectiveCamera: camera
    },
    warnings
  };
}

export function applyIssueViewToCadView(cadview: unknown, issue: InternalBcfIssue): { applied: boolean; warnings: string[] } {
  const viewpoint = issue.viewpoints[0];
  if (!viewpoint) {
    return { applied: false, warnings: ["Предупреждение: у замечания нет viewpoint"] };
  }

  if (restoreNativeView(cadview, viewpoint.nativeViewState)) {
    repaint(cadview);
    return { applied: true, warnings: [] };
  }

  const camera = viewpoint.perspectiveCamera ?? viewpoint.orthogonalCamera;
  if (!camera || !isRecord(cadview) || typeof cadview.lookAt !== "function") {
    return { applied: false, warnings: ["Предупреждение: Topomatic API не смог восстановить viewpoint"] };
  }

  if (typeof cadview.setCameraType === "function") {
    cadview.setCameraType("3d");
  }

  cadview.lookAt(
    toVec3(camera.cameraViewPoint),
    toVec3(camera.cameraDirection),
    toVec3(camera.cameraUpVector),
    true
  );
  selectIssueComponents(cadview, viewpoint);
  repaint(cadview);
  return { applied: true, warnings: [] };
}

export async function captureSnapshot(cadview: unknown): Promise<{ snapshot?: InternalBcfSnapshot; warnings: string[] }> {
  if (!isRecord(cadview)) {
    return { warnings: ["Предупреждение: нет snapshot"] };
  }

  const capture = cadview.captureSnapshot ?? cadview.takeSnapshot ?? cadview.snapshot;
  if (typeof capture !== "function") {
    return { warnings: ["Предупреждение: нет snapshot"] };
  }

  const result = await capture.call(cadview);
  if (result instanceof Blob) {
    const bytes = new Uint8Array(await result.arrayBuffer());
    return { snapshot: { filename: "snapshot.png", mimeType: "image/png", data: bytes }, warnings: [] };
  }

  if (result instanceof Uint8Array) {
    return { snapshot: { filename: "snapshot.png", mimeType: "image/png", data: result }, warnings: [] };
  }

  return { warnings: ["Предупреждение: нет snapshot"] };
}

function readCamera(cadview: unknown): InternalBcfViewpoint["perspectiveCamera"] | undefined {
  if (!isRecord(cadview) || !isRecord(cadview.camera)) {
    return undefined;
  }

  const camera = cadview.camera;
  const position = readPoint(camera.position ?? camera.eye ?? camera.cameraViewPoint);
  const direction = readPoint(camera.direction ?? camera.cameraDirection);
  const up = readPoint(camera.up ?? camera.cameraUpVector);

  if (!position || !direction || !up) {
    return undefined;
  }

  return {
    cameraViewPoint: position,
    cameraDirection: direction,
    cameraUpVector: up,
    fieldOfView: readNumber(camera.fieldOfView) ?? 60,
    aspectRatio: readNumber(camera.aspectRatio)
  };
}

function storeNativeView(cadview: unknown): unknown {
  if (!isRecord(cadview) || typeof cadview.storeView !== "function") {
    return undefined;
  }

  try {
    return cadview.storeView();
  } catch {
    return undefined;
  }
}

function restoreNativeView(cadview: unknown, state: unknown): boolean {
  if (!state || !isRecord(cadview) || typeof cadview.restoreView !== "function") {
    return false;
  }

  try {
    cadview.restoreView(state);
    return true;
  } catch {
    return false;
  }
}

function selectIssueComponents(cadview: unknown, viewpoint: InternalBcfViewpoint): void {
  if (!isRecord(cadview) || !isRecord(cadview.layer)) {
    return;
  }

  const layer = cadview.layer;
  if (typeof layer.clearSelected === "function") {
    layer.clearSelected();
  }

  if (typeof layer.selectableObjects !== "function" || typeof layer.selectObject !== "function") {
    return;
  }

  const refs = viewpoint.components.selection;
  if (refs.length === 0) {
    return;
  }

  const matches = (obj: unknown): boolean => {
    if (!isRecord(obj)) {
      return false;
    }
    return refs.some((ref) => {
      const ifcGuid = ref.ifcGuid?.toLocaleLowerCase("en-US");
      const authoringToolId = ref.authoringToolId?.toLocaleLowerCase("en-US");
      const candidates = [
        stringField(obj, "ifcGuid"),
        stringField(obj, "ifc_guid"),
        stringField(obj, "guid"),
        stringField(obj, "globalId"),
        stringField(obj, "GlobalId"),
        scalarField(obj, "id"),
        scalarField(obj, "Id")
      ].filter((value): value is string => value !== undefined).map((value) => value.toLocaleLowerCase("en-US"));
      return (ifcGuid !== undefined && candidates.includes(ifcGuid)) ||
        (authoringToolId !== undefined && candidates.includes(authoringToolId));
    });
  };

  try {
    for (const obj of layer.selectableObjects.call(layer)) {
      if (matches(obj)) {
        layer.selectObject(obj, true);
      }
    }
  } catch {
    return;
  }
}

function repaint(cadview: unknown): void {
  if (!isRecord(cadview)) {
    return;
  }
  if (typeof cadview.invalidate === "function") {
    cadview.invalidate();
  }
  if (typeof cadview.repaint === "function") {
    cadview.repaint();
  }
}

function toVec3(point: { x: number; y: number; z: number }): [number, number, number] {
  return [point.x, point.y, point.z];
}

function readPoint(value: unknown): { x: number; y: number; z: number } | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const x = readNumber(value.x);
  const y = readNumber(value.y);
  const z = readNumber(value.z);
  return x === undefined || y === undefined || z === undefined ? undefined : { x, y, z };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
