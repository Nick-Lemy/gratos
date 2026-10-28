import assert from "node:assert/strict";
import { test } from "node:test";
import { checkFileSize, fetchMedia, MAX_MEDIA_BYTES, mediaUrl, safeFilename } from "../src/lib/media.ts";

const signal = () => new AbortController().signal;

test("social page links and playlists are rejected before a download", () => {
  for (const url of ["https://www.youtube.com/watch?v=abc", "https://youtu.be/abc", "https://m.tiktok.com/video/1", "https://instagram.com/reel/1", "https://example.com/live.m3u8"]) {
    assert.throws(() => mediaUrl(url));
  }
  for (const url of ["javascript:alert(1)", "file:///tmp/video.mp4", "https://user:secret@example.com/video.mp4"]) {
    assert.throws(() => mediaUrl(url));
  }
  assert.equal(mediaUrl(" https://example.com/video.mp4?token=123 ").pathname, "/video.mp4");
});

test("direct download preserves the original bytes and format", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(new Uint8Array([1, 2, 3, 4]), {
    headers: { "Content-Type": "video/mp4", "Content-Length": "4" },
  }));
  const progress: (number | null)[] = [];
  const file = await fetchMedia(new URL("https://example.com/my%20video.mp4"), signal(), (value) => progress.push(value));
  assert.equal(file.name, "my video.mp4");
  assert.equal(file.type, "video/mp4");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([1, 2, 3, 4]));
  assert.ok(progress.includes(99));
});

test("downloads without Content-Length work and get a usable filename", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(new Uint8Array([1, 2]), {
    headers: { "Content-Type": "audio/mpeg" },
  }));
  const progress: (number | null)[] = [];
  const file = await fetchMedia(new URL("https://example.com/download"), signal(), (value) => progress.push(value));
  assert.equal(file.name, "download.mp3");
  assert.ok(progress.every((value) => value === null));
});

test("webpages cannot be saved as fake video files", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>Page</html>", { headers: { "Content-Type": "text/html" } }));
  await assert.rejects(fetchMedia(new URL("https://example.com/page"), signal(), () => {}), /doesn't return a video or audio/);
});

test("oversized downloads are stopped before reading their bodies", async (t) => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  t.mock.method(globalThis, "fetch", async () => new Response(body, {
    headers: { "Content-Type": "video/mp4", "Content-Length": String(MAX_MEDIA_BYTES + 1) },
  }));
  await assert.rejects(fetchMedia(new URL("https://example.com/video.mp4"), signal(), () => {}), /200 MB/);
  assert.equal(cancelled, true);
  assert.throws(() => checkFileSize(0), /empty/);
});

test("CORS/network errors explain the local-file alternative", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(fetchMedia(new URL("https://example.com/video.mp4"), signal(), () => {}), /CORS/);
});

test("cancelling a fetch is preserved as cancellation", async (t) => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, "fetch", async () => { throw controller.signal.reason; });
  await assert.rejects(fetchMedia(new URL("https://example.com/video.mp4"), controller.signal, () => {}), { name: "AbortError" });
});

test("download filenames strip path separators and control characters", () => {
  assert.equal(safeFilename("clip/\u0000.mp4"), "clip__.mp4");
});
