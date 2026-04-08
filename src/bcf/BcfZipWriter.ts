import JSZip from "jszip";
import { create } from "xmlbuilder2";
import { ArchiveWriter } from "../domain/contracts";
import { IssueProject } from "../domain/model";

export class BcfZipWriter implements ArchiveWriter {
  async write(project: IssueProject): Promise<Uint8Array> {
    const zip = new JSZip();

    const projectXml = create({ version: "1.0", encoding: "UTF-8" })
      .ele("ProjectExtension")
        .ele("Project")
          .ele("Name").txt(project.name).up()
          .ele("ProjectId").txt(project.projectId).up()
        .up()
      .up()
      .end({ prettyPrint: true });

    zip.file("project.bcfp", projectXml);

    for (const topic of project.topics) {
      const folder = zip.folder(topic.guid)!;
      const root = create({ version: "1.0", encoding: "UTF-8" }).ele("Markup");

      const topicElement = root.ele("Topic", { Guid: topic.guid });
      topicElement.ele("Title").txt(topic.title).up();
      topicElement.ele("Description").txt(topic.description).up();
      topicElement.ele("CreationDate").txt(topic.creationDate).up();
      topicElement.ele("CreationAuthor").txt(topic.creationAuthor).up();
      topicElement.ele("AssignedTo").txt(topic.assignedTo ?? "").up();
      if (topic.deadline) topicElement.ele("DueDate").txt(topic.deadline).up();
      topicElement.up();

      for (const comment of topic.comments) {
        root.ele("Comment", { Guid: comment.guid })
          .ele("Date").txt(comment.date).up()
          .ele("Author").txt(comment.author).up()
          .ele("Comment").txt(comment.message).up()
        .up();
      }

      if (topic.viewpoints.length > 0) {
        const vps = root.ele("Viewpoints");
        for (const vp of topic.viewpoints) {
          vps.ele("ViewPoint")
            .ele("Guid").txt(vp.guid).up()
          .up();
        }
        vps.up();
      }

      folder.file("markup.bcf", root.end({ prettyPrint: true }));
    }

    return zip.generateAsync({ type: "uint8array" });
  }
}
