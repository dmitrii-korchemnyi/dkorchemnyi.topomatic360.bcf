import { ActiveTreeNode, ModelBridge, QuickPickItem, SelectionComponent, UiBridge } from "../domain/contracts";
import { IssueTopic } from "../domain/model";

export class TopomaticAdapter implements UiBridge, ModelBridge {
  private readonly channel: OutputChannel;

  constructor(private readonly ctx: Context) {
    this.channel = ctx.createOutputChannel("BCF");
  }

  async info(message: string): Promise<void> {
    this.channel.appendLine(message);
    await this.ctx.showMessage(message, "info");
  }

  async warn(message: string): Promise<void> {
    this.channel.appendLine(`[warn] ${message}`);
    await this.ctx.showMessage(message, "warning");
  }

  async error(message: string): Promise<void> {
    this.channel.appendLine(`[error] ${message}`);
    this.channel.show(true);
    await this.ctx.showMessage(message, "error");
  }

  async quickPick<T extends QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined> {
    if (items.length === 0) {
      return undefined;
    }

    const labels = items.map((item) => item.label);
    const picked = await this.ctx.showQuickPick(labels, {
      placeHolder: placeholder,
      canPickMany: false
    } as any);

    if (!picked || Array.isArray(picked)) {
      return undefined;
    }

    return items.find((item) => item.label === picked);
  }

  async inputBox(prompt: string, value = ""): Promise<string | undefined> {
    const result = await this.ctx.showInputBox({ prompt, value });
    return result || undefined;
  }

  async pickOpenFile(filenameExtension: string): Promise<Uint8Array | undefined> {
    const workspace = await this.ctx.openDialog({
      filters: [{ name: filenameExtension.toUpperCase(), extensions: [filenameExtension] }],
      multiSelections: false
    });

    return workspace?.root?.get();
  }

  async pickSaveWorkspace(defaultName: string): Promise<Workspace | undefined> {
    const workspace = await this.ctx.saveDialog({ defaultPath: defaultName } as any);
    return workspace || undefined;
  }

  async saveBinary(workspace: Workspace, data: Uint8Array): Promise<void> {
    await workspace.root.put(data);
    await workspace.flush();
  }

  async showTopicDialog(topic: IssueTopic): Promise<void> {
    const description = topic.description || "Описание отсутствует";
    const comments = topic.comments.length > 0
      ? topic.comments
          .map((comment) => `• ${comment.author} [${new Date(comment.date).toLocaleString("ru-RU")}]: ${comment.message}`)
          .join("\n")
      : "Комментариев нет";

    await this.ctx.showMessage(
      [
        `${topic.number}. ${topic.title}`,
        `Статус: ${topic.status}`,
        `Приоритет: ${topic.priority}`,
        `Исполнитель: ${topic.assignedTo ?? "не назначен"}`,
        `Описание: ${description}`,
        `Комментарии:\n${comments}`
      ],
      "info"
    );
  }

  async refreshViews(): Promise<void> {
    await (this.ctx.manager as any).broadcast("bcf:refresh", { source: "bcf-plugin" });
  }

  async getCurrentSelection(): Promise<SelectionComponent[]> {
    const cadview = this.ctx.cadview;
    if (!cadview?.layer) {
      return [];
    }

    const result: SelectionComponent[] = [];
    for (const item of cadview.layer.selectedObjects()) {
      const source = item as Record<string, unknown>;
      const layer = source.layer as { name?: string } | undefined;
      result.push({
        id: asString(source.id) ?? asString(source.$id) ?? asString(source.guid),
        ifcGuid: asString(source.ifcGuid),
        modelRef: asString(source.modelRef) ?? asString(source.modelName),
        layerName: layer?.name ?? asString(source.layerName),
        elementName: asString(source.name),
        elementType: asString(source.type)
      });
    }

    return result;
  }

  async getCurrentSnapshotBase64(): Promise<string | undefined> {
    const snapshot = (this.ctx as Record<string, unknown>).captureSnapshot;
    if (typeof snapshot === "function") {
      const result = await (snapshot as () => Promise<string | undefined>)();
      return result || undefined;
    }

    return undefined;
  }

  async focusTopic(topic: IssueTopic): Promise<void> {
    const title = `Открыто замечание: ${topic.number}. ${topic.title}`;
    this.channel.appendLine(title);
    this.ctx.setStatusBarMessage(title, 2500);
  }

  getActiveTreeNode(): ActiveTreeNode | undefined {
    const treeview = (this.ctx as unknown as { treeview?: { active?: TreeItem } }).treeview;
    const active = treeview?.active;
    if (!active) {
      return undefined;
    }

    return {
      id: active.id,
      contextValue: active.contextValue,
      label: typeof active.label === "string" ? active.label : active.label?.label
    };
  }

  debugContextSnapshot(): Record<string, unknown> {
    return {
      hasApp: Boolean(this.ctx.app),
      hasCadView: Boolean(this.ctx.cadview),
      hasWindow: Boolean((this.ctx as Record<string, unknown>).window),
      activeTreeNode: this.getActiveTreeNode() ?? null,
      commandKeys: Object.keys(this.ctx as Record<string, unknown>).slice(0, 20)
    };
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
