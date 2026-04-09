import { TopicStore } from "../domain/contracts";
import { IssueTopic } from "../domain/model";

export interface BcfTreeItem extends TreeItem {
  kind: "topic" | "viewpoint" | "comment";
  topicGuid: string;
}

export function buildTopicTreeProvider(ctx: Context, store: TopicStore): TreeViewOptions<BcfTreeItem> {
  const onDidChangeTreeData = ctx.createEventHandler<string | void>();
  const treeview = ctx.treeview as TreeView<BcfTreeItem>;
  treeview.onDidBroadcast((e) => {
    if (e.event === "changeActiveWindow" || e.event === "ss:changed") {
      onDidChangeTreeData.fire();
    }
  });

  return {
    treeDataProvider: {
      onDidChangeTreeData,
      getChildren: async (element) => {
        const project = await store.load();
        if (!element) {
          return project.topics.map((topic) => topicToTreeItem(topic));
        }
        const topic = project.topics.find((item) => item.guid === element.topicGuid);
        if (!topic) return [];
        if (element.kind === "topic") {
          return [
            ...topic.viewpoints.map((vp) => ({ id: `vp:${vp.guid}`, label: `Вид ${vp.index + 1}`, kind: "viewpoint", topicGuid: topic.guid, contextValue: "bcf.viewpoint" } satisfies BcfTreeItem)),
            ...topic.comments.map((comment, index) => ({ id: `comment:${comment.guid}`, label: `Комментарий ${index + 1}`, description: comment.author, tooltip: comment.message, kind: "comment", topicGuid: topic.guid, contextValue: "bcf.comment" } satisfies BcfTreeItem))
          ];
        }
        return [];
      },
      hasChildren: (element) => element.kind === "topic"
    }
  };
}

function topicToTreeItem(topic: IssueTopic): BcfTreeItem {
  return {
    id: `topic:${topic.guid}`,
    label: `#${topic.number} ${topic.title}`,
    description: topic.status,
    tooltip: topic.description,
    kind: "topic",
    topicGuid: topic.guid,
    contextValue: "bcf.topic",
    dblCommand: "bcf:open-topic"
  };
}
