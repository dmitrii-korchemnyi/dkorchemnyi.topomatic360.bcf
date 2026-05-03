import { createIssue } from "../application/issue-service";
import { issueStore } from "../application/issue-store";
import { updateStatusBar } from "../application/status-service";
import { getErrorMessage } from "../utils/errors";
import type { TopomaticContext } from "./albatros-types";
import { showCreateIssueDialog } from "./issue-dialog-adapter";
import { readSelectedComponents } from "./selection-adapter";
import { captureSnapshot, enrichViewpointFromCadView } from "./viewpoint-adapter";

export async function createBcfIssueFromTopomatic(ctx: TopomaticContext): Promise<void> {
  if (!ctx.app) {
    ctx.showMessage("Нет активного проекта", "warning");
    return;
  }

  if (!ctx.cadview) {
    ctx.showMessage("Откройте чертёж или модель", "warning");
    return;
  }

  const output = ctx.createOutputChannel("BCF Manager");

  try {
    const selection = readSelectedComponents(ctx.cadview);
    const snapshotResult = await captureSnapshot(ctx.cadview);
    const input = await showCreateIssueDialog(ctx);
    if (!input) {
      return;
    }

    let issue = createIssue({
      ...input,
      components: selection.components,
      snapshot: snapshotResult.snapshot
    });

    const enriched = enrichViewpointFromCadView(issue.viewpoints[0], ctx.cadview);
    issue = { ...issue, viewpoints: [enriched.viewpoint] };

    [...selection.warnings, ...snapshotResult.warnings, ...enriched.warnings].forEach((warning) => output.appendLine(warning));
    if (selection.warnings.length > 0 || snapshotResult.warnings.length > 0 || enriched.warnings.length > 0) {
      output.show?.();
    }

    issueStore.addIssue(issue);
    updateStatusBar(ctx);
    ctx.manager?.broadcast?.("bcf:changed", { source: "create", issueGuid: issue.guid });
    ctx.showMessage(`Создано замечание: ${issue.title}`, "info");
  } catch (error) {
    const message = getErrorMessage(error);
    output.appendLine(message);
    output.show?.();
    ctx.showMessage(message, "error");
  }
}
