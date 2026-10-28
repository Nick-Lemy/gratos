import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function QRGratos() {
  const [url, setUrl] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<any>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  // Design configuration states
  const [dotsColor, setDotsColor] = useState<string>("#EAB308");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [dotsType, setDotsType] = useState<
    "rounded" | "dots" | "classy" | "square"
  >("square");
  const [cornersType, setCornersType] = useState<"square" | "dot" | "rounded">(
    "square",
  );

  // 1. Core Lifecycle Setup: Instantiate ONLY once on mount to prevent canvas clearing issues
  useEffect(() => {
    import("qr-code-styling").then((Module) => {
      const QRCodeStyling = Module.default;

      qrCodeInstance.current = new QRCodeStyling({
        width: 200,
        height: 200,
        type: "svg",
        data: " ",
        dotsOptions: { color: dotsColor, type: dotsType },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornersType },
      });

      setIsLibraryLoaded(true);
    });
  }, []);

  // 2. DOM Mount Logic: Mount the canvas once the target container and library are both ready
  useEffect(() => {
    if (isLibraryLoaded && qrCodeInstance.current && qrRef.current) {
      qrRef.current.innerHTML = ""; // Safe single flush before initialization
      qrCodeInstance.current.append(qrRef.current);
    }
  }, [isLibraryLoaded, url.length > 0]); // Triggers cleanly when input content shows up

  // 3. Ultra-fast Live Updates: Use the library's native .update() method to change options smoothly without rewriting DOM nodes
  useEffect(() => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.update({
        data: url || " ",
        dotsOptions: { color: dotsColor, type: dotsType },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornersType },
      });
    }
  }, [url, dotsColor, bgColor, dotsType, cornersType]);

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
    <section className="min-h-lvh px-5 py-12 sm:px-8 sm:py-20 lg:py-32">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="text-white font-mileast-italic text-4xl mb-3 sm:text-6xl">
          QRGratos
        </h1>
        <p className="text-white font-inter text-base mb-5 sm:text-xl">
          Paste the link you want to transform to a QR Code here!
        </p>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="text"
          aria-label="Link to turn into a QR code"
          className="border-2 w-full max-w-sm min-h-11 border-yellow-400 rounded-sm px-3 py-2 text-white font-inter italic text-base bg-transparent focus:outline-none focus:ring-1 focus:ring-yellow-400"
          placeholder="Enter your url"
        />

        {url.length > 0 && (
          <div className="flex w-full max-w-sm flex-col items-center">
            {/* Real-time Render Target Container */}
            <div className="mt-6 p-3 bg-white rounded-md shadow-lg min-w-56 min-h-56 flex items-center justify-center">
              <div ref={qrRef} />
            </div>

            {/* Customization Control Dashboard */}
            <div className="w-full mt-6 p-4 border border-yellow-400/30 rounded-sm bg-black/30 text-left font-inter text-white text-sm space-y-4">
              <p className="font-semibold text-yellow-400 text-center border-b border-yellow-400/20 pb-2">
                Customize Design
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs text-gray-300">
                    QR Code Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dotsColor}
                      onChange={(e) => setDotsColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs uppercase">{dotsColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-xs text-gray-300">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs uppercase">{bgColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block mb-1 text-xs text-gray-300">
                    Pattern Style
                  </label>
                  <select
                    value={dotsType}
                    onChange={(e) => setDotsType(e.target.value as any)}
                    className="w-full bg-neutral-900 text-white border border-yellow-400/40 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="square">Square Blocks</option>
                    <option value="rounded">Smooth Fluid</option>
                    <option value="dots">Isolated Circles</option>
                    <option value="classy">Classy Diamond</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs text-gray-300">
                    Corner Targets
                  </label>
                  <select
                    value={cornersType}
                    onChange={(e) => setCornersType(e.target.value as any)}
                    className="w-full bg-neutral-900 text-white border border-yellow-400/40 rounded px-2 py-1 text-xs focus:outline-none"
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
              className="mt-5 min-h-11 w-full px-6 py-2 bg-yellow-500 text-sm font-inter font-semibold text-white rounded hover:bg-yellow-600 transition duration-200"
            >
              Download QR Code
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
