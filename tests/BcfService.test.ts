import test from "node:test";
import assert from "node:assert/strict";

import { BcfService } from "../src/application/BcfService";
import { IssueProject, IssueTopic } from "../src/domain/model";

class StubStore {
  project: IssueProject = { projectId: "p1", name: "Demo", topics: [] };
  async load(): Promise<IssueProject> { return structuredClone(this.project); }
  async save(project: IssueProject): Promise<void> { this.project = structuredClone(project); }
}

class StubUi {
  infos: string[] = [];
  warnings: string[] = [];
  errors: string[] = [];
  inputQueue: Array<string | undefined> = [];
  quickPickQueue: Array<any> = [];
  saved: { path: string; data: Uint8Array } | undefined;
  openFile: Uint8Array | undefined;
  savePath: string | undefined;
  htmlPanel: { title: string; html: string } | undefined;
  async info(message: string) { this.infos.push(message); }
  async warn(message: string) { this.warnings.push(message); }
  async error(message: string) { this.errors.push(message); }
  async quickPick<T extends { key: string; label: string }>(items: T[], _placeholder: string): Promise<T | undefined> {
    const next = this.quickPickQueue.shift();
    if (next) return next;
    return items[0];
  }
  async inputBox(_prompt: string, _value = ""): Promise<string | undefined> { return this.inputQueue.shift(); }
  async pickOpenFile(_filter: string): Promise<Uint8Array | undefined> { return this.openFile; }
  async pickSaveLocation(_defaultName: string): Promise<string | undefined> { return this.savePath; }
  async saveBinary(path: string, data: Uint8Array): Promise<void> { this.saved = { path, data }; }
  async showHtmlPanel(title: string, html: string): Promise<void> { this.htmlPanel = { title, html }; }
}

class StubModel {
  selection: unknown[] = [];
  snapshot: string | undefined;
  focused: IssueTopic | undefined;
  async getCurrentSelection(): Promise<unknown[]> { return this.selection; }
  async getCurrentSnapshotBase64(): Promise<string | undefined> { return this.snapshot; }
  async focusTopic(topic: IssueTopic): Promise<void> { this.focused = topic; }
}

class StubReader {
  project: IssueProject = { projectId: "imported", name: "Imported", topics: [] };
  async read(_buffer: Uint8Array): Promise<IssueProject> { return structuredClone(this.project); }
}

class StubWriter {
  bytes = new Uint8Array([1,2,3]);
  async write(_project: IssueProject): Promise<Uint8Array> { return this.bytes; }
}

function makeService() {
  const store = new StubStore();
  const ui = new StubUi();
  const model = new StubModel();
  const reader = new StubReader();
  const writer = new StubWriter();
  return { service: new BcfService(store as any, reader as any, writer as any, ui as any, model as any), store, ui, model, reader, writer };
}

test("createTopicFromSelection stores topic with mapped components and snapshot", async () => {
  const { service, store, ui, model } = makeService();
  ui.inputQueue = ["Issue 1", "Need to fix", "Ivan"];
  model.selection = [{ id: 42, ifcGuid: "abc", modelName: "m1", layerName: "L1", name: "Wall", type: "IfcWall" }];
  model.snapshot = "ZmFrZQ==";

  await service.createTopicFromSelection("Tester");

  const saved = await store.load();
  assert.equal(saved.topics.length, 1);
  assert.equal(saved.topics[0].title, "Issue 1");
  assert.equal(saved.topics[0].assignedTo, "Ivan");
  assert.equal(saved.topics[0].viewpoints[0].snapshotBase64, "ZmFrZQ==");
  assert.equal(saved.topics[0].viewpoints[0].components[0].elementId, "42");
  assert.match(ui.infos[0], /Создано замечание/);
});

test("listAndOpenTopic focuses selected topic", async () => {
  const { service, store, model } = makeService();
  store.project.topics = [{ guid: "g1", number: 1, title: "A", description: "", status: "Открыто", priority: "Обычный", type: "Замечание", labels: [], creationAuthor: "a", creationDate: "2026-01-01", comments: [], viewpoints: [] }];
  await service.listAndOpenTopic();
  assert.equal(model.focused?.guid, "g1");
});

test("addQuickComment appends comment and updates modified fields", async () => {
  const { service, store, ui } = makeService();
  store.project.topics = [{ guid: "g1", number: 1, title: "A", description: "", status: "Открыто", priority: "Обычный", type: "Замечание", labels: [], creationAuthor: "a", creationDate: "2026-01-01", comments: [], viewpoints: [] }];
  ui.inputQueue = ["Looks good"];

  await service.addQuickComment("Reviewer");
  const saved = await store.load();
  assert.equal(saved.topics[0].comments.length, 1);
  assert.equal(saved.topics[0].comments[0].message, "Looks good");
  assert.equal(saved.topics[0].modifiedAuthor, "Reviewer");
});

test("importArchive saves imported project", async () => {
  const { service, store, ui, reader } = makeService();
  ui.openFile = new Uint8Array([7]);
  reader.project = { projectId: "p2", name: "Imported", topics: [{ guid: "g1", number: 1, title: "Imported issue", description: "", status: "Открыто", priority: "Обычный", type: "Замечание", labels: [], creationAuthor: "a", creationDate: "2026-01-01", comments: [], viewpoints: [] }] };

  await service.importArchive();
  const saved = await store.load();
  assert.equal(saved.name, "Imported");
  assert.equal(saved.topics.length, 1);
});

test("exportArchive warns when save location is unavailable", async () => {
  const { service, store, ui } = makeService();
  store.project.topics = [{ guid: "g1", number: 1, title: "A", description: "", status: "Открыто", priority: "Обычный", type: "Замечание", labels: [], creationAuthor: "a", creationDate: "2026-01-01", comments: [], viewpoints: [] }];

  await service.exportArchive();

  assert.equal(ui.warnings.length, 1);
  assert.equal(ui.saved, undefined);
});
