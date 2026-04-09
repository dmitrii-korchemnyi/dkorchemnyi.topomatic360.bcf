export type BcfVersion = "2.0" | "2.1" | "3.0";
export type IssueStatus = "Новая" | "Активно" | "В работе" | "Устранено" | "Закрыто" | "Переоткрыто";
export type IssuePriority = "Низкий" | "Обычный" | "Высокий" | "Критический";
export type IssueType = "Замечание" | "Коллизия" | "Проверка" | "Вопрос" | "Предложение";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Point3D;
  direction: Point3D;
  up: Point3D;
  fieldOfView?: number;
}

export interface ComponentRef {
  guid: string;
  elementId?: string;
  ifcGuid?: string;
  modelRef?: string;
  layerName?: string;
  elementName?: string;
  elementType?: string;
  authoringToolId?: string;
  visible?: boolean;
  selected?: boolean;
}

export interface Viewpoint {
  guid: string;
  title?: string;
  index: number;
  snapshotFileName?: string;
  snapshotBase64?: string;
  camera?: CameraState;
  components: ComponentRef[];
}

export interface CommentItem {
  guid: string;
  author: string;
  date: string;
  message: string;
  viewpointGuid?: string;
  modifiedAuthor?: string;
  modifiedDate?: string;
}

export interface IssueTopic {
  guid: string;
  number: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  labels: string[];
  assignedTo?: string;
  area?: string;
  milestone?: string;
  deadline?: string;
  stage?: string;
  creationAuthor: string;
  creationDate: string;
  modifiedAuthor?: string;
  modifiedDate?: string;
  comments: CommentItem[];
  viewpoints: Viewpoint[];
}

export interface IssueProject {
  projectId: string;
  name: string;
  topics: IssueTopic[];
  formatVersion: BcfVersion;
}

export interface ValidationMessage {
  level: "info" | "warning" | "error";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  messages: ValidationMessage[];
}
