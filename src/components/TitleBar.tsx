import React from 'react';
import { X, Minus } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TitleBar: React.FC = () => {
    const appWindow = getCurrentWindow();

    return (
        <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-10 flex items-center justify-end px-4 z-[100] select-none">
            {/* Window Controls */}
            <div className="flex items-center space-x-2">
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
