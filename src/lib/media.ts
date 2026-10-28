export const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
export type OutputFormat = "original" | "mp4" | "mp3";

export function conversionArgs(input: string, output: string, format: "mp4" | "mp3") {
  if (format === "mp3") {
    return ["-i", input, "-map", "0:a:0", "-vn", "-c:a", "libmp3lame", "-b:a", "192k", output];
  }
  // Copy the tracks rather than spend minutes re-encoding video.
  return ["-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", "-movflags", "+faststart", output];
}

export function mediaUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid direct media URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Use an HTTP or HTTPS media URL without embedded credentials.");
  }
  const host = url.hostname.toLowerCase();
  if (["youtube.com", "youtu.be", "youtube-nocookie.com", "instagram.com", "tiktok.com"]
    .some((site) => host === site || host.endsWith(`.${site}`))) {
    throw new Error("This is a social media page, not a media file. This browser-only tool needs a direct video/audio URL or a file from your device.");
  }
  if (/\.m3u8$|\.mpd$/i.test(url.pathname)) {
    throw new Error("Streaming playlists aren't supported. Use a complete video or audio file.");
  }
  return url;
}

export function checkFileSize(size: number) {
  if (size > MAX_MEDIA_BYTES) throw new Error("Choose a file smaller than 200 MB.");
  if (size === 0) throw new Error("This file is empty.");
}

export function safeFilename(value: string): string {
  return Array.from(value, (char) => char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? "_" : char)
    .join("").slice(-180) || "mediagratos";
}

export async function fetchMedia(
  url: URL,
  signal: AbortSignal,
  onProgress: (percent: number | null) => void,
): Promise<File> {
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: "omit" });
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof TypeError) {
      throw new Error("Couldn't access this file. The source may block browser downloads (CORS). Download it yourself, then choose it from your device.");
    }
    throw error;
  }
  if (!response.ok) throw new Error(`The source returned HTTP ${response.status}. Try a fresh direct media link.`);

  const type = response.headers.get("Content-Type")?.split(";")[0].trim() || "application/octet-stream";
  if (!/^(audio|video)\//.test(type) && !["application/octet-stream", "binary/octet-stream"].includes(type)) {
    await response.body?.cancel();
    throw new Error("This URL doesn't return a video or audio file. Use a direct media link, not a webpage or playlist.");
  }

  const length = Number(response.headers.get("Content-Length")) || 0;
  if (length > MAX_MEDIA_BYTES) {
    await response.body?.cancel();
    checkFileSize(length);
  }
  if (!response.body) throw new Error("The source returned no media data.");
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  onProgress(null);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      checkFileSize(received);
      chunks.push(value);
      onProgress(length ? Math.min(99, Math.round(received / length * 100)) : null);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  signal.throwIfAborted();
  checkFileSize(received);
  let filename = "mediagratos";
  try {
    filename = decodeURIComponent(new URL(response.url || url.href).pathname.split("/").pop() || filename);
  } catch { /* Keep the fallback for malformed source filenames. */ }
  if (!/\.[a-z\d]{2,5}$/i.test(filename)) {
    const extensions: Record<string, string> = {
      "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
      "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav",
    };
    if (extensions[type]) filename += `.${extensions[type]}`;
  }
  return new File(chunks, safeFilename(filename), { type });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename(name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to begin reading the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
