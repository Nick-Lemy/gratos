import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import QRGratos from "./pages/QRGratos";
import MediaGratos from "./pages/MediaGratos";

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/qr" element={<QRGratos />} />
        <Route path="/media" element={<MediaGratos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
