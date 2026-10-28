import { useState } from "react";
import toast from "react-hot-toast";

export default function QRGratos() {
  const [url, setUrl] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrCodeUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = localUrl;
      link.download = `qrcode-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(localUrl);
      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Error saving QR code:", error);
      toast.error("Could not download the QR code.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <section className="min-h-lvh px-5 py-12 sm:px-8 sm:py-20 lg:py-32">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="text-white font-mileast-italic text-4xl mb-3 sm:text-6xl">
          QRGratos
        </h1>
        <p className="text-white font-inter text-base mb-5 sm:text-xl">
          Paste the link you want to tranform to a QR Code here!
        </p>
        <input
          onChange={(e) => {
            e.preventDefault();
            setUrl(e.target.value);
          }}
          type="text"
          aria-label="Link to turn into a QR code"
          className="border-2 w-full max-w-sm min-h-11 border-yellow-400 rounded-sm px-3 py-2 text-white font-inter italic text-base"
          placeholder="Enter your url"
        />
        {url.length > 0 && (
          <div className="flex w-full max-w-sm flex-col items-center">
            <img
              className="mt-5 h-auto w-37.5 max-w-full"
              src={qrCodeUrl}
              alt="QR Code Image"
            />
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-3 min-h-11 w-full px-4 py-2 bg-yellow-500 text-sm font-inter font-semibold text-white rounded hover:bg-yellow-600 disabled:opacity-50 sm:w-auto"
            >
              Download
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
