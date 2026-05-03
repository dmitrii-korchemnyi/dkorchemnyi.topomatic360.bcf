import type { TopomaticContext } from "../topomatic/albatros-types";
import { createBcfIssueFromTopomatic } from "../topomatic/create-issue-workflow";

export async function create_bcf_issue(ctx: TopomaticContext): Promise<void> {
  await createBcfIssueFromTopomatic(ctx);
}
