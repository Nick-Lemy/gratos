import { FFmpeg } from "@ffmpeg/ffmpeg";
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import { checkFileSize, conversionArgs, type OutputFormat } from "./media";

let engine: FFmpeg | undefined;
let loading: Promise<FFmpeg> | undefined;

export function releaseEngine() {
  engine?.terminate();
  engine = undefined;
  loading = undefined;
}

async function getEngine(signal: AbortSignal): Promise<FFmpeg> {
  signal.throwIfAborted();
  if (engine?.loaded) return engine;
  if (loading) return loading;
  const instance = new FFmpeg();
  engine = instance;
  loading = (async () => {
    // Same-origin, versioned assets use the browser's HTTP cache. No CDN or blob copies.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        instance.load({ coreURL, wasmURL }, { signal }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("The conversion engine took too long to load. Check your connection and try again.")), 90_000);
        }),
      ]);
      return instance;
    } catch (error) {
      if (engine === instance) releaseEngine();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  })();
  return loading;
}

export async function convertMedia(
  file: File,
  format: Exclude<OutputFormat, "original">,
  signal: AbortSignal,
  onStage: (stage: "loading" | "converting", progress: number | null) => void,
): Promise<File> {
  signal.throwIfAborted();
  checkFileSize(file.size);
  const cancel = () => releaseEngine();
  signal.addEventListener("abort", cancel, { once: true });
  let instance: FFmpeg | undefined;
  const suffix = file.name.match(/\.([a-z\d]{1,8})$/i)?.[1] || "media";
  const input = `input.${suffix}`;
  const output = `output.${format}`;
  const progress = ({ progress: value }: { progress: number }) => {
    if (Number.isFinite(value)) onStage("converting", Math.max(0, Math.min(99, Math.round(value * 100))));
  };
  try {
    if (!engine?.loaded) onStage("loading", null);
    instance = await getEngine(signal);
    signal.throwIfAborted();
    onStage("converting", null);
    instance.on("progress", progress);
    const bytes = new Uint8Array(await file.arrayBuffer());
    signal.throwIfAborted();
    await instance.writeFile(input, bytes);
    const code = await instance.exec(conversionArgs(input, output, format), 120_000);
    signal.throwIfAborted();
    if (code !== 0) {
      throw new Error(format === "mp3"
        ? "Couldn't create MP3 audio. Check that the file has an audio track, or try a shorter file."
        : "This file couldn't be repacked as MP4. Download the original format or try another source file.");
    }
    const data = await instance.readFile(output);
    if (typeof data === "string" || data.byteLength === 0) throw new Error("The conversion produced no media data.");
    return new File([new Uint8Array(data)], `${file.name.replace(/\.[^.]+$/, "")}.${format}`, {
      type: format === "mp3" ? "audio/mpeg" : "video/mp4",
    });
  } finally {
    signal.removeEventListener("abort", cancel);
    if (instance) {
      instance.off("progress", progress);
      if (instance.loaded && engine === instance) {
        await Promise.allSettled([instance.deleteFile(input), instance.deleteFile(output)]);
      }
    }
  }
}
