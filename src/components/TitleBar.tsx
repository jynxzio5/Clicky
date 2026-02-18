import React from 'react';
import { X, Minus, Mouse, Cpu } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type Page = "clicker" | "macro";

interface TitleBarProps {
    page: Page;
    setPage: (page: Page) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ page, setPage }) => {
    const appWindow = getCurrentWindow();

    return (
        <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-4 z-50 select-none bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800">
            {/* Logo */}
            <div className="flex items-center space-x-2 pointer-events-none">
                <span className="text-sm font-bold tracking-tight text-yellow-500">CLICKY <span className="text-zinc-300 font-normal">BY JNX</span></span>
            </div>

            {/* Tab Buttons */}
            <div className="flex items-center space-x-1 bg-zinc-800/50 rounded-md p-0.5">
                <button
                    onClick={() => setPage("clicker")}
                    className={cn(
                        "flex items-center space-x-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all",
                        page === "clicker"
                            ? "bg-yellow-500/15 text-yellow-500"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <Mouse className="w-3 h-3" />
                    <span>Clicker</span>
                </button>
                <button
                    onClick={() => setPage("macro")}
                    className={cn(
                        "flex items-center space-x-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all",
                        page === "macro"
                            ? "bg-yellow-500/15 text-yellow-500"
                            : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <Cpu className="w-3 h-3" />
                    <span>Macro</span>
                </button>
            </div>

            {/* Window Controls */}
            <div className="flex items-center space-x-1">
                <button
                    onClick={() => appWindow.minimize()}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <button
                    onClick={() => appWindow.close()}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
