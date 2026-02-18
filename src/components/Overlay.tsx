import React, { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';

const OVERLAY_POS_KEY = 'cliky_overlay_pos';

const Overlay: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [cps, setCps] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);

    // Load saved position and set up event listener
    useEffect(() => {
        const win = getCurrentWindow();

        // Set click-through by default
        win.setIgnoreCursorEvents(true).catch(console.error);

        // Restore saved position
        const saved = localStorage.getItem(OVERLAY_POS_KEY);
        if (saved) {
            try {
                const { x, y } = JSON.parse(saved);
                win.setPosition(new LogicalPosition(x, y)).catch(console.error);
            } catch (_e) { /* ignore */ }
        }

        // Listen for state changes from backend (replaces polling)
        const unlisten = listen<{ running: boolean; cps: number; click_mode: string }>(
            'clicker-state-changed',
            (event) => {
                setIsRunning(event.payload.running);
                setCps(event.payload.cps);
            }
        );

        // Initial state fetch
        invoke<[boolean, number, number, boolean, string, string]>('get_clicker_state')
            .then(([running, currentCps]) => {
                setIsRunning(running);
                setCps(currentCps);
            })
            .catch(console.error);

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    // Drag handlers — enable interaction on the drag handle area
    const handleDragHandleEnter = useCallback(() => {
        const win = getCurrentWindow();
        win.setIgnoreCursorEvents(false).catch(console.error);
    }, []);

    const handleDragHandleLeave = useCallback(() => {
        if (!isDragging) {
            const win = getCurrentWindow();
            win.setIgnoreCursorEvents(true).catch(console.error);
        }
    }, [isDragging]);

    const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        const win = getCurrentWindow();
        try {
            const pos = await win.outerPosition();
            dragRef.current = {
                startX: e.screenX,
                startY: e.screenY,
                winX: pos.x,
                winY: pos.y,
            };
            setIsDragging(true);
        } catch (_e) { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = async (e: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = e.screenX - dragRef.current.startX;
            const dy = e.screenY - dragRef.current.startY;
            const newX = dragRef.current.winX + dx;
            const newY = dragRef.current.winY + dy;

            const win = getCurrentWindow();
            try {
                await win.setPosition(new LogicalPosition(newX, newY));
            } catch (_e) { /* ignore */ }
        };

        const handleMouseUp = async () => {
            setIsDragging(false);
            dragRef.current = null;
            const win = getCurrentWindow();
            try {
                const pos = await win.outerPosition();
                localStorage.setItem(OVERLAY_POS_KEY, JSON.stringify({ x: pos.x, y: pos.y }));
                // Re-enable click-through
                await win.setIgnoreCursorEvents(true);
            } catch (_e) { /* ignore */ }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div className="w-full h-full flex flex-col items-start font-mono text-xs select-none bg-black/40 backdrop-blur-sm rounded-br-lg border-b border-r border-white/10 shadow-lg">
            {/* Drag handle — this area is interactive */}
            <div
                className="w-full h-3 cursor-grab active:cursor-grabbing flex items-center justify-center"
                onMouseEnter={handleDragHandleEnter}
                onMouseLeave={handleDragHandleLeave}
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-[2px] bg-zinc-600 rounded-full" />
            </div>

            {/* Status content — click-through */}
            <div className="px-2 pb-2 pointer-events-none">
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
                    <span className={`font-bold ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
                        {isRunning ? 'ACTIVE' : 'READY'}
                    </span>
                </div>
                <div className="mt-1 text-zinc-300">
                    <span className="text-zinc-500">CPS:</span> {cps}
                </div>
                <div className="text-[9px] text-zinc-600 mt-0.5">
                    [INS] MENU
                </div>
            </div>
        </div>
    );
};

export default Overlay;
