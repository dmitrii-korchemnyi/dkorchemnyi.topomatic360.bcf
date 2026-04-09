import JSZip from "jszip";
import { convert, create } from "xmlbuilder2";
import { BcfImportExport } from "../domain/contracts";
import {
  BcfVersion,
  CommentItem,
  ComponentRef,
  IssueProject,
  IssueTopic,
  ValidationMessage,
  ValidationResult,
  Viewpoint
} from "../domain/model";
import { newGuid } from "../utils/ids";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(node: any, fallback = ""): string {
  if (node == null) return fallback;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    if ("#" in node) return String(node["#"] ?? fallback);
    if ("$" in node) return String(node["$"] ?? fallback);
  }
  return fallback;
}

function attr(node: any, name: string): string | undefined {
  return node?.[`@${name}`] ?? node?.[name] ?? undefined;
}

function detectIssueStatus(value?: string): IssueTopic["status"] {
  switch ((value ?? "").toLowerCase()) {
    case "active":
    case "open": return "Активно";
    case "resolved": return "Устранено";
    case "closed": return "Закрыто";
    case "reopened": return "Переоткрыто";
    case "in progress":
    case "inprogress": return "В работе";
    default: return "Новая";
  }
}

function detectIssuePriority(value?: string): IssueTopic["priority"] {
  switch ((value ?? "").toLowerCase()) {
    case "low": return "Низкий";
    case "high": return "Высокий";
    case "critical": return "Критический";
    default: return "Обычный";
  }
}

function detectIssueType(value?: string): IssueTopic["type"] {
  switch ((value ?? "").toLowerCase()) {
    case "clash": return "Коллизия";
    case "request":
    case "question": return "Вопрос";
    case "validation":
    case "check": return "Проверка";
    case "proposal": return "Предложение";
    default: return "Замечание";
  }
}

function toBcfStatus(value: IssueTopic["status"]): string {
  switch (value) {
    case "Активно": return "Open";
    case "В работе": return "InProgress";
    case "Устранено": return "Resolved";
    case "Закрыто": return "Closed";
    case "Переоткрыто": return "Reopened";
    default: return "Open";
  }
}

function toBcfPriority(value: IssueTopic["priority"]): string {
  switch (value) {
    case "Низкий": return "Low";
    case "Высокий": return "High";
    case "Критический": return "Critical";
    default: return "Normal";
  }
}

function toBcfType(value: IssueTopic["type"]): string {
  switch (value) {
    case "Коллизия": return "Clash";
    case "Вопрос": return "Question";
    case "Проверка": return "Validation";
    case "Предложение": return "Proposal";
    default: return "Issue";
  }
}

function parseXml(xml: string): any {
  return convert(xml, { format: "object" });
}

function readVersionXml(xml: string): BcfVersion {
  const doc = parseXml(xml);
  const candidate = attr(doc?.Version, "VersionId") ?? textOf(doc?.VersionId) ?? textOf(doc?.Version?.VersionId);
  if (candidate === "2.0" || candidate === "2.1" || candidate === "3.0") return candidate;
  if (String(candidate).startsWith("2.0")) return "2.0";
  if (String(candidate).startsWith("2.1")) return "2.1";
  if (String(candidate).startsWith("3.0")) return "3.0";
  return "2.1";
}

function parseComponents(viz: any): ComponentRef[] {
  const componentRoot = viz?.VisualizationInfo?.Components ?? viz?.Components ?? {};
  const componentNodes = asArray(componentRoot?.Component);
  const selected = new Set(asArray(componentRoot?.Selection?.Component).map((c: any) => attr(c, "IfcGuid") ?? attr(c, "Guid") ?? attr(c, "AuthoringToolId") ?? ""));
  const visible = componentRoot?.Visibility?.DefaultVisibility;
  const visibleComponents = new Set(asArray(componentRoot?.Visibility?.Exceptions?.Component).map((c: any) => attr(c, "IfcGuid") ?? attr(c, "Guid") ?? attr(c, "AuthoringToolId") ?? ""));

  const refs = componentNodes.map((node: any) => {
    const guid = attr(node, "IfcGuid") ?? attr(node, "Guid") ?? attr(node, "AuthoringToolId") ?? newGuid();
    return {
      guid,
      ifcGuid: attr(node, "IfcGuid"),
      authoringToolId: attr(node, "AuthoringToolId"),
      elementId: attr(node, "OriginatingSystem") ?? attr(node, "ComponentId"),
      visible: visible === "false" ? visibleComponents.has(guid) : true,
      selected: selected.has(guid)
    } satisfies ComponentRef;
  });
  return refs;
}

