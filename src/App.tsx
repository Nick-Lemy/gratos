import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { lazy, Suspense } from "react";
import Home from "./pages/Home";

const QRGratos = lazy(() => import("./pages/QRGratos"));
const MediaGratos = lazy(() => import("./pages/MediaGratos"));

function App() {
  return (
    <BrowserRouter>
      <Toaster toastOptions={{
        style: { background: "#171717", color: "#e5e5e5", border: "1px solid #262626" },
        success: { iconTheme: { primary: "#34d399", secondary: "#171717" } },
      }} />
      <Suspense fallback={<div role="status" className="min-h-dvh flex items-center justify-center text-teal-400">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/qr" element={<QRGratos />} />
          <Route path="/media" element={<MediaGratos />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
