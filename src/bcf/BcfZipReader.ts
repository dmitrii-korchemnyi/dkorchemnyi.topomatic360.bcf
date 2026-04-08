import JSZip from "jszip";
import { create } from "xmlbuilder2";
import { ArchiveReader } from "../domain/contracts";
import { IssueProject, IssueTopic } from "../domain/model";

export class BcfZipReader implements ArchiveReader {
  async read(buffer: Uint8Array): Promise<IssueProject> {
    const zip = await JSZip.loadAsync(buffer);
    let projectId = crypto.randomUUID();
    let name = "Импортированный BCF проект";

    const projectFile = zip.file("project.bcfp");
    if (projectFile) {
      const xml = await projectFile.async("string");
      const doc = create(xml).end({ format: "object" }) as any;
      projectId = doc?.ProjectExtension?.Project?.ProjectId ?? doc?.Project?.ProjectId ?? projectId;
      name = doc?.ProjectExtension?.Project?.Name ?? doc?.Project?.Name ?? name;
    }

    const folderNames = new Set<string>();
    for (const key of Object.keys(zip.files)) {
      const parts = key.split("/");
      if (parts.length > 1 && parts[0] && parts[0] !== "__MACOSX") {
        folderNames.add(parts[0]);
      }
    }

    let index = 1;
    const topics: IssueTopic[] = [];
    for (const folder of folderNames) {
      const markupFile = zip.file(`${folder}/markup.bcf`);
      if (!markupFile) continue;
      const xml = await markupFile.async("string");
      const doc = create(xml).end({ format: "object" }) as any;
      const topicNode = doc?.Markup?.Topic ?? {};
      const commentsNode = doc?.Markup?.Comment;
      const viewNode = doc?.Markup?.Viewpoints?.ViewPoint;
      const commentsArray = Array.isArray(commentsNode) ? commentsNode : commentsNode ? [commentsNode] : [];
      const viewsArray = Array.isArray(viewNode) ? viewNode : viewNode ? [viewNode] : [];

      topics.push({
        guid: topicNode?.Guid ?? folder,
        number: index++,
        title: topicNode?.Title ?? "Без названия",
        description: topicNode?.Description ?? "",
        status: "Открыто",
        priority: "Обычный",
        type: "Замечание",
        labels: [],
        assignedTo: topicNode?.AssignedTo,
        area: undefined,
        milestone: undefined,
        deadline: topicNode?.DueDate,
        creationAuthor: topicNode?.CreationAuthor ?? "unknown",
        creationDate: topicNode?.CreationDate ?? new Date().toISOString(),
        modifiedAuthor: topicNode?.ModifiedAuthor,
        modifiedDate: topicNode?.ModifiedDate,
        comments: commentsArray.map((c: any) => ({
          guid: c?.Guid ?? crypto.randomUUID(),
          author: c?.Author ?? "unknown",
          date: c?.Date ?? new Date().toISOString(),
          message: c?.Comment ?? ""
        })),
        viewpoints: viewsArray.map((v: any) => ({
          guid: v?.Guid ?? crypto.randomUUID(),
          title: v?.Guid ?? "Viewpoint",
          componentsMode: "Видимые",
          components: []
        }))
      });
    }

    return { projectId, name, topics };
  }
}
