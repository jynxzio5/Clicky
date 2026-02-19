import { useEffect, useState } from "react";
import { Page as SidebarPage } from "./components/Sidebar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Controls from "./components/Controls";
import Macro from "./components/Macro";
import TitleBar from "./components/TitleBar";
import Overlay from "./components/Overlay";
import Layout from "./components/Layout";
import ClickerConfig from "./components/ClickerConfig";
import SettingsPage from "./components/SettingsPage";
import "./index.css";



function App() {
  const [isOverlay, setIsOverlay] = useState(false);
  const [page, setPage] = useState<SidebarPage>("home");

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
    <>
      <TitleBar />
      <Layout activePage={page} setPage={setPage}>
        {page === "home" && <Controls />}
        {page === "clicker" && <ClickerConfig />}
        {page === "macro" && <Macro />}
        {page === "settings" && <SettingsPage />}
      </Layout>
    </>
  );
}

export default App;
