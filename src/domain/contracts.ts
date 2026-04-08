import { IssueProject, IssueTopic } from "./model";

export interface QuickPickItem {
  key: string;
  label: string;
  description?: string;
}

export interface ActiveTreeNode {
  id: string;
  contextValue?: string;
  label?: string;
}

export interface TopicStore {
  load(): Promise<IssueProject>;
  save(project: IssueProject): Promise<void>;
}

export interface ArchiveReader {
  read(buffer: Uint8Array): Promise<IssueProject>;
}

export interface ArchiveWriter {
  write(project: IssueProject): Promise<Uint8Array>;
}

export interface UiBridge {
  info(message: string): Promise<void>;
  warn(message: string): Promise<void>;
  error(message: string): Promise<void>;
  quickPick<T extends QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined>;
  inputBox(prompt: string, value?: string): Promise<string | undefined>;
  pickOpenFile(filenameExtension: string): Promise<Uint8Array | undefined>;
  pickSaveWorkspace(defaultName: string): Promise<Workspace | undefined>;
  saveBinary(workspace: Workspace, data: Uint8Array): Promise<void>;
  showTopicDialog(topic: IssueTopic): Promise<void>;
  refreshViews(): Promise<void>;
}

export interface SelectionComponent {
  id?: string;
  ifcGuid?: string;
  modelRef?: string;
  layerName?: string;
  elementName?: string;
  elementType?: string;
}

export interface ModelBridge {
  getCurrentSelection(): Promise<SelectionComponent[]>;
  getCurrentSnapshotBase64(): Promise<string | undefined>;
  focusTopic(topic: IssueTopic): Promise<void>;
  getActiveTreeNode(): ActiveTreeNode | undefined;
  debugContextSnapshot(): Record<string, unknown>;
}
