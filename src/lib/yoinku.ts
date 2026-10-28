const API_BASE = "https://yoinku.com/api/v1";
export const YOINKU_ACCOUNT_URL = "https://yoinku.com/en/account";
export const YOINKU_DOCS_URL = "https://yoinku.com/en/api";
const KEY_STORAGE = "gratos.yoinku.api-key";

type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type MediaKind = "video" | "audio";
export interface MediaFormat {
  id: string;
  kind: MediaKind;
  container: string;
  quality: string;
  hasAudio: boolean;
}
export interface MediaInfo {
  title: string;
  platform: string;
  formats: MediaFormat[];
}
export interface MediaDownload {
  url: string;
  filename: string;
  expiresAt: number;
}

export function readApiKey(storage?: StorageAccess): string {
  try {
    return (storage ?? localStorage).getItem(KEY_STORAGE)?.trim() || "";
  } catch {
    return "";
  }
}

export function saveApiKey(key: string, storage: StorageAccess = localStorage) {
  if (!key.trim()) throw new Error("Paste your Yoinku API key first.");
  storage.setItem(KEY_STORAGE, key.trim());
}

export function forgetApiKey(storage: StorageAccess = localStorage) {
  storage.removeItem(KEY_STORAGE);
}

export function sourceUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new Error("Paste a valid YouTube, Instagram, or TikTok link."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Use an HTTP or HTTPS video link without embedded credentials.");
  }
  if (!["youtube.com", "youtu.be", "instagram.com", "tiktok.com"]
    .some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new Error("Yoinku currently supports YouTube, Instagram, and TikTok links.");
  }
  return url.href;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function apiError(status: number, retryAfter: string | null): string {
  if (status === 401 || status === 403) return "Yoinku didn't accept this API key. Check it or create a new one in your Yoinku account.";
  if (status === 429) {
    const seconds = Number(retryAfter);
    return `Your Yoinku rate limit or daily download quota has been reached.${seconds > 0 ? ` Try again in ${Math.ceil(seconds)} seconds.` : " Check your Yoinku account and try again later."}`;
  }
  if (status === 404 || status === 422) return "Yoinku couldn't find downloadable media at this link. Check that the post is public and still available.";
  if (status === 400) return "Yoinku couldn't use this link or format. Check the link and fetch the formats again.";
  return "Yoinku couldn't complete this request. Please try again later.";
}

async function request(
  endpoint: "info" | "download", key: string, params: Record<string, string>, signal: AbortSignal,
): Promise<Record<string, unknown>> {
  if (!key.trim()) throw new Error("Add your Yoinku API key above to get started.");
  signal.throwIfAborted();
  const url = new URL(`${API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-api-key": key.trim(), Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      // Never forward a user's key to a redirected endpoint.
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(90_000)]),
    });
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Yoinku took too long to respond. Please try again.");
    }
    throw new Error("Couldn't reach Yoinku. Check your connection and try again. Browser access may also be blocked by the provider.");
  }
  if (!response.ok) throw new Error(apiError(response.status, response.headers.get("Retry-After")));
  let data: Record<string, unknown>;
  try { data = object(await response.json()); }
  catch { throw new Error("Yoinku returned an unreadable response. Please try again later."); }
  if (data.ok !== true) {
    // Don't display raw provider messages that might echo credentials or HTML.
    throw new Error("Yoinku couldn't process this media. Check the link or try again later.");
  }
  return data;
}

export async function getMediaInfo(key: string, value: string, signal: AbortSignal): Promise<MediaInfo> {
  const payload = await request("info", key, { url: sourceUrl(value) }, signal);
  const data = object(payload.data);
  const formats: MediaFormat[] = [];
  if (Array.isArray(data.formats)) {
    for (const value of data.formats) {
      const format = object(value);
      if (typeof format.id !== "string" || !format.id || !["video", "audio"].includes(String(format.kind))) continue;
      formats.push({
        id: format.id,
        kind: format.kind as MediaKind,
        container: typeof format.container === "string" ? format.container : "",
        quality: typeof format.quality === "string" ? format.quality : format.id,
        hasAudio: format.hasAudio === true,
      });
    }
  }
  if (!formats.length) throw new Error("Yoinku found no video or audio formats for this link.");
  return {
    title: typeof data.title === "string" ? data.title : "Your media",
    platform: typeof data.platform === "string" ? data.platform : "",
    formats,
  };
}

export async function prepareDownload(key: string, value: string, format: string, signal: AbortSignal): Promise<MediaDownload> {
  const data = await request("download", key, { url: sourceUrl(value), format }, signal);
  let url: URL;
  try { url = new URL(String(data.url)); }
  catch { throw new Error("Yoinku didn't return a download link. Please try again."); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Yoinku returned an invalid download link.");
  const lifetime = typeof data.expiresInSeconds === "number" && data.expiresInSeconds > 0 ? data.expiresInSeconds : 3600;
  return {
    url: url.href,
    filename: typeof data.filename === "string" && data.filename ? data.filename : "mediagratos-download",
    expiresAt: Date.now() + lifetime * 1000,
  };
}
