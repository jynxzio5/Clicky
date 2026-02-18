import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Background from "./components/Background";
import Controls from "./components/Controls";
import Macro from "./components/Macro";
import TitleBar from "./components/TitleBar";
import Overlay from "./components/Overlay";
import "./index.css";

type Page = "clicker" | "macro";

function App() {
  const [isOverlay, setIsOverlay] = useState(false);
  const [page, setPage] = useState<Page>("clicker");

  useEffect(() => {
    const label = getCurrentWindow().label;
    if (label === 'overlay') {
      setIsOverlay(true);
    }

    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        e.key === "F5" ||
        (e.ctrlKey && e.key === "r") ||
        (e.ctrlKey && e.shiftKey && e.key === "R") ||
        (e.ctrlKey && e.key === "p") ||
        (e.ctrlKey && e.key === "s")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isOverlay) {
    return <Overlay />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-yellow-500/30">
      <Background />
      <TitleBar page={page} setPage={setPage} />
      {page === "clicker" ? <Controls /> : <Macro />}
    </div>
  );
}

export default App;
