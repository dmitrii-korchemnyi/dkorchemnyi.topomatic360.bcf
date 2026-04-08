import { BcfService } from "../application/BcfService";
import { BcfZipReader } from "../bcf/BcfZipReader";
import { BcfZipWriter } from "../bcf/BcfZipWriter";
import { InMemoryTopicStore } from "../infrastructure/InMemoryTopicStore";
import { TopomaticAdapter } from "../topomatic/TopomaticAdapter";
import { buildBcfTree, buildTopicChildren, BcfTreeNode } from "../utils/bcfTree";

const sharedStore = new InMemoryTopicStore();
const sharedReader = new BcfZipReader();
const sharedWriter = new BcfZipWriter();

function createService(ctx: Context): BcfService {
  const adapter = new TopomaticAdapter(ctx);
  return new BcfService(sharedStore, sharedReader, sharedWriter, adapter, adapter);
}

export function bcf_tree_provider(ctx: Context): TreeViewOptions<BcfTreeNode> {
  const onDidChangeTreeData = ctx.createEventHandler<string | void>();
  const treeview = (ctx as unknown as { treeview?: TreeView<BcfTreeNode> }).treeview;

  treeview?.onDidBroadcast?.((event: { event?: string }) => {
    if (event?.event === "changeActiveWindow" || event?.event === "ss:select" || event?.event === "bcf:refresh") {
      onDidChangeTreeData.fire();
    }
  });

  return {
    showCollapseAll: true,
    treeDataProvider: {
      onDidChangeTreeData,
      async getChildren(element: BcfTreeNode | undefined): Promise<BcfTreeNode[]> {
        const project = await createService(ctx).getProject();
        if (!element) {
          return buildBcfTree(project);
        }

        const topic = project.topics.find((item) => item.guid === element.topicGuid);
        if (!topic || element.kind !== "topic") {
          return [];
        }

        return buildTopicChildren(topic);
      },
      hasChildren(element: BcfTreeNode): boolean {
        return element.kind === "topic";
      }
    }
  };
}
