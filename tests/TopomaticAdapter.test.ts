import test from "node:test";
import assert from "node:assert/strict";

import { TopomaticAdapter } from "../src/topomatic/TopomaticAdapter";

function makeCtx(extra: Record<string, unknown> = {}) {
  const messages: string[] = [];
  const channel = { info: (m: string) => messages.push(`i:${m}`), warn: (m: string) => messages.push(`w:${m}`), error: (m: string) => messages.push(`e:${m}`) };
  return {
    messages,
    ctx: {
      createOutputChannel: () => channel,
      selection: { items: [{ id: 1 }] },
      ...extra
    } as any
  };
}

test("adapter uses SDK hooks when present", async () => {
  const { messages, ctx } = makeCtx({
    showInputBox: async ({ prompt }: { prompt: string }) => prompt + " ok",
    showQuickPick: async (items: Array<{ key: string }>) => items[0],
    pickOpenFile: async () => new Uint8Array([1]),
    pickSaveLocation: async () => "/tmp/a.bcfzip",
    saveBinary: async () => undefined,
    showHtmlPanel: async () => undefined,
    captureSnapshot: async () => "abc"
  });
  const adapter = new TopomaticAdapter(ctx);
  assert.equal(await adapter.inputBox("Prompt"), "Prompt ok");
  assert.equal((await adapter.quickPick([{ key: "1", label: "One" }], "p"))?.key, "1");
  assert.deepEqual(await adapter.pickOpenFile('.bcfzip'), new Uint8Array([1]));
  assert.equal(await adapter.pickSaveLocation('a.bcfzip'), '/tmp/a.bcfzip');
  await adapter.info('hello');
  assert.deepEqual(messages, ['i:hello']);
  assert.equal(await adapter.getCurrentSnapshotBase64(), 'abc');
});

test("adapter throws explicit error when critical SDK hook is missing", async () => {
  const { ctx } = makeCtx();
  const adapter = new TopomaticAdapter(ctx);
  await assert.rejects(() => adapter.inputBox('Name'), /showInputBox/);
  await assert.rejects(() => adapter.showHtmlPanel('x','y'), /showHtmlPanel/);
});
