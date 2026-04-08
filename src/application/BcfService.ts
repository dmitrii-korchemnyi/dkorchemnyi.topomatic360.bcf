import {
  ActiveTreeNode,
  ArchiveReader,
  ArchiveWriter,
  ModelBridge,
  QuickPickItem,
  SelectionComponent,
  TopicStore,
  UiBridge
} from "../domain/contracts";
import { CommentItem, ComponentRef, IssueProject, IssueTopic, Viewpoint } from "../domain/model";

export class BcfService {
  constructor(
    private readonly store: TopicStore,
    private readonly reader: ArchiveReader,
    private readonly writer: ArchiveWriter,
    private readonly ui: UiBridge,
    private readonly model: ModelBridge
  ) {}

  async importArchive(): Promise<void> {
    try {
      const buffer = await this.ui.pickOpenFile("bcfzip");
      if (!buffer) {
        await this.ui.warn("Импорт отменён.");
        return;
      }

      const project = await this.reader.read(buffer);
      await this.store.save(project);
      await this.ui.refreshViews();
      await this.ui.info(`Импортировано замечаний: ${project.topics.length}`);
    } catch (error) {
      await this.ui.error(this.messageOf(error, "Не удалось импортировать BCFZIP."));
    }
  }

  async exportArchive(): Promise<void> {
    try {
      const project = await this.store.load();
      const workspace = await this.ui.pickSaveWorkspace(`${project.name}.bcfzip`);
      if (!workspace) {
        await this.ui.warn("Экспорт отменён.");
        return;
      }

      const data = await this.writer.write(project);
      await this.ui.saveBinary(workspace, data);
      await this.ui.info(`BCFZIP сохранён: ${project.name}.bcfzip`);
    } catch (error) {
      await this.ui.error(this.messageOf(error, "Не удалось экспортировать BCFZIP."));
    }
  }

  async createTopicFromSelection(author = "Пользователь Topomatic"): Promise<void> {
    try {
      const title = await this.ui.inputBox("Название замечания");
      if (!title) {
        return;
      }

      const description = (await this.ui.inputBox("Описание замечания")) ?? "";
      const assignedTo = (await this.ui.inputBox("Назначить пользователю", "Unassigned")) ?? "Unassigned";
      const selection = await this.model.getCurrentSelection();
      const snapshotBase64 = await this.model.getCurrentSnapshotBase64();
      const project = await this.store.load();

      const viewpoint: Viewpoint = {
        guid: crypto.randomUUID(),
        title: "Основной вид",
        snapshotBase64,
        snapshotFileName: snapshotBase64 ? "snapshot.png" : undefined,
        componentsMode: "Выбранные",
        components: selection.map((item, index) => this.mapSelectionToComponent(item, index))
      };

      const topic: IssueTopic = {
        guid: crypto.randomUUID(),
        number: this.nextNumber(project.topics),
        title,
        description,
        status: "Открыто",
        priority: "Обычный",
        type: "Замечание",
        labels: [],
        assignedTo,
        creationAuthor: author,
        creationDate: new Date().toISOString(),
        comments: [],
        viewpoints: [viewpoint]
      };

      project.topics.unshift(topic);
      await this.store.save(project);
      await this.ui.refreshViews();
      await this.ui.info(`Создано замечание: ${topic.number}. ${topic.title}`);
    } catch (error) {
      await this.ui.error(this.messageOf(error, "Не удалось создать замечание."));
    }
  }

  async openTopicFromActiveContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание BCF.");
      return;
    }

    await this.model.focusTopic(topic);
    await this.ui.showTopicDialog(topic);
  }

  async openTopicQuickList(): Promise<void> {
    const project = await this.store.load();
    if (project.topics.length === 0) {
      await this.ui.warn("Замечаний пока нет.");
      return;
    }

    const picked = await this.ui.quickPick(
      project.topics.map((topic) => this.toQuickPickItem(topic)),
      "Выберите замечание"
    );

    if (!picked) {
      return;
    }

    const topic = project.topics.find((item) => item.guid === picked.key);
    if (!topic) {
      await this.ui.warn("Замечание не найдено.");
      return;
    }

    await this.model.focusTopic(topic);
    await this.ui.showTopicDialog(topic);
  }

  async addCommentFromActiveContext(author = "Пользователь Topomatic"): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание для комментирования.");
      return;
    }

    const text = await this.ui.inputBox(`Комментарий к замечанию ${topic.number}`);
    if (!text) {
      return;
    }

    const project = await this.store.load();
    const mutableTopic = project.topics.find((item) => item.guid === topic.guid);
    if (!mutableTopic) {
      await this.ui.warn("Замечание не найдено.");
      return;
    }

    const comment: CommentItem = {
      guid: crypto.randomUUID(),
      author,
      date: new Date().toISOString(),
      message: text
    };

    mutableTopic.comments.push(comment);
    mutableTopic.modifiedAuthor = author;
    mutableTopic.modifiedDate = comment.date;

    await this.store.save(project);
    await this.ui.refreshViews();
    await this.ui.info("Комментарий добавлен.");
  }

  async deleteTopicFromActiveContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание для удаления.");
      return;
    }

    const project = await this.store.load();
    project.topics = project.topics.filter((item) => item.guid !== topic.guid);
    await this.store.save(project);
    await this.ui.refreshViews();
    await this.ui.info(`Замечание удалено: ${topic.number}. ${topic.title}`);
  }

  async refresh(): Promise<void> {
    await this.ui.refreshViews();
    await this.ui.info("Дерево BCF обновлено.");
  }

  async debugContext(): Promise<void> {
    const snapshot = this.model.debugContextSnapshot();
    await this.ui.info(JSON.stringify(snapshot, null, 2));
  }

  async getProject(): Promise<IssueProject> {
    return this.store.load();
  }

  private async getTopicFromActiveContext(): Promise<IssueTopic | undefined> {
    const node = this.model.getActiveTreeNode();
    const topicGuid = this.extractTopicGuid(node);
    if (!topicGuid) {
      return undefined;
    }

    const project = await this.store.load();
    return project.topics.find((item) => item.guid === topicGuid);
  }

  private extractTopicGuid(node: ActiveTreeNode | undefined): string | undefined {
    if (!node) {
      return undefined;
    }

    const parts = node.id.split(":");
    if (parts.length < 2) {
      return undefined;
    }

    return parts[1];
  }

  private toQuickPickItem(topic: IssueTopic): QuickPickItem {
    return {
      key: topic.guid,
      label: `${topic.number}. ${topic.title}`,
      description: `${topic.status} · ${topic.priority} · комментариев: ${topic.comments.length}`
    };
  }

  private nextNumber(topics: IssueTopic[]): number {
    return topics.reduce((max, item) => Math.max(max, item.number), 0) + 1;
  }

  private mapSelectionToComponent(input: SelectionComponent, index: number): ComponentRef {
    return {
      elementId: String(input.id ?? index + 1),
      ifcGuid: input.ifcGuid,
      modelRef: input.modelRef,
      layerName: input.layerName,
      elementName: input.elementName,
      elementType: input.elementType
    };
  }

  private messageOf(error: unknown, fallback: string): string {
    return error instanceof Error ? `${fallback} ${error.message}` : fallback;
  }
}
