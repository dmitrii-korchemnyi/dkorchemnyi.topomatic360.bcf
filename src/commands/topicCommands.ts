import { BcfService } from "../application/BcfService";
import { BcfZipReader } from "../bcf/BcfZipReader";
import { BcfZipWriter } from "../bcf/BcfZipWriter";
import { InMemoryTopicStore } from "../infrastructure/InMemoryTopicStore";
import { TopomaticAdapter } from "../topomatic/TopomaticAdapter";

const sharedStore = new InMemoryTopicStore();
const sharedReader = new BcfZipReader();
const sharedWriter = new BcfZipWriter();

function createService(ctx: Context): BcfService {
  const adapter = new TopomaticAdapter(ctx);
  return new BcfService(sharedStore, sharedReader, sharedWriter, adapter, adapter);
}

export async function bcf_import_archive(ctx: Context): Promise<void> {
  await createService(ctx).importArchive();
}

export async function bcf_export_archive(ctx: Context): Promise<void> {
  await createService(ctx).exportArchive();
}

export async function bcf_create_topic(ctx: Context): Promise<void> {
  await createService(ctx).createTopicFromSelection();
}

export async function bcf_open_topic(ctx: Context): Promise<void> {
  await createService(ctx).openTopicFromActiveContext();
}

export async function bcf_quick_list(ctx: Context): Promise<void> {
  await createService(ctx).openTopicQuickList();
}

export async function bcf_add_comment(ctx: Context): Promise<void> {
  await createService(ctx).addCommentFromActiveContext();
}

export async function bcf_refresh_tree(ctx: Context): Promise<void> {
  await createService(ctx).refresh();
}

export async function bcf_delete_topic(ctx: Context): Promise<void> {
  await createService(ctx).deleteTopicFromActiveContext();
}

export async function bcf_debug_context(ctx: Context): Promise<void> {
  await createService(ctx).debugContext();
}