function parseCamera(viz: any): Viewpoint["camera"] | undefined {
  const cam = viz?.VisualizationInfo?.PerspectiveCamera ?? viz?.PerspectiveCamera;
  if (!cam) return undefined;
  const pos = cam.CameraViewPoint ?? {};
  const dir = cam.CameraDirection ?? {};
  const up = cam.CameraUpVector ?? {};
  return {
    position: { x: Number(pos.X ?? 0), y: Number(pos.Y ?? 0), z: Number(pos.Z ?? 0) },
    direction: { x: Number(dir.X ?? 0), y: Number(dir.Y ?? 0), z: Number(dir.Z ?? -1) },
    up: { x: Number(up.X ?? 0), y: Number(up.Y ?? 1), z: Number(up.Z ?? 0) },
    fieldOfView: Number(cam.FieldOfView ?? 60)
  };
}

function viewpointFilename(vp: Viewpoint): string {
  return `${vp.guid}.bcfv`;
}

function snapshotFilename(vp: Viewpoint): string | undefined {
  return vp.snapshotBase64 ? `${vp.guid}.png` : undefined;
}

export class BcfEngine implements BcfImportExport {
  async detectVersion(buffer: Uint8Array): Promise<BcfVersion> {
    const zip = await JSZip.loadAsync(buffer);
    const versionFile = zip.file("bcf.version");
    if (!versionFile) return "2.1";
    const xml = await versionFile.async("string");
    return readVersionXml(xml);
  }

  async read(buffer: Uint8Array): Promise<IssueProject> {
    const zip = await JSZip.loadAsync(buffer);
    const version = await this.detectVersion(buffer);

    let projectId = newGuid();
    let name = "Импортированный BCF проект";
    const projectFile = zip.file("project.bcfp");
    if (projectFile) {
      const xml = await projectFile.async("string");
      const doc = parseXml(xml);
      projectId = textOf(doc?.ProjectExtension?.Project?.ProjectId, projectId) || textOf(doc?.Project?.ProjectId, projectId);
      name = textOf(doc?.ProjectExtension?.Project?.Name, name) || textOf(doc?.Project?.Name, name);
    }

    const topicFolders = new Set<string>();
    for (const key of Object.keys(zip.files)) {
      const parts = key.split("/");
      if (parts.length > 1 && parts[0]) topicFolders.add(parts[0]);
    }

    const topics: IssueTopic[] = [];
    let number = 1;
    for (const folder of topicFolders) {
      const markupFile = zip.file(`${folder}/markup.bcf`);
      if (!markupFile) continue;
      const markupXml = await markupFile.async("string");
      const doc = parseXml(markupXml);
      const markup = doc?.Markup ?? {};
      const topicNode = markup?.Topic ?? {};
      const commentNodes = asArray(markup?.Comment);
      const viewpointNodes = asArray(markup?.Viewpoints?.ViewPoint ?? markup?.Viewpoint);

      const viewpoints: Viewpoint[] = [];
      for (let i = 0; i < viewpointNodes.length; i += 1) {
        const vpNode = viewpointNodes[i];
        const guid = attr(vpNode, "Guid") ?? textOf(vpNode, newGuid());
        const fileName = textOf(vpNode, `${guid}.bcfv`) || `${guid}.bcfv`;
        const vizFile = zip.file(`${folder}/${fileName}`);
        let camera: Viewpoint["camera"] | undefined;
        let components: ComponentRef[] = [];
        if (vizFile) {
          const vizXml = await vizFile.async("string");
          const viz = parseXml(vizXml);
          camera = parseCamera(viz);
          components = parseComponents(viz);
        }
        const pngName = [`${guid}.png`, `snapshot.png`].find((candidate) => !!zip.file(`${folder}/${candidate}`));
        let snapshotBase64: string | undefined;
        if (pngName) {
          const raw = await zip.file(`${folder}/${pngName}`)!.async("base64");
          snapshotBase64 = `data:image/png;base64,${raw}`;
        }
        viewpoints.push({
          guid,
          title: `Вид ${i + 1}`,
          index: i,
          snapshotFileName: pngName,
          snapshotBase64,
          camera,
          components
        });
      }

      const comments: CommentItem[] = commentNodes.map((node: any) => ({
        guid: attr(node, "Guid") ?? newGuid(),
        author: textOf(node?.Author, "unknown"),
        date: textOf(node?.Date, new Date().toISOString()),
        message: textOf(node?.Comment, ""),
        viewpointGuid: textOf(node?.Viewpoint),
        modifiedAuthor: textOf(node?.ModifiedAuthor, undefined as any),
        modifiedDate: textOf(node?.ModifiedDate, undefined as any)
      }));

      topics.push({
        guid: attr(topicNode, "Guid") ?? folder,
        number: number++,
        title: textOf(topicNode?.Title, "Без названия"),
        description: textOf(topicNode?.Description, ""),
        status: detectIssueStatus(textOf(topicNode?.TopicStatus, textOf(topicNode?.Status))),
        priority: detectIssuePriority(textOf(topicNode?.Priority)),
        type: detectIssueType(textOf(topicNode?.TopicType, textOf(topicNode?.Type))),
        labels: textOf(topicNode?.Labels, "").split(",").map((x) => x.trim()).filter(Boolean),
        assignedTo: textOf(topicNode?.AssignedTo, "" ) || undefined,
        area: textOf(topicNode?.TopicLabels?.Area, "") || undefined,
        milestone: textOf(topicNode?.TopicLabels?.Milestone, "") || undefined,
        deadline: textOf(topicNode?.DueDate, "") || undefined,
        creationAuthor: textOf(topicNode?.CreationAuthor, "unknown"),
        creationDate: textOf(topicNode?.CreationDate, new Date().toISOString()),
        modifiedAuthor: textOf(topicNode?.ModifiedAuthor, "") || undefined,
        modifiedDate: textOf(topicNode?.ModifiedDate, "") || undefined,
        comments,
        viewpoints
      });
    }

    return { projectId, name, topics, formatVersion: version };
  }

