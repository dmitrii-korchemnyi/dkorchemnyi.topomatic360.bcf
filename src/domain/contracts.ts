import { BcfVersion, IssueProject, IssueTopic, ValidationResult, Viewpoint } from "./model";

export interface TopicStore {
  load(): Promise<IssueProject>;
  save(project: IssueProject): Promise<void>;
  mutate(mutator: (project: IssueProject) => void): Promise<IssueProject>;
}

export interface BcfImportExport {
  detectVersion(buffer: Uint8Array): Promise<BcfVersion>;
  read(buffer: Uint8Array): Promise<IssueProject>;
  write(project: IssueProject, version: BcfVersion): Promise<Uint8Array>;
  validateProject(project: IssueProject, version: BcfVersion): ValidationResult;
}

export interface ModelBridge {
  getCurrentSelection(): Promise<unknown[]>;
  getCurrentSnapshotBase64(): Promise<string | undefined>;
  getCurrentCamera(): Promise<Viewpoint["camera"] | undefined>;
  focusTopic(topic: IssueTopic): Promise<void>;
}

export interface UiBridge {
  info(message: string): Promise<void>;
  warn(message: string): Promise<void>;
  error(message: string): Promise<void>;
  inputBox(prompt: string, value?: string): Promise<string | undefined>;
  chooseVersion(title: string): Promise<BcfVersion | undefined>;
  openBinaryFile(filters?: string[]): Promise<Uint8Array | undefined>;
  saveBinaryFile(suggestedName: string, data: Uint8Array): Promise<void>;
  openIssueManager(controller: IssueManagerController): Promise<void>;
  openIssueEditor(topic: IssueTopic, options: IssueEditorOptions): Promise<IssueTopic | undefined>;
}

export interface IssueManagerSnapshot {
  project: IssueProject;
  selectedGuid?: string;
}

export interface IssueManagerController {
  title: string;
  getSnapshot(): Promise<IssueManagerSnapshot>;
  selectTopic(guid: string): Promise<void>;
  openTopic(guid: string): Promise<void>;
  createTopic(): Promise<void>;
  editTopic(guid: string): Promise<void>;
  deleteTopic(guid: string): Promise<void>;
  addComment(guid: string): Promise<void>;
  resolveTopic(guid: string): Promise<void>;
  closeTopic(guid: string): Promise<void>;
  reopenTopic(guid: string): Promise<void>;
  importArchive(): Promise<void>;
  exportArchive(): Promise<void>;
}

export interface IssueEditorOptions {
  mode: "create" | "edit";
}
