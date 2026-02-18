import React, { useState, useEffect, useCallback } from 'react';
import { Crosshair, Keyboard, Settings2, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type CapturingTarget = 'safe_pocket' | 'quick_use' | null;

const Macro: React.FC = () => {
    const loadState = <T,>(key: string, defaultVal: T): T => {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            try { return JSON.parse(saved); } catch (_e) { return defaultVal; }
        }
        return defaultVal;
    };

    const [part1Key, setPart1Key] = useState(() => loadState('cliky_macro_p1', 'F7'));
    const [part2Key, setPart2Key] = useState(() => loadState('cliky_macro_p2', 'F8'));
    const [dodgeKey, setDodgeKey] = useState(() => loadState('cliky_macro_dodge', 'AltLeft'));
    const [safePocketPos, setSafePocketPos] = useState<{ x: number; y: number }>(() => loadState('cliky_macro_sp', { x: 0, y: 0 }));
    const [quickUsePos, setQuickUsePos] = useState<{ x: number; y: number }>(() => loadState('cliky_macro_qu', { x: 0, y: 0 }));
    const [delayMs, setDelayMs] = useState(() => loadState('cliky_macro_delay', 50));

    const [recordingKey, setRecordingKey] = useState<'p1' | 'p2' | 'dodge' | null>(null);
    const [capturing, setCapturing] = useState<CapturingTarget>(null);

    // Persist settings
    useEffect(() => {
        localStorage.setItem('cliky_macro_p1', JSON.stringify(part1Key));
        localStorage.setItem('cliky_macro_p2', JSON.stringify(part2Key));
        localStorage.setItem('cliky_macro_dodge', JSON.stringify(dodgeKey));
        localStorage.setItem('cliky_macro_sp', JSON.stringify(safePocketPos));
        localStorage.setItem('cliky_macro_qu', JSON.stringify(quickUsePos));
        localStorage.setItem('cliky_macro_delay', JSON.stringify(delayMs));
    }, [part1Key, part2Key, dodgeKey, safePocketPos, quickUsePos, delayMs]);

    // Push config to backend
    useEffect(() => {
        invoke('update_macro_config', {
            part1Key, part2Key, dodgeKey,
            safePocketX: safePocketPos.x, safePocketY: safePocketPos.y,
            quickUseX: quickUsePos.x, quickUseY: quickUsePos.y,
            delayMs,
        }).catch(console.error);
    }, [part1Key, part2Key, dodgeKey, safePocketPos, quickUsePos, delayMs]);

    // Key recording handler
    const handleKeyRecord = useCallback((target: 'p1' | 'p2' | 'dodge') => {
        setRecordingKey(target);

        const setKey = target === 'p1' ? setPart1Key : target === 'p2' ? setPart2Key : setDodgeKey;

        const cleanup = () => {
            window.removeEventListener('keyup', keyUpHandler);
            window.removeEventListener('keydown', keyDownHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
            window.removeEventListener('mousedown', mouseDownHandler);
        };

        const keyUpHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            setKey(e.code);
            setRecordingKey(null);
            cleanup();
        };

        const keyDownHandler = (e: KeyboardEvent) => { e.preventDefault(); };

        const mouseUpHandler = (e: MouseEvent) => {
            e.preventDefault();
            let key = "";
            switch (e.button) {
                case 3: key = "Mouse4"; break;
                case 4: key = "Mouse5"; break;
                case 2: key = "Mouse3"; break;
                default: return;
            }
            if (key) {
                setKey(key);
                setRecordingKey(null);
                cleanup();
            }
        };

        const mouseDownHandler = (e: MouseEvent) => {
            if (e.button > 2) e.preventDefault();
        };

        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        window.addEventListener('mousedown', mouseDownHandler);
    }, []);

    // Coordinate capture — waits for any key press globally, then grabs cursor position
    const startCapture = useCallback(async (target: CapturingTarget) => {
        if (capturing || !target) return;
        setCapturing(target);
        try {
            const [x, y] = await invoke<[number, number]>('capture_position');
            if (target === 'safe_pocket') {
                setSafePocketPos({ x, y });
            } else {
                setQuickUsePos({ x, y });
            }
        } catch (e) {
            console.error(e);
        }
        setCapturing(null);
    }, [capturing]);

    const positionsSet = safePocketPos.x !== 0 && safePocketPos.y !== 0 && quickUsePos.x !== 0 && quickUsePos.y !== 0;

    return (
        <div className="h-screen w-screen font-sans select-none overflow-hidden" data-tauri-drag-region>
            <div className="w-full h-full bg-[#0a0a0a]/90 backdrop-blur-md flex flex-col pointer-events-auto">

                {/* Spacer for TitleBar */}
                <div className="h-10 border-b border-zinc-800/50" />

                {/* Content */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">

                    {/* Section: MACRO KEYBINDS */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 space-y-3">
                        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
                            <Keyboard className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Macro Keybinds</span>
                        </div>

                        {/* Part 1 Key */}
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <span className="text-sm text-zinc-300 font-mono">Part 1</span>
                                <span className="text-[9px] text-zinc-600 ml-2">Safe → Quick</span>
                            </div>
                            <button
                                onClick={() => handleKeyRecord('p1')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-mono border rounded transition-all min-w-[90px] text-center",
                                    recordingKey === 'p1'
                                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                                )}
                            >
                                {recordingKey === 'p1' ? "PRESS..." : part1Key}
                            </button>
                        </div>

                        {/* Part 2 Key */}
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <span className="text-sm text-zinc-300 font-mono">Part 2</span>
                                <span className="text-[9px] text-zinc-600 ml-2">Quick → Safe</span>
                            </div>
                            <button
                                onClick={() => handleKeyRecord('p2')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-mono border rounded transition-all min-w-[90px] text-center",
                                    recordingKey === 'p2'
                                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                                )}
                            >
                                {recordingKey === 'p2' ? "PRESS..." : part2Key}
                            </button>
                        </div>

                        {/* Dodge Roll Key */}
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <span className="text-sm text-zinc-300 font-mono">Dodge Roll</span>
                                <span className="text-[9px] text-zinc-600 ml-2">For Part 2</span>
                            </div>
                            <button
                                onClick={() => handleKeyRecord('dodge')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-mono border rounded transition-all min-w-[90px] text-center",
                                    recordingKey === 'dodge'
                                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                                )}
                            >
                                {recordingKey === 'dodge' ? "PRESS..." : dodgeKey}
                            </button>
                        </div>
                    </div>

                    {/* Section: POSITIONS */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 space-y-3">
                        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
                            <Crosshair className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Positions</span>
                        </div>

                        {/* Safe Pocket Position */}
                        <div className="px-1 space-y-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Safe Pocket</span>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1 flex-1">
                                    <span className="text-[10px] text-zinc-600 font-mono w-3">X</span>
                                    <input
                                        type="number"
                                        value={safePocketPos.x}
                                        onChange={(e) => setSafePocketPos({ ...safePocketPos, x: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex items-center space-x-1 flex-1">
                                    <span className="text-[10px] text-zinc-600 font-mono w-3">Y</span>
                                    <input
                                        type="number"
                                        value={safePocketPos.y}
                                        onChange={(e) => setSafePocketPos({ ...safePocketPos, y: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => startCapture('safe_pocket')}
                                    disabled={capturing !== null}
                                    className={cn(
                                        "px-2 py-1 text-[10px] font-mono border rounded transition-all whitespace-nowrap",
                                        capturing === 'safe_pocket'
                                            ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse"
                                            : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-yellow-500 hover:border-yellow-500/50 disabled:opacity-30"
                                    )}
                                >
                                    {capturing === 'safe_pocket' ? 'PRESS KEY...' : '📍 Capture'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Use Position */}
                        <div className="px-1 space-y-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Quick Use Slot</span>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1 flex-1">
                                    <span className="text-[10px] text-zinc-600 font-mono w-3">X</span>
                                    <input
                                        type="number"
                                        value={quickUsePos.x}
                                        onChange={(e) => setQuickUsePos({ ...quickUsePos, x: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex items-center space-x-1 flex-1">
                                    <span className="text-[10px] text-zinc-600 font-mono w-3">Y</span>
                                    <input
                                        type="number"
                                        value={quickUsePos.y}
                                        onChange={(e) => setQuickUsePos({ ...quickUsePos, y: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => startCapture('quick_use')}
                                    disabled={capturing !== null}
                                    className={cn(
                                        "px-2 py-1 text-[10px] font-mono border rounded transition-all whitespace-nowrap",
                                        capturing === 'quick_use'
                                            ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse"
                                            : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-yellow-500 hover:border-yellow-500/50 disabled:opacity-30"
                                    )}
                                >
                                    {capturing === 'quick_use' ? 'PRESS KEY...' : '📍 Capture'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section: SETTINGS */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 space-y-3">
                        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
                            <Settings2 className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
                        </div>
                        <div className="px-1 space-y-1">
                            <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                                <span>Step Delay</span>
                                <span className="text-yellow-500">{delayMs}ms</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={500}
                                step={10}
                                value={delayMs}
                                onChange={(e) => setDelayMs(parseInt(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
                            />
                        </div>
                    </div>

                    {/* Section: STATUS */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4">
                        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2 mb-2">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Status</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 px-1">
                            <div className="flex items-center justify-between py-1">
                                <span className={cn("text-sm font-mono", positionsSet ? "text-white" : "text-zinc-500")}>Positions Configured</span>
                                <div className={cn("w-3 h-3 rounded-sm border", positionsSet
                                    ? "bg-yellow-500 border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                                    : "bg-transparent border-zinc-700"
                                )} />
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className={cn("text-sm font-mono", positionsSet ? "text-white" : "text-zinc-500")}>Macro Ready</span>
                                <div className={cn("w-3 h-3 rounded-sm border", positionsSet
                                    ? "bg-yellow-500 border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                                    : "bg-transparent border-zinc-700"
                                )} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="h-8 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between px-4 text-[10px] text-zinc-600 font-mono">
                    <span>BUILD: 2026.02.16</span>
                    <span>MACRO MODULE</span>
                </div>
            </div>
        </div>
    );
};

export default Macro;
