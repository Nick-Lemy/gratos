import { useState, useRef, useEffect, type FormEvent } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  forgetApiKey, getMediaInfo, prepareDownload, readApiKey, saveApiKey,
  YOINKU_ACCOUNT_URL, YOINKU_DOCS_URL,
  type MediaInfo, type MediaKind, type MediaDownload,
} from "../lib/yoinku";

type Status = "idle" | "loading-info" | "preparing";

export default function MediaGratos() {
  const [apiKey, setApiKey] = useState(readApiKey);
  const [showKey, setShowKey] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [kind, setKind] = useState<MediaKind>("video");
  const [format, setFormat] = useState("");
  const [download, setDownload] = useState<MediaDownload | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const busy = status !== "idle";

  useEffect(() => () => { request.current?.abort(); }, []);

  // Remove signed links when they expire, rather than leave a broken download.
  useEffect(() => {
    if (!download) return;
    const timer = setTimeout(() => {
      setDownload(null);
      setErrorMessage("This download link expired. Prepare a new download to continue.");
    }, Math.max(0, Math.min(download.expiresAt - Date.now(), 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [download]);

  const reset = () => {
    setInfo(null);
    setFormat("");
    setDownload(null);
    setErrorMessage("");
  };

  const handleSaveKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      saveApiKey(apiKey);
      setApiKey(apiKey.trim());
      setStorageMessage("Key saved on this browser.");
    } catch {
      setStorageMessage("This browser couldn't save your key. You can still use it for this visit.");
    }
  };

  const handleForgetKey = () => {
    setApiKey("");
    setShowKey(false);
    reset();
    try {
      forgetApiKey();
      setStorageMessage("Key removed from this browser.");
    } catch {
      setStorageMessage("Couldn't clear browser storage. Remove this site's saved data in your browser settings.");
    }
  };

  const run = async (nextStatus: Status, operation: (signal: AbortSignal) => Promise<void>) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setStatus(nextStatus);
    setErrorMessage("");
    setDownload(null);
    try {
      await operation(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setStatus("idle");
      }
    }
  };

  const handleGetFormats = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("loading-info", async (signal) => {
      setInfo(null);
      const result = await getMediaInfo(apiKey, videoUrl, signal);
      signal.throwIfAborted();
      setInfo(result);
      const initial = result.formats.find((item) => item.kind === "video") || result.formats[0];
      setKind(initial.kind);
      setFormat(initial.id);
    });
  };

  const handlePrepare = () => {
    if (!info?.formats.some((item) => item.id === format && item.kind === kind)) return;
    void run("preparing", async (signal) => {
      const result = await prepareDownload(apiKey, videoUrl, format, signal);
      signal.throwIfAborted();
      setDownload(result);
    });
  };

  const selectKind = (value: MediaKind) => {
    setKind(value);
    setFormat(info?.formats.find((item) => item.kind === value)?.id || "");
    setDownload(null);
    setErrorMessage("");
  };

  const formats = info?.formats.filter((item) => item.kind === kind) || [];
  const inputClass = "w-full min-w-0 bg-neutral-950 border border-neutral-700 rounded-sm py-3 px-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base disabled:opacity-50";
  const buttonClass = "w-full min-h-12 bg-teal-500 hover:bg-teal-600 text-neutral-950 font-semibold py-3 px-5 rounded-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400";

  return (
    <section className="min-h-dvh bg-neutral-950 font-inter text-neutral-200 px-5 py-12 sm:px-8 sm:py-20 lg:py-24">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="font-mileast-italic font-normal text-4xl mb-3 sm:text-6xl tracking-tight text-teal-400">MediaGratos</h1>
        <p className="text-neutral-400 text-sm sm:text-base max-w-md mb-8">
          Download video or audio from YouTube, Instagram, and TikTok.
        </p>

        <div className="w-full border-b border-neutral-800 pb-6 text-left mb-6">
          <h2 className="text-sm font-medium text-neutral-200">Your API key</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            <a href={YOINKU_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className="text-teal-400 underline underline-offset-2">Get a free key from Yoinku.</a>{" "}
            Sign in, open API keys, then create and paste your key below.
          </p>
          <form onSubmit={handleSaveKey} className="mt-4 space-y-3">
            <label htmlFor="yoinku-key" className="sr-only">Yoinku API key</label>
            <div className="relative">
              <input id="yoinku-key" type={showKey ? "text" : "password"} value={apiKey} required disabled={busy}
                onChange={(event) => { setApiKey(event.target.value); setStorageMessage(""); reset(); }}
                placeholder="Paste your API key" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="key-storage-help"
                className={`${inputClass} pr-14`} />
              <button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? "Hide API key" : "Show API key"} aria-pressed={showKey}
                className="absolute right-1 top-1 bottom-1 w-11 flex items-center justify-center text-neutral-400 hover:text-white rounded-sm focus-visible:outline-2 focus-visible:outline-teal-400">
                {showKey ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy || !apiKey.trim()} className="min-h-11 rounded-sm border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-400 disabled:opacity-50">Save key</button>
              <button type="button" onClick={handleForgetKey} disabled={busy} className="min-h-11 px-2 py-2 text-sm text-neutral-400 underline hover:text-white disabled:opacity-50">Forget key</button>
              <span role="status" className="text-xs text-neutral-400">{storageMessage}</span>
            </div>
            <p id="key-storage-help" className="text-xs leading-relaxed text-neutral-500">Save your key on this browser, or use it without saving. Your key is sent only to Yoinku.</p>
          </form>
          <p className="mt-4 text-xs text-neutral-500">Free plan: 5 downloads a day. <a href={YOINKU_DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-teal-400 underline">Details</a></p>
        </div>

        <form onSubmit={handleGetFormats} className="w-full text-left space-y-3">
          <label htmlFor="media-url" className="block text-sm text-neutral-300">Video or post link</label>
          <div>
            <input id="media-url" type="url" required disabled={busy} placeholder="Paste a YouTube, Instagram, or TikTok link" value={videoUrl}
              onChange={(event) => { setVideoUrl(event.target.value); reset(); }} className={inputClass} />
          </div>
          <button type="submit" disabled={busy || !apiKey.trim()} className={buttonClass}>
            {status === "loading-info" && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
            {status === "loading-info" ? "Finding formats…" : "Get download options"}
          </button>
          {!apiKey.trim() && <p className="text-xs text-neutral-500">Add your API key above to get started.</p>}
        </form>

        {info && (
          <div className="w-full mt-6 border-t border-neutral-800 pt-6 text-left space-y-4">
            <div>
              <p className="text-xs uppercase text-teal-400">{info.platform}</p>
              <h2 className="mt-1 font-semibold text-neutral-200 break-words">{info.title}</h2>
            </div>
            <div className="flex gap-6 border-b border-neutral-800">
              {(["video", "audio"] as const).map((value) => (
                <button key={value} type="button" disabled={busy || !info.formats.some((item) => item.kind === value)} aria-pressed={kind === value} onClick={() => selectKind(value)}
                  className={`min-h-11 border-b-2 px-1 py-2 text-sm font-medium disabled:opacity-40 ${kind === value ? "border-teal-400 text-teal-400" : "border-transparent text-neutral-400 hover:text-white"}`}>
                  {value === "video" ? "Video" : "Audio"}
                </button>
              ))}
            </div>
            <label htmlFor="media-format" className="block text-sm text-neutral-300">Quality & format</label>
            <select id="media-format" value={format} disabled={busy} onChange={(event) => { setFormat(event.target.value); setDownload(null); setErrorMessage(""); }} className={inputClass}>
              {formats.map((item) => <option key={item.id} value={item.id}>{item.quality}{item.container ? ` · ${item.container.toUpperCase()}` : ""}{item.kind === "video" && !item.hasAudio ? " · no audio" : ""}</option>)}
            </select>
            <button type="button" onClick={handlePrepare} disabled={busy || !format || Boolean(download)} className={buttonClass}>
              {status === "preparing" && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
              {status === "preparing" ? "Preparing your file…" : download ? "Download ready below" : "Prepare download"}
            </button>
            <p className="text-xs text-neutral-500">Preparing a file uses your Yoinku download allowance.</p>
          </div>
        )}

        {busy && <button type="button" onClick={() => request.current?.abort()} className="mt-3 min-h-11 px-4 text-sm text-neutral-400 underline hover:text-white">Cancel request</button>}
        <div className="w-full mt-5" role="status" aria-live="polite" aria-atomic="true">
          {download && (
            <div className="border-t border-neutral-800 pt-5 text-left text-sm text-neutral-200">
              <p>Your download is ready.</p>
              <a href={download.url} download={download.filename} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={`${buttonClass} mt-4`}>
                Download {kind === "audio" ? "audio" : "video"}
              </a>
              <p className="mt-3 break-words text-xs text-neutral-400">{download.filename}</p>
              <p className="mt-1 text-xs text-neutral-500">The link is temporary. If your browser opens the file, use its download or save option.</p>
            </div>
          )}
          {errorMessage && <p className="text-left text-sm leading-relaxed text-rose-400 break-words">{errorMessage}</p>}
        </div>
      </div>
    </section>
  );
}
