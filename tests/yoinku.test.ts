import assert from "node:assert/strict";
import { test } from "node:test";
import { forgetApiKey, getMediaInfo, prepareDownload, readApiKey, saveApiKey, sourceUrl } from "../src/lib/yoinku.ts";

const signal = () => new AbortController().signal;
const video = "https://www.youtube.com/watch?v=example&list=test";
const key = "gratos-fixture-key";
const info = {
  ok: true,
  data: {
    title: "Test video", platform: "youtube",
    formats: [
      { id: "v-720", kind: "video", container: "mp4", quality: "720p", hasAudio: true },
      { id: "a-mp3", kind: "audio", container: "mp3", quality: "MP3", hasAudio: true },
    ],
  },
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => { values.set(name, value); },
    removeItem: (name: string) => { values.delete(name); },
  };
}

test("a user's key can be saved, restored, and forgotten", () => {
  const storage = memoryStorage();
  assert.equal(readApiKey(storage), "");
  saveApiKey(` ${key} `, storage);
  assert.equal(readApiKey(storage), key);
  forgetApiKey(storage);
  assert.equal(readApiKey(storage), "");
  assert.throws(() => saveApiKey(" ", storage), /Paste/);
});

test("blocked browser storage does not prevent using the page", () => {
  const storage = {
    getItem() { throw new Error("Storage disabled"); },
    setItem() { throw new Error("Storage disabled"); },
    removeItem() { throw new Error("Storage disabled"); },
  };
  assert.equal(readApiKey(storage), "");
  assert.throws(() => saveApiKey(key, storage));
  assert.throws(() => forgetApiKey(storage));
});

test("supported social page links are accepted", () => {
  for (const value of [video, "https://youtu.be/example", "https://www.instagram.com/reel/example", "https://vm.tiktok.com/example"]) {
    assert.ok(sourceUrl(value).startsWith("https://"));
  }
});

test("unsupported hosts, embedded credentials, and non-web URLs are rejected", () => {
  for (const value of ["https://youtube.com.evil.test/watch?v=x", "javascript:alert(1)", "file:///video.mp4", "https://user:password@youtube.com/watch?v=x", "not a url"]) {
    assert.throws(() => sourceUrl(value));
  }
});

test("format lookup sends the key only in the provider header", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    assert.equal(url.origin, "https://yoinku.com");
    assert.equal(url.pathname, "/api/v1/info");
    assert.equal(url.searchParams.get("url"), video);
    assert.ok(!url.href.includes(key));
    assert.equal((options.headers as Record<string, string>)["x-api-key"], key);
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    return Response.json(info);
  });
  const result = await getMediaInfo(` ${key} `, video, signal());
  assert.equal(result.title, "Test video");
  assert.equal(result.formats[0].id, "v-720");
  assert.equal(result.formats[1].kind, "audio");
  assert.equal(mock.mock.callCount(), 1);
});

test("a key is required before making any request", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json(info));
  await assert.rejects(getMediaInfo(" ", video, signal()), /API key/);
  assert.equal(mock.mock.callCount(), 0);
});

test("preparing a download uses the selected provider format and returns an expiring link", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/api/v1/download");
    assert.equal(url.searchParams.get("format"), "a-mp3");
    assert.equal(url.searchParams.get("url"), video);
    return Response.json({ ok: true, url: "https://media.example.test/file.mp3?token=abc", filename: "clip.mp3", expiresInSeconds: 300 });
  });
  const before = Date.now();
  const result = await prepareDownload(key, video, "a-mp3", signal());
  assert.equal(result.filename, "clip.mp3");
  assert.ok(result.expiresAt >= before + 300_000);
  assert.equal(result.url, "https://media.example.test/file.mp3?token=abc");
});

test("invalid and non-HTTPS provider download links are rejected", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  for (const url of ["javascript:alert(1)", "http://example.com/file", "https://user:password@example.com/file", "bad-url"]) {
    mock.mock.mockImplementation(async () => Response.json({ ok: true, url }));
    await assert.rejects(prepareDownload(key, video, "v-720", signal()), /download link/);
  }
});

test("expired or invalid keys show an actionable error without echoing secrets", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: `invalid ${key}` } }, { status: 401 }));
  await assert.rejects(getMediaInfo(key, video, signal()), (error: Error) => {
    assert.match(error.message, /API key/);
    assert.ok(!error.message.includes(key));
    return true;
  });
});

test("rate limits report the provider's retry interval", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: 429, headers: { "Retry-After": "60" } }));
  await assert.rejects(getMediaInfo(key, video, signal()), /60 seconds/);
});

test("missing or private content has a useful error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: 422 }));
  await assert.rejects(getMediaInfo(key, video, signal()), /public and still available/);
});

test("empty or malformed format responses cannot produce a download button", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true, data: { formats: [{ id: "bad", kind: "image" }] } }));
  await assert.rejects(getMediaInfo(key, video, signal()), /no video or audio formats/);
});

test("non-JSON and unsuccessful responses do not crash the page or expose provider messages", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("<html>Error</html>"));
  await assert.rejects(getMediaInfo(key, video, signal()), /unreadable/);
  mock.mock.mockImplementation(async () => Response.json({ ok: false, error: { message: key } }));
  await assert.rejects(getMediaInfo(key, video, signal()), (error: Error) => !error.message.includes(key));
});

test("network failures are explained without exposing raw request details", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError(`Failed with key ${key}`); });
  await assert.rejects(getMediaInfo(key, video, signal()), (error: Error) => {
    assert.match(error.message, /Couldn't reach Yoinku/);
    assert.ok(!error.message.includes(key));
    return true;
  });
});

test("cancellation is preserved", async (t) => {
  const controller = new AbortController();
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json(info));
  controller.abort();
  await assert.rejects(getMediaInfo(key, video, controller.signal), { name: "AbortError" });
  assert.equal(mock.mock.callCount(), 0);
});
