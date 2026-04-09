import { BcfImportExport, IssueEditorOptions, IssueManagerController, ModelBridge, TopicStore, UiBridge } from "../domain/contracts";
import { BcfVersion, CommentItem, ComponentRef, IssueProject, IssueTopic, Viewpoint } from "../domain/model";
import { nowIso, newGuid } from "../utils/ids";

export class BcfService {
  private selectedGuid: string | undefined;

  constructor(
    private readonly store: TopicStore,
    private readonly io: BcfImportExport,
    private readonly ui: UiBridge,
    private readonly model: ModelBridge
  ) {}

  async importArchive(): Promise<void> {
    const buffer = await this.ui.openBinaryFile(["bcfzip", "bcf"]);
    if (!buffer) return;
    const version = await this.io.detectVersion(buffer);
    const project = await this.io.read(buffer);
    project.formatVersion = version;
    await this.store.save(project);
    this.selectedGuid = project.topics[0]?.guid;
    await this.ui.info(`Импортировано ${project.topics.length} замечаний. Версия BCF: ${version}.`);
  }

  async exportArchive(version?: BcfVersion): Promise<void> {
    const project = await this.store.load();
    const targetVersion = version ?? await this.ui.chooseVersion("Выберите версию BCF для экспорта");
    if (!targetVersion) return;
    const validation = this.io.validateProject(project, targetVersion);
    const errors = validation.messages.filter((m) => m.level === "error");
    if (errors.length > 0) {
      await this.ui.error(errors.map((m) => m.message).join("\n"));
      return;
    }
    const archive = await this.io.write(project, targetVersion);
    const filename = `${project.name.replace(/\s+/g, "_")}_${targetVersion}.bcfzip`;
    await this.ui.saveBinaryFile(filename, archive);
    await this.ui.info(`BCF ${targetVersion} экспортирован.`);
  }

  async openManager(): Promise<void> {
    await this.ui.openIssueManager(this.makeManagerController());
  }

  async createTopic(author = "Пользователь Topomatic"): Promise<void> {
    const draft = await this.buildTopicDraft(author);
    const topic = await this.ui.openIssueEditor(draft, { mode: "create" });
    if (!topic) return;
    const project = await this.store.mutate((state) => {
      topic.number = this.nextNumber(state.topics);
      state.topics.unshift(topic);
    });
    this.selectedGuid = project.topics[0]?.guid;
    await this.ui.info(`Создано замечание: ${topic.title}`);
  }

  async editTopic(guid: string): Promise<void> {
    const project = await this.store.load();
    const topic = project.topics.find((item) => item.guid === guid);
    if (!topic) return;
    const edited = await this.ui.openIssueEditor(topic, { mode: "edit" });
    if (!edited) return;
    await this.store.mutate((state) => {
      const index = state.topics.findIndex((item) => item.guid === guid);
      if (index >= 0) state.topics[index] = edited;
    });
    this.selectedGuid = guid;
  }

  async addComment(guid: string, author = "Пользователь Topomatic"): Promise<void> {
    const message = await this.ui.inputBox("Комментарий");
    if (!message) return;
    await this.store.mutate((state) => {
      const topic = state.topics.find((item) => item.guid === guid);
      if (!topic) return;
      const comment: CommentItem = { guid: newGuid(), author, date: nowIso(), message };
      topic.comments.push(comment);
      topic.modifiedAuthor = author;
      topic.modifiedDate = nowIso();
    });
  }

  async resolveTopic(guid: string): Promise<void> {
    await this.setStatus(guid, "Устранено");
  }

  async closeTopic(guid: string): Promise<void> {
    await this.setStatus(guid, "Закрыто");
  }

  async reopenTopic(guid: string): Promise<void> {
    await this.setStatus(guid, "Переоткрыто");
  }

  async deleteTopic(guid: string): Promise<void> {
    const state = await this.store.mutate((project) => {
      project.topics = project.topics.filter((topic) => topic.guid !== guid);
    });
    this.selectedGuid = state.topics[0]?.guid;
  }

  async selectTopic(guid: string): Promise<void> {
    this.selectedGuid = guid;
  }

  async openTopic(guid: string): Promise<void> {
    const project = await this.store.load();
    const topic = project.topics.find((item) => item.guid === guid);
    if (!topic) return;
    this.selectedGuid = guid;
    await this.model.focusTopic(topic);
  }

  private async buildTopicDraft(author: string): Promise<IssueTopic> {
    const selection = await this.model.getCurrentSelection();
    const camera = await this.model.getCurrentCamera();
    const snapshotBase64 = await this.model.getCurrentSnapshotBase64();
    const viewpoint: Viewpoint = {
      guid: newGuid(),
      index: 0,
      title: "Основной вид",
      snapshotBase64,
      snapshotFileName: snapshotBase64 ? "snapshot.png" : undefined,
      camera,
      components: selection.map((item, index) => this.mapSelectionToComponent(item, index))
    };

    return {
      guid: newGuid(),
      number: 0,
      title: "Новое замечание",
      description: "",
      status: "Новая",
      priority: "Обычный",
      type: "Замечание",
      labels: [],
      creationAuthor: author,
      creationDate: nowIso(),
      comments: [],
      viewpoints: [viewpoint]
    };
  }

  private mapSelectionToComponent(input: unknown, index: number): ComponentRef {
    const item = input as any;
    return {
      guid: item?.guid ?? item?.id ?? item?.ifcGuid ?? `sel-${index + 1}`,
      ifcGuid: item?.ifcGuid,
      elementId: String(item?.id ?? item?.elementId ?? index + 1),
      modelRef: item?.modelRef ?? item?.modelName,
      layerName: item?.layer?.name ?? item?.layerName,
      elementName: item?.name,
      elementType: item?.type,
      authoringToolId: item?.authoringToolId,
      visible: true,
      selected: true
    };
  }

  private nextNumber(topics: IssueTopic[]): number {
    return topics.reduce((max, topic) => Math.max(max, topic.number), 0) + 1;
  }

  private async setStatus(guid: string, status: IssueTopic["status"]): Promise<void> {
    await this.store.mutate((state) => {
      const topic = state.topics.find((item) => item.guid === guid);
      if (!topic) return;
      topic.status = status;
      topic.modifiedDate = nowIso();
      topic.modifiedAuthor = "Плагин BCF";
    });
  }

  private makeManagerController(): IssueManagerController {
    return {
      title: "Менеджер BCF",
      getSnapshot: async () => ({ project: await this.store.load(), selectedGuid: this.selectedGuid }),
      selectTopic: async (guid) => this.selectTopic(guid),
      openTopic: async (guid) => this.openTopic(guid),
      createTopic: async () => this.createTopic(),
      editTopic: async (guid) => this.editTopic(guid),
      deleteTopic: async (guid) => this.deleteTopic(guid),
      addComment: async (guid) => this.addComment(guid),
      resolveTopic: async (guid) => this.resolveTopic(guid),
      closeTopic: async (guid) => this.closeTopic(guid),
      reopenTopic: async (guid) => this.reopenTopic(guid),
      importArchive: async () => this.importArchive(),
      exportArchive: async () => this.exportArchive()
    };
  }
}
