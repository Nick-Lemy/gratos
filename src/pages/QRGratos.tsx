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
    <section className="bg-[#0064E2] h-screen py-32">
      <div className="justify-center flex flex-col items-center">
        <h1 className="text-white font-mileast-italic text-6xl mb-3">
          QRGratos
        </h1>
        <p className="text-white font-inter text-xl mb-5">
          Paste the link you want to tranform to a QR Code here!
        </p>
        <input
          onChange={(e) => {
            e.preventDefault();
            setUrl(e.target.value);
          }}
          type="text"
          className="border-2 w-sm border-yellow-400 rounded-sm px-2 py-2 text-white font-inter italic text-sm"
          placeholder="Enter your url"
        />
        {url.length > 0 && (
          <div>
            <img
              className="mt-5"
              src={qrCodeUrl}
              alt="QR Code Image"
            />
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-3 px-4 py-2 bg-yellow-500 text-sm font-inter font-semibold text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              Download
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