  validateProject(project: IssueProject, version: BcfVersion): ValidationResult {
    const messages: ValidationMessage[] = [];
    if (!project.name.trim()) messages.push({ level: "warning", message: "У проекта отсутствует имя." });
    for (const topic of project.topics) {
      if (!topic.guid) messages.push({ level: "error", message: `Замечание #${topic.number} без GUID.` });
      if (!topic.title.trim()) messages.push({ level: "error", message: `Замечание #${topic.number} без заголовка.` });
      for (const vp of topic.viewpoints) {
        if (!vp.guid) messages.push({ level: "error", message: `Viewpoint в замечании #${topic.number} без GUID.` });
        if (version === "2.0" && topic.labels.length > 0) {
          messages.push({ level: "warning", message: `BCF 2.0: labels для замечания #${topic.number} будут сохранены как расширенные данные в описании.` });
        }
      }
    }
    return { ok: !messages.some((m) => m.level === "error"), messages };
  }

  async write(project: IssueProject, version: BcfVersion): Promise<Uint8Array> {
    const validation = this.validateProject(project, version);
    if (!validation.ok) {
      throw new Error(validation.messages.filter((m) => m.level === "error").map((m) => m.message).join("\n"));
    }

    const zip = new JSZip();
    const versionXml = create({ version: "1.0", encoding: "UTF-8" })
      .ele("Version", { VersionId: version })
      .end({ prettyPrint: true });
    zip.file("bcf.version", versionXml);

    const projectXml = create({ version: "1.0", encoding: "UTF-8" })
      .ele("ProjectExtension")
        .ele("Project")
          .ele("Name").txt(project.name).up()
          .ele("ProjectId").txt(project.projectId).up()
        .up()
      .up()
      .end({ prettyPrint: true });
    zip.file("project.bcfp", projectXml);

    for (const topic of project.topics) {
      const folder = zip.folder(topic.guid)!;
      const root = create({ version: "1.0", encoding: "UTF-8" }).ele("Markup");
      const topicEl = root.ele("Topic", { Guid: topic.guid });
      topicEl.ele("Title").txt(topic.title).up();
      topicEl.ele("Description").txt(topic.description || "").up();
      topicEl.ele("CreationDate").txt(topic.creationDate).up();
      topicEl.ele("CreationAuthor").txt(topic.creationAuthor).up();
      topicEl.ele("ModifiedDate").txt(topic.modifiedDate ?? topic.creationDate).up();
      topicEl.ele("ModifiedAuthor").txt(topic.modifiedAuthor ?? topic.creationAuthor).up();
      topicEl.ele("TopicStatus").txt(toBcfStatus(topic.status)).up();
      topicEl.ele("TopicType").txt(toBcfType(topic.type)).up();
      topicEl.ele("Priority").txt(toBcfPriority(topic.priority)).up();
      if (topic.assignedTo) topicEl.ele("AssignedTo").txt(topic.assignedTo).up();
      if (topic.deadline) topicEl.ele("DueDate").txt(topic.deadline).up();
      if (topic.labels.length > 0 && version !== "2.0") topicEl.ele("Labels").txt(topic.labels.join(", ")).up();
      topicEl.up();

      for (const comment of topic.comments) {
        const commentEl = root.ele("Comment", { Guid: comment.guid });
        commentEl.ele("Date").txt(comment.date).up();
        commentEl.ele("Author").txt(comment.author).up();
        commentEl.ele("Comment").txt(comment.message).up();
        if (comment.viewpointGuid) commentEl.ele("Viewpoint").txt(viewpointFilename({ guid: comment.viewpointGuid, index: 0, components: [] })).up();
        if (comment.modifiedAuthor) commentEl.ele("ModifiedAuthor").txt(comment.modifiedAuthor).up();
        if (comment.modifiedDate) commentEl.ele("ModifiedDate").txt(comment.modifiedDate).up();
        commentEl.up();
      }

      const viewpointsEl = root.ele("Viewpoints");
      for (const vp of topic.viewpoints) {
        viewpointsEl.ele("ViewPoint", { Guid: vp.guid }).txt(viewpointFilename(vp)).up();
        folder.file(viewpointFilename(vp), this.buildVisualizationInfo(vp).end({ prettyPrint: true }));
        const pngName = snapshotFilename(vp);
        if (pngName && vp.snapshotBase64) {
          const base64 = vp.snapshotBase64.includes(",") ? vp.snapshotBase64.split(",")[1] : vp.snapshotBase64;
          folder.file(pngName, base64, { base64: true });
        }
      }
      viewpointsEl.up();

      folder.file("markup.bcf", root.end({ prettyPrint: true }));
    }

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }

