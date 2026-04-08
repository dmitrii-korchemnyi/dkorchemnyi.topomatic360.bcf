const test = require('node:test');
const assert = require('node:assert/strict');

let BcfService;
test.before(async () => {
  ({ BcfService } = await import('../.tmp-build/src/application/BcfService.js'));
});

class StubStore {
  constructor() { this.project = { projectId: 'p1', name: 'Demo', topics: [] }; }
  async load() { return structuredClone(this.project); }
  async save(project) { this.project = structuredClone(project); }
}
class StubUi {
  constructor() { this.infos=[]; this.warnings=[]; this.errors=[]; this.inputQueue=[]; this.quickPickQueue=[]; this.saved=undefined; this.openFile=undefined; this.savePath=undefined; this.htmlPanel=undefined; }
  async info(message) { this.infos.push(message); }
  async warn(message) { this.warnings.push(message); }
  async error(message) { this.errors.push(message); }
  async quickPick(items) { return this.quickPickQueue.shift() ?? items[0]; }
  async inputBox() { return this.inputQueue.shift(); }
  async pickOpenFile() { return this.openFile; }
  async pickSaveLocation() { return this.savePath; }
  async saveBinary(path, data) { this.saved = { path, data }; }
  async showHtmlPanel(title, html) { this.htmlPanel = { title, html }; }
}
class StubModel {
  constructor() { this.selection=[]; this.snapshot=undefined; this.focused=undefined; }
  async getCurrentSelection() { return this.selection; }
  async getCurrentSnapshotBase64() { return this.snapshot; }
  async focusTopic(topic) { this.focused = topic; }
}
class StubReader {
  constructor() { this.project = { projectId: 'imported', name: 'Imported', topics: [] }; }
  async read() { return structuredClone(this.project); }
}
class StubWriter {
  constructor() { this.bytes = new Uint8Array([1,2,3]); }
  async write() { return this.bytes; }
}
function makeService() {
  const store = new StubStore();
  const ui = new StubUi();
  const model = new StubModel();
  const reader = new StubReader();
  const writer = new StubWriter();
  return { service: new BcfService(store, reader, writer, ui, model), store, ui, model, reader, writer };
}

test('createTopicFromSelection stores topic with mapped components and snapshot', async () => {
  const { service, store, ui, model } = makeService();
  ui.inputQueue = ['Issue 1', 'Need to fix', 'Ivan'];
  model.selection = [{ id: 42, ifcGuid: 'abc', modelName: 'm1', layerName: 'L1', name: 'Wall', type: 'IfcWall' }];
  model.snapshot = 'ZmFrZQ==';
  await service.createTopicFromSelection('Tester');
  const saved = await store.load();
  assert.equal(saved.topics.length, 1);
  assert.equal(saved.topics[0].title, 'Issue 1');
  assert.equal(saved.topics[0].assignedTo, 'Ivan');
  assert.equal(saved.topics[0].viewpoints[0].snapshotBase64, 'ZmFrZQ==');
  assert.equal(saved.topics[0].viewpoints[0].components[0].elementId, '42');
  assert.match(ui.infos[0], /Создано замечание/);
});

test('listAndOpenTopic focuses selected topic', async () => {
  const { service, store, model } = makeService();
  store.project.topics = [{ guid: 'g1', number: 1, title: 'A', description: '', status: 'Открыто', priority: 'Обычный', type: 'Замечание', labels: [], creationAuthor: 'a', creationDate: '2026-01-01', comments: [], viewpoints: [] }];
  await service.listAndOpenTopic();
  assert.equal(model.focused?.guid, 'g1');
});

test('addQuickComment appends comment and updates modified fields', async () => {
  const { service, store, ui } = makeService();
  store.project.topics = [{ guid: 'g1', number: 1, title: 'A', description: '', status: 'Открыто', priority: 'Обычный', type: 'Замечание', labels: [], creationAuthor: 'a', creationDate: '2026-01-01', comments: [], viewpoints: [] }];
  ui.inputQueue = ['Looks good'];
  await service.addQuickComment('Reviewer');
  const saved = await store.load();
  assert.equal(saved.topics[0].comments.length, 1);
  assert.equal(saved.topics[0].comments[0].message, 'Looks good');
  assert.equal(saved.topics[0].modifiedAuthor, 'Reviewer');
});

test('importArchive saves imported project', async () => {
  const { service, store, ui, reader } = makeService();
  ui.openFile = new Uint8Array([7]);
  reader.project = { projectId: 'p2', name: 'Imported', topics: [{ guid: 'g1', number: 1, title: 'Imported issue', description: '', status: 'Открыто', priority: 'Обычный', type: 'Замечание', labels: [], creationAuthor: 'a', creationDate: '2026-01-01', comments: [], viewpoints: [] }] };
  await service.importArchive();
  const saved = await store.load();
  assert.equal(saved.name, 'Imported');
  assert.equal(saved.topics.length, 1);
});

test('exportArchive warns when save location is unavailable', async () => {
  const { service, store, ui } = makeService();
  store.project.topics = [{ guid: 'g1', number: 1, title: 'A', description: '', status: 'Открыто', priority: 'Обычный', type: 'Замечание', labels: [], creationAuthor: 'a', creationDate: '2026-01-01', comments: [], viewpoints: [] }];
  await service.exportArchive();
  assert.equal(ui.warnings.length, 1);
  assert.equal(ui.saved, undefined);
});
