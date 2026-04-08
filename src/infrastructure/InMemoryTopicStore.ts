import { TopicStore } from "../domain/contracts";
import { IssueProject } from "../domain/model";

export class InMemoryTopicStore implements TopicStore {
  private project: IssueProject = {
    projectId: crypto.randomUUID(),
    name: "Проект Topomatic 360",
    topics: []
  };

  async load(): Promise<IssueProject> {
    return structuredClone(this.project);
  }

  async save(project: IssueProject): Promise<void> {
    this.project = structuredClone(project);
  }
}