  private buildVisualizationInfo(vp: Viewpoint) {
    const root = create({ version: "1.0", encoding: "UTF-8" }).ele("VisualizationInfo", { Guid: vp.guid });
    if (vp.camera) {
      const cam = root.ele("PerspectiveCamera");
      cam.ele("CameraViewPoint")
        .ele("X").txt(String(vp.camera.position.x)).up()
        .ele("Y").txt(String(vp.camera.position.y)).up()
        .ele("Z").txt(String(vp.camera.position.z)).up()
      .up();
      cam.ele("CameraDirection")
        .ele("X").txt(String(vp.camera.direction.x)).up()
        .ele("Y").txt(String(vp.camera.direction.y)).up()
        .ele("Z").txt(String(vp.camera.direction.z)).up()
      .up();
      cam.ele("CameraUpVector")
        .ele("X").txt(String(vp.camera.up.x)).up()
        .ele("Y").txt(String(vp.camera.up.y)).up()
        .ele("Z").txt(String(vp.camera.up.z)).up()
      .up();
      cam.ele("FieldOfView").txt(String(vp.camera.fieldOfView ?? 60)).up();
      cam.up();
    }
    const componentsEl = root.ele("Components");
    for (const component of vp.components) {
      componentsEl.ele("Component", {
        IfcGuid: component.ifcGuid ?? undefined,
        AuthoringToolId: component.authoringToolId ?? component.elementId ?? component.guid,
        OriginatingSystem: component.modelRef ?? undefined
      }).up();
    }
    const selectionEl = componentsEl.ele("Selection");
    for (const component of vp.components.filter((c) => c.selected)) {
      selectionEl.ele("Component", {
        IfcGuid: component.ifcGuid ?? undefined,
        AuthoringToolId: component.authoringToolId ?? component.elementId ?? component.guid
      }).up();
    }
    selectionEl.up();
    const visibilityEl = componentsEl.ele("Visibility");
    visibilityEl.ele("DefaultVisibility").txt("true").up();
    visibilityEl.up();
    componentsEl.up();
    return root;
  }
}
