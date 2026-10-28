import { useState, useRef, useEffect, type FormEvent } from "react";
import { Loader2, Download, AlertTriangle, CheckCircle, Link2, Upload } from "lucide-react";
import { checkFileSize, downloadBlob, fetchMedia, mediaUrl, type OutputFormat } from "../lib/media";

type Status = "idle" | "fetching" | "loading" | "converting" | "success" | "error";

export default function MediaGratos() {
  const [source, setSource] = useState<"link" | "file">("link");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<OutputFormat>("original");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const engineModule = useRef<typeof import("../lib/media-engine") | null>(null);
  const busy = ["fetching", "loading", "converting"].includes(status);

  useEffect(() => () => {
    request.current?.abort();
    engineModule.current?.releaseEngine();
  }, []);

  const handleProcess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setErrorMessage("");
    setProgress(null);
    try {
      let input: File;
      if (source === "file") {
        if (!file) throw new Error("Choose a video or audio file first.");
        checkFileSize(file.size);
        input = file;
      } else {
        const url = mediaUrl(videoUrl);
        setStatus("fetching");
        input = await fetchMedia(url, controller.signal, setProgress);
      }
      controller.signal.throwIfAborted();
      let result = input;
      if (format !== "original") {
        setStatus("loading");
        const module = await import("../lib/media-engine");
        controller.signal.throwIfAborted();
        engineModule.current = module;
        result = await module.convertMedia(input, format, controller.signal, (stage, percent) => {
          setStatus(stage);
          setProgress(percent);
        });
      }
      controller.signal.throwIfAborted();
      downloadBlob(result, result.name);
      setProgress(100);
      setStatus("success");
    } catch (error) {
      if (!controller.signal.aborted) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Couldn't process this file. Please try again.");
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  };

  const cancel = () => {
    request.current?.abort();
    // Keep the operation locked until its cleanup has completed.
    setStatus("idle");
    setProgress(null);
  };

  const statusLabel = status === "fetching" ? "Downloading source file"
    : status === "loading" ? "Loading conversion engine (first use: about 31 MB)"
    : "Converting on your device";

  return (
    <section className="min-h-dvh bg-neutral-950 text-neutral-200 px-5 py-12 sm:px-8 sm:py-20 lg:py-32 flex flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="font-serif italic font-extrabold text-4xl mb-3 sm:text-6xl tracking-tight text-teal-400">
          MediaGratos
        </h1>
        <p className="text-neutral-400 text-sm sm:text-base max-w-md mb-8">
          Download a direct media link or convert a file from your device. Files are processed in your browser, without uploads.
        </p>

        <form onSubmit={handleProcess} className="w-full space-y-4 text-left">
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
            <legend className="sr-only">Media source and output format</legend>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-1">
              {(["link", "file"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={source === value}
                  onClick={() => { if (value !== source) { setSource(value); setFile(null); setStatus("idle"); } }}
                  className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-teal-400 ${source === value ? "bg-teal-950 text-teal-300" : "text-neutral-400 hover:text-neutral-200"}`}>
                  {value === "link" ? "Direct link" : "From device"}
                </button>
              ))}
            </div>

            {source === "link" ? (
              <div>
                <label htmlFor="media-url" className="block text-sm text-neutral-300 mb-2">Video or audio URL</label>
                <div className="relative flex items-center">
                  <Link2 aria-hidden="true" className="absolute left-4 text-neutral-500 h-5 w-5" />
                  <input id="media-url" type="url" required placeholder="https://example.com/video.mp4" value={videoUrl}
                    onChange={(e) => { setVideoUrl(e.target.value); setStatus("idle"); }} aria-describedby="source-help"
                    className="w-full min-w-0 bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base" />
                </div>
                <p id="source-help" className="mt-2 text-xs leading-relaxed text-neutral-500">
                  Use a direct file link that allows browser downloads. YouTube, Instagram, and TikTok page links aren't supported.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <label htmlFor="media-file" className="flex items-center gap-2 text-sm text-neutral-300 mb-3"><Upload aria-hidden="true" className="h-4 w-4 text-teal-400" />Choose a video or audio file</label>
                <input id="media-file" type="file" accept="video/*,audio/*,.mkv,.avi,.mov,.flac,.m4a,.ogg,.wav" required
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setStatus("idle"); }}
                  className="block w-full min-w-0 text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-950 file:px-3 file:py-3 file:text-teal-300 focus-visible:outline-2 focus-visible:outline-teal-400" />
                {file && <p className="mt-2 break-all text-xs text-neutral-500">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
              </div>
            )}

            <div>
              <label htmlFor="output-format" className="block text-sm text-neutral-300 mb-2">Download format</label>
              <select id="output-format" value={format} onChange={(e) => { setFormat(e.target.value as OutputFormat); setStatus("idle"); }}
                className="w-full min-h-12 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="original">Original · fastest</option>
                <option value="mp4">MP4 video · keep original quality</option>
                <option value="mp3">MP3 audio</option>
              </select>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {format === "original" ? "No conversion engine needed. Download the file in its original format."
                  : format === "mp4" ? "Keeps existing video quality. Some source formats may not be compatible with MP4."
                  : "Extracts the audio track as an MP3. The source must contain audio."}
              </p>
            </div>

            <button type="submit"
              className="w-full bg-teal-500 hover:bg-teal-600 text-neutral-950 font-bold py-4 px-6 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400">
              {busy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Download aria-hidden="true" className="h-5 w-5" />}
              {busy ? "Working…" : format === "original" ? "Download media" : "Convert & download"}
            </button>
          </fieldset>
          <p className="text-center text-xs text-neutral-500">Up to 200 MB per file. The conversion engine loads only when needed.</p>
        </form>

        <div className="w-full mt-6" role="status" aria-live="polite">
          {busy && (
            <div className="space-y-3">
              <p className="text-sm text-teal-300">{statusLabel}{progress !== null && status !== "loading" ? ` (${progress}%)` : "…"}</p>
              <div role="progressbar" aria-label={statusLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined}
                className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                <div className={`bg-teal-400 h-1.5 transition-all ${progress === null ? "w-full animate-pulse" : ""}`} style={progress !== null ? { width: `${progress}%` } : undefined} />
              </div>
              <button type="button" onClick={cancel} className="min-h-11 px-4 text-sm text-neutral-400 underline hover:text-white">Cancel</button>
            </div>
          )}
          {status === "success" && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-sm flex items-center gap-3 justify-center">
              <CheckCircle aria-hidden="true" className="h-5 w-5 shrink-0" />Your file is ready. Download started!
            </div>
          )}
          {status === "error" && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-400 text-sm flex items-start gap-3 text-left">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" /><p className="break-words">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
