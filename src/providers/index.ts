import { buildTopicTreeProvider } from "./topicTreeProvider";
import { sharedStore } from "../commands";

export function bcf_topic_tree(ctx: Context) {
  return buildTopicTreeProvider(ctx, sharedStore);
}
