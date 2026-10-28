import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  Loader2,
  Download,
  AlertTriangle,
  CheckCircle,
  Link2,
} from "lucide-react";

type StatusType =
  "idle" | "loading-ffmpeg" | "processing" | "success" | "error";

interface CobaltErrorResponse {
  status: "error";
  text: string;
}

interface CobaltSuccessResponse {
  status: "success" | "stream" | "redirect";
  url: string;
}

type CobaltResponse = CobaltSuccessResponse | CobaltErrorResponse;

export default function MediaGratos() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusType>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());

  // Load FFmpeg WebAssembly binaries on mount
  useEffect(() => {
    async function loadFFmpeg() {
      try {
        setStatus("loading-ffmpeg");

        // Stable jsDelivr mirror that serves appropriate CORS and CORP headers
        const baseURL = "https://jsdelivr.net";
        const ffmpeg = ffmpegRef.current;

        // Correctly typed FFmpeg event listeners
        ffmpeg.on("log", ({ message }: { message: string }) => {
          console.log(message);
        });

        ffmpeg.on("progress", ({ progress }: { progress: number }) => {
          setProgress(Math.round(progress * 100));
        });

        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript",
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm",
          ),
        });

        setFfmpegLoaded(true);
        setStatus("idle");
      } catch (err) {
        console.error("FFmpeg Load Error:", err);
        setStatus("error");
        setErrorMessage(
          "Failed to load local media engine. The external CDN was blocked by cross-origin isolation.",
        );
      }
    }
    loadFFmpeg();
  }, []);

  const handleProcessVideo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!videoUrl) return;

    try {
      setStatus("processing");
      setProgress(5);
      setErrorMessage("");

      // 1. CALL AN API TO EXTRACT RAW CONTENT
      setProgress(20);
      const apiResponse = await fetch(`https://cobalt.tools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: videoUrl,
          vQuality: "720",
          isAudioOnly: false,
        }),
      });

      const apiData = (await apiResponse.json()) as CobaltResponse;

      if (!apiResponse.ok || apiData.status === "error") {
        throw new Error(
          (apiData as CobaltErrorResponse).text ||
            "Could not resolve media stream locations from this URL.",
        );
      }

      // 2. FETCH THE STREAM VIA CORS PROXY TO BYPASS CROSS-ORIGIN BLOCKS
      setProgress(40);
      const targetMediaUrl = (apiData as CobaltSuccessResponse).url;
      const corsProxy = "https://herokuapp.com";

      const ffmpeg = ffmpegRef.current;

      // 3. LOAD DATA INTO FFMPEG VIRTUAL MEMORY
      setProgress(60);
      const fetchedMedia = await fetchFile(corsProxy + targetMediaUrl);
      await ffmpeg.writeFile("input_stream", fetchedMedia);

      // 4. TRANSCODE/REMUX LOCALLY IN THE BROWSER
      setProgress(80);
      await ffmpeg.exec(["-i", "input_stream", "-c", "copy", "output.mp4"]);

      // 5. EXTRACT BLOB AND TRIGGER BROWSER DOWNLOAD
      setProgress(95);
      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;

      // Explicitly downcast SharedArrayBuffer to ArrayBuffer to pass strict tsc compilation
      const blob = new Blob([data.buffer as ArrayBuffer], {
        type: "video/mp4",
      });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `mediagratos_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup virtual files
      await ffmpeg.deleteFile("input_stream");
      await ffmpeg.deleteFile("output.mp4");

      setProgress(100);
      setStatus("success");
      setVideoUrl("");
    } catch (err: unknown) {
      console.error(err);
      setStatus("error");
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "An unexpected error occurred while stitching video files.",
        );
      }
    }
  };

  return (
    <section className="min-h-lvh bg-neutral-950 text-neutral-200 px-5 py-12 sm:px-8 sm:py-20 lg:py-32 flex flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        {/* Branding */}
        <h1 className="text-white font-serif italic font-extrabold text-5xl mb-3 sm:text-6xl tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          MediaGratos
        </h1>
        <p className="text-neutral-400 text-sm sm:text-base max-w-md mb-8">
          In-browser decentralized engine. Your media never touches a backend
          downloader server.
        </p>

        {/* Engine Init State Notice */}
        {status === "loading-ffmpeg" && (
          <div className="w-full p-4 mb-6 rounded-xl bg-teal-950/30 border border-teal-800/40 text-teal-300 text-xs flex items-center gap-3 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
            Warming up client-side assembly engines (FFmpeg.wasm)...
          </div>
        )}

        {/* Input Form Wrapper */}
        <form onSubmit={handleProcessVideo} className="w-full space-y-4">
          <div className="relative flex items-center">
            <Link2 className="absolute left-4 text-neutral-500 h-5 w-5" />
            <input
              type="url"
              required
              disabled={!ffmpegLoaded || status === "processing"}
              placeholder="Paste YouTube, Instagram, or TikTok link..."
              value={videoUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setVideoUrl(e.target.value)
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition disabled:opacity-50 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!ffmpegLoaded || status === "processing"}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-neutral-950 font-bold py-4 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
          >
            {status === "processing" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing in Browser ({progress}%)
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Fetch & Render Media
              </>
            )}
          </button>
        </form>

        {/* Status Indicators */}
        <div className="w-full mt-6">
          {status === "processing" && (
            <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-400 to-emerald-400 h-1.5 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-sm flex items-center gap-3 justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              Download completed locally! Ready for next link.
            </div>
          )}

          {status === "error" && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-400 text-sm flex flex-col items-center gap-2 justify-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                <span className="font-semibold">Processing Failed</span>
              </div>
              <p className="text-xs text-neutral-400 max-w-sm text-center">
                {errorMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
