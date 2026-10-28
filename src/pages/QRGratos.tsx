import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type QRCodeStyling from "qr-code-styling";

export default function QRGratos() {
  const [url, setUrl] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const hasUrl = url.length > 0;

  // QR appearance
  const [dotsColor, setDotsColor] = useState<string>("#0f766e");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [dotsType, setDotsType] = useState<
    "rounded" | "dots" | "classy" | "square"
  >("square");
  const [cornersType, setCornersType] = useState<"square" | "dot" | "rounded">(
    "square",
  );

  // Ignore imports that finish after unmount or Strict Mode cleanup.
  useEffect(() => {
    let disposed = false;
    import("qr-code-styling").then((Module) => {
      if (disposed) return;
      const QRCodeStyling = Module.default;

      qrCodeInstance.current = new QRCodeStyling({
        width: 200,
        height: 200,
        type: "svg",
        data: " ",
      });

      setIsLibraryLoaded(true);
    }).catch(() => {
      if (!disposed) toast.error("Couldn't load the QR generator. Refresh to try again.");
    });
    return () => { disposed = true; qrCodeInstance.current = null; };
  }, []);

  // Attach the QR preview when its container is visible.
  useEffect(() => {
    if (isLibraryLoaded && qrCodeInstance.current && qrRef.current) {
      qrRef.current.innerHTML = "";
      qrCodeInstance.current.append(qrRef.current);
    }
  }, [isLibraryLoaded, hasUrl]);

  // Update the existing QR code as its content or appearance changes.
  useEffect(() => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.update({
        data: url || " ",
        dotsOptions: { color: dotsColor, type: dotsType },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornersType },
      });
    }
  }, [isLibraryLoaded, url, dotsColor, bgColor, dotsType, cornersType]);

  const handleDownload = async () => {
    if (!qrCodeInstance.current) return;
    try {
      await qrCodeInstance.current.download({
        name: `qrgratos-${Date.now()}`,
        extension: "png",
      });
      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Error saving QR code:", error);
      toast.error("Could not download the QR code.");
    }
  };

  return (
    <section className="min-h-dvh bg-neutral-950 font-inter text-neutral-200 px-5 py-12 sm:px-8 sm:py-20 lg:py-24">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="text-teal-400 font-mileast-italic font-normal text-4xl mb-3 sm:text-6xl">
          QRGratos
        </h1>
        <p className="text-neutral-400 text-sm mb-6 sm:text-base">
          Turn a link into a QR code. Choose its colors and style, then download.
        </p>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="text"
          aria-label="Link to turn into a QR code"
          className="w-full max-w-sm min-h-12 border border-neutral-700 rounded-sm px-4 py-3 text-white text-base bg-neutral-950 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Paste your link"
        />

        {url.length > 0 && (
          <div className="flex w-full max-w-sm flex-col items-center">
            <div className="mt-6 p-3 bg-white min-w-56 min-h-56 flex items-center justify-center">
              <div ref={qrRef} />
            </div>

            <div className="w-full mt-6 border-t border-neutral-800 pt-5 text-left text-neutral-200 text-sm space-y-4">
              <p className="font-medium text-neutral-200">
                Appearance
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qr-color" className="block mb-2 text-sm text-neutral-400">
                    QR color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="qr-color"
                      type="color"
                      value={dotsColor}
                      onChange={(e) => setDotsColor(e.target.value)}
                      className="size-11 shrink-0 border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs uppercase">{dotsColor}</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="qr-background" className="block mb-2 text-sm text-neutral-400">
                    Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="qr-background"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="size-11 shrink-0 border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs uppercase">{bgColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label htmlFor="qr-pattern" className="block mb-2 text-sm text-neutral-400">
                    Pattern
                  </label>
                  <select
                    id="qr-pattern"
                    value={dotsType}
                    onChange={(e) => setDotsType(e.target.value as typeof dotsType)}
                    className="w-full min-w-0 min-h-11 bg-neutral-950 text-white border border-neutral-700 rounded-sm px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="square">Square Blocks</option>
                    <option value="rounded">Smooth Fluid</option>
                    <option value="dots">Isolated Circles</option>
                    <option value="classy">Classy Diamond</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="qr-corners" className="block mb-2 text-sm text-neutral-400">
                    Corners
                  </label>
                  <select
                    id="qr-corners"
                    value={cornersType}
                    onChange={(e) => setCornersType(e.target.value as typeof cornersType)}
                    className="w-full min-w-0 min-h-11 bg-neutral-950 text-white border border-neutral-700 rounded-sm px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="square">Sharp Edges</option>
                    <option value="rounded">Rounded Ring</option>
                    <option value="dot">Circular Core</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={!isLibraryLoaded}
              className="mt-6 min-h-12 w-full px-5 py-3 bg-teal-500 text-base font-semibold text-neutral-950 rounded-sm hover:bg-teal-600 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400"
            >
              Download QR code
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
