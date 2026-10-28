import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { test } from "node:test";
import { conversionArgs } from "../src/lib/media.ts";

// Exercise the real production worker and ESM/WASM assets, with only the
// browser worker messaging primitives adapted to Node. No native FFmpeg.
test("production WASM worker repacks MP4, extracts MP3, and reports invalid input", { timeout: 30_000 }, async () => {
  const assets = new URL("../dist/assets/", import.meta.url);
  const files = await readdir(assets);
  const find = (pattern: RegExp) => {
    const file = files.find((name) => pattern.test(name));
    assert.ok(file, `Missing built asset: ${pattern}`);
    return file;
  };
  const workerPath = find(/^worker-.*\.js$/);
  const corePath = find(/^ffmpeg-core-.*\.js$/);
  const wasmPath = find(/^ffmpeg-core-.*\.wasm$/);
  const server = createServer(async (req, res) => {
    if (req.url !== `/${wasmPath}`) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": "application/wasm" });
    res.end(await readFile(new URL(wasmPath, assets)));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const workerUrl = pathToFileURL(fileURLToPath(new URL(workerPath, assets))).href;
  const bootstrap = `
    import { parentPort } from 'node:worker_threads';
    globalThis.self = globalThis;
    self.location = { href: ${JSON.stringify(workerUrl)} };
    self.postMessage = (data) => parentPort.postMessage(data);
    await import(${JSON.stringify(workerUrl)});
    parentPort.on('message', (data) => self.onmessage({data}));
  `;
  const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`));
  let id = 0;
  const logs: string[] = [];
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  worker.on("message", (message) => {
    if (message.type === "LOG") logs.push(message.data.message);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.type === "ERROR") request.reject(new Error(String(message.data)));
    else request.resolve(message.data);
  });
  worker.on("error", (error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  });
  const send = (type: string, data: unknown) => new Promise<unknown>((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    worker.postMessage({ id: requestId, type, data });
  });
  const execute = (args: string[]) => send("EXEC", { args, timeout: 10_000 });
  try {
    await send("LOAD", { coreURL: new URL(corePath, assets).href, wasmURL: `${origin}/${wasmPath}` });
    assert.equal(await execute([
      "-f", "lavfi", "-i", "color=c=teal:s=32x32:d=0.2",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=0.2",
      "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "input.mkv",
    ]), 0);
    for (const format of ["mp4", "mp3"] as const) {
      const output = `output.${format}`;
      assert.equal(await execute(conversionArgs("input.mkv", output, format)), 0);
      const bytes = await send("READ_FILE", { path: output }) as Uint8Array;
      assert.ok(bytes.byteLength > 100, `${format} should contain media data`);
      logs.length = 0;
      assert.equal(await execute(["-i", output, "-f", "null", "-"]), 0, logs.slice(-12).join("\n"));
      assert.match(logs.join("\n"), format === "mp4" ? /Video: h264/ : /Audio: mp3/);
      await send("DELETE_FILE", { path: output });
    }
    await send("WRITE_FILE", { path: "invalid.media", data: new Uint8Array([1, 2, 3]) });
    assert.notEqual(await execute(conversionArgs("invalid.media", "bad.mp4", "mp4")), 0);
    await send("DELETE_FILE", { path: "input.mkv" });
    await send("DELETE_FILE", { path: "invalid.media" });
  } finally {
    await worker.terminate();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
