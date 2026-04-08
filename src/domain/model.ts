export type IssueStatus = "Открыто" | "В работе" | "На проверке" | "Устранено" | "Закрыто" | "Отклонено";
export type IssuePriority = "Низкий" | "Обычный" | "Высокий" | "Критический";
export type IssueType = "Замечание" | "Коллизия" | "Проверка" | "Вопрос" | "Предложение" | "Ошибка моделирования";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Point3D;
  direction: Point3D;
  up: Point3D;
}

export interface ComponentRef {
  elementId?: string;
  ifcGuid?: string;
  modelRef?: string;
  layerName?: string;
  elementName?: string;
  elementType?: string;
}

export interface Viewpoint {
  guid: string;
  title?: string;
  snapshotFileName?: string;
  snapshotBase64?: string;
  camera?: CameraState;
  componentsMode: "Видимые" | "Выбранные" | "Все связанные";
  components: ComponentRef[];
}

export interface CommentItem {
  guid: string;
  author: string;
  date: string;
  message: string;
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
}
