import { IssueEditorOptions, IssueManagerController, ModelBridge, UiBridge } from "../domain/contracts";
import { BcfVersion, IssueTopic } from "../domain/model";
import { mountIssueEditorDialog } from "../ui/issueEditorDialog";
import { mountIssueManagerDialog } from "../ui/issueManagerDialog";

function fileFilter(name: string, extensions: string[]): FileFilter {
  return { name, extensions } as unknown as FileFilter;
}

export class TopomaticAdapter implements UiBridge, ModelBridge {
  private readonly channel: OutputChannel;

  constructor(private readonly ctx: Context) {
    this.channel = ctx.createOutputChannel("BCF");
  }

  async info(message: string): Promise<void> {
    this.channel.appendLine(`[INFO] ${message}`);
    await this.ctx.showMessage(message, "info");
  }

  async warn(message: string): Promise<void> {
    this.channel.appendLine(`[WARN] ${message}`);
    await this.ctx.showMessage(message, "warning");
  }

  async error(message: string): Promise<void> {
    this.channel.appendLine(`[ERROR] ${message}`);
    await this.ctx.showMessage(message, "error");
  }

  async inputBox(prompt: string, value = ""): Promise<string | undefined> {
    const result = await this.ctx.showInputBox({ prompt, value });
    return result || undefined;
  }

  async chooseVersion(title: string): Promise<BcfVersion | undefined> {
    const items = [
      { key: "2.0" as BcfVersion, label: "BCF 2.0" },
      { key: "2.1" as BcfVersion, label: "BCF 2.1" },
      { key: "3.0" as BcfVersion, label: "BCF 3.0" }
    ];
    const picked = await this.ctx.showQuickPick(items, { placeHolder: title });
    return picked?.key;
  }

  async openBinaryFile(filters = ["bcfzip"]): Promise<Uint8Array | undefined> {
    const ws = await this.ctx.openDialog({
      message: "Выберите BCF-файл",
      filters: [fileFilter("BCF", filters)]
    });
    if (!ws) return undefined;
    return ws.root.get();
  }

  async saveBinaryFile(suggestedName: string, data: Uint8Array): Promise<void> {
    const ws = await this.ctx.saveDialog({
      folder: false,
      suggestedName,
      buttonLabel: "Сохранить",
      filters: [fileFilter("BCF", ["bcfzip"])],
      message: "Сохранить BCF"
    });
    await ws.root.put(data);
    await ws.flush();
  }

  async openIssueManager(controller: IssueManagerController): Promise<void> {
    await this.ctx.showDefinedDialog({
      title: controller.title,
      hideButtons: true,
      mount: (el) => mountIssueManagerDialog(el, controller)
    });
  }

  async openIssueEditor(topic: IssueTopic, options: IssueEditorOptions): Promise<IssueTopic | undefined> {
    return new Promise<IssueTopic | undefined>((resolve) => {
      let done = false;
      this.ctx.showDefinedDialog({
        title: options.mode === "create" ? "Создать замечание" : "Редактировать замечание",
        hideButtons: true,
        mount: (el) => mountIssueEditorDialog(el, topic, options, (value) => {
          done = true;
          resolve(value);
        }, () => {
          done = true;
          resolve(undefined);
        })
      }).finally(() => {
        if (!done) resolve(undefined);
      });
    });
  }

  async getCurrentSelection(): Promise<unknown[]> {
    const layer = this.ctx.cadview?.layer;
    if (!layer) return [];
    return [...layer.selectedObjects()];
  }

  async getCurrentSnapshotBase64(): Promise<string | undefined> {
    return undefined;
  }

  async getCurrentCamera(): Promise<any> {
    return undefined;
  }

  async focusTopic(topic: IssueTopic): Promise<void> {
    const components = topic.viewpoints[0]?.components ?? [];
    const layer = this.ctx.cadview?.layer;
    if (layer && components.length > 0) {
      const ids = new Set(components.map((c) => c.elementId || c.authoringToolId || c.ifcGuid || c.guid));
      layer.selectObjects((obj: any) => ids.has(String(obj?.id ?? obj?.elementId ?? obj?.ifcGuid ?? obj?.guid)), true);
    }
    this.ctx.setStatusBarMessage(`BCF: ${topic.title}`, 3000);
    await this.info(`Открыто замечание #${topic.number}: ${topic.title}`);
  }
}
