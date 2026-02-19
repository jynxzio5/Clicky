import React, { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';
import { Activity, Power } from 'lucide-react';

const OVERLAY_POS_KEY = 'cliky_overlay_pos';

const Overlay: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [cps, setCps] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);

    // Load saved position and set up event listener
    useEffect(() => {
        const win = getCurrentWindow();
        win.setIgnoreCursorEvents(true).catch(console.error);

        const saved = localStorage.getItem(OVERLAY_POS_KEY);
        if (saved) {
            try {
                const { x, y } = JSON.parse(saved);
                win.setPosition(new LogicalPosition(x, y)).catch(console.error);
            } catch (_e) { /* ignore */ }
        }

        const unlisten = listen<{ running: boolean; cps: number; click_mode: string }>(
            'clicker-state-changed',
            (event) => {
                setIsRunning(event.payload.running);
                setCps(event.payload.cps);
            }
        );

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

    // Drag handlers
    const handleMouseEnter = useCallback(() => {
        const win = getCurrentWindow();
        win.setIgnoreCursorEvents(false).catch(console.error);
    }, []);

    const handleMouseLeave = useCallback(() => {
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
        <div
            className="w-full h-full flex items-center p-3 select-none bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl overflow-hidden relative group transition-all hover:border-white/10"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Drag Handle (Invisible but active on hover) */}
            <div
                className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
                onMouseDown={handleMouseDown}
            />

            {/* Content (Z-indexed above drag handle) */}
            <div className="relative z-10 flex items-center justify-between w-full pointer-events-none gap-4">

                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isRunning ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-zinc-800'}`}>
                        {isRunning ? <Activity className="w-5 h-5 text-white animate-pulse" /> : <Power className="w-5 h-5 text-zinc-500" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold tracking-wider ${isRunning ? 'text-white' : 'text-zinc-500'}`}>
                                {isRunning ? 'ACTIVE' : 'READY'}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold font-mono text-zinc-300 leading-none">{cps}</span>
                            <span className="text-[9px] font-bold text-zinc-600 uppercase">CPS</span>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-zinc-600 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-white/5">
                        INS TO HIDE
                    </span>
                </div>
            </div>

            {/* Decorative Glow */}
            {isRunning && (
                <div className="absolute top-[-50%] left-[-20%] w-[100px] h-[100px] bg-indigo-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
            )}
        </div>
    );
};

export default Overlay;
