import { BcfService } from "../application/BcfService";
import { BcfEngine } from "../bcf/BcfEngine";
import { InMemoryTopicStore } from "../infrastructure/InMemoryTopicStore";
import { TopomaticAdapter } from "../topomatic/TopomaticAdapter";

const sharedStore = new InMemoryTopicStore();
const sharedEngine = new BcfEngine();

function makeService(ctx: Context): BcfService {
  const adapter = new TopomaticAdapter(ctx);
  return new BcfService(sharedStore, sharedEngine, adapter, adapter);
}

export async function bcf_open_manager(ctx: Context): Promise<void> {
  return makeService(ctx).openManager();
}

export async function bcf_import(ctx: Context): Promise<void> {
  return makeService(ctx).importArchive();
}

export async function bcf_export(ctx: Context): Promise<void> {
  return makeService(ctx).exportArchive();
}

export async function bcf_create_topic(ctx: Context): Promise<void> {
  return makeService(ctx).createTopic();
}

export async function bcf_open_topic(ctx: Context, args?: { guid?: string; topicGuid?: string }): Promise<void> {
  const guid = args?.guid ?? args?.topicGuid;
  if (!guid) return;
  return makeService(ctx).openTopic(guid);
}

export async function bcf_about(ctx: Context): Promise<void> {
  const output = ctx.createOutputChannel("BCF");
  output.appendLine(`extension=${ctx.extension.manifest.name ?? "unknown"}`);
  output.appendLine(`hasApp=${String(!!ctx.app)}`);
  output.appendLine(`hasWindow=${String(!!ctx.window)}`);
  output.appendLine(`hasCadview=${String(!!ctx.cadview)}`);
  await ctx.showMessage("BCF-плагин инициализирован", "info");
}

export { sharedStore };
