import React, { useState, useEffect, useCallback } from 'react';
import { Crosshair, Keyboard, Settings2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Card = ({ title, icon: Icon, children, className }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
    <div className={cn("bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-4 shadow-sm transition-all hover:border-zinc-700/50", className)}>
        <div className="flex items-center gap-2 mb-3 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-zinc-800/50">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        {children}
    </div>
);

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
        const mouseDownHandler = (e: MouseEvent) => { if (e.button > 2) e.preventDefault(); };
        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        window.addEventListener('mousedown', mouseDownHandler);
    }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full content-start">
            {/* Bindings Card */}
            <Card title="Macro Keybinds" icon={Keyboard} className="md:col-span-2">
                <div className="space-y-4">
                    {/* Part 1 */}
                    <div className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-xl border border-zinc-800/30">
                        <div>
                            <span className="text-sm font-bold text-zinc-200">Part 1</span>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Inv: Safe → Quick</div>
                        </div>
                        <button
                            onClick={() => handleKeyRecord('p1')}
                            className={cn(
                                "px-4 py-2 text-xs font-bold font-mono border rounded-lg transition-all min-w-[100px]",
                                recordingKey === 'p1' ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            {recordingKey === 'p1' ? "PRESS..." : part1Key}
                        </button>
                    </div>

                    {/* Part 2 */}
                    <div className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-xl border border-zinc-800/30">
                        <div>
                            <span className="text-sm font-bold text-zinc-200">Part 2</span>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Inv: Quick → Safe</div>
                        </div>
                        <button
                            onClick={() => handleKeyRecord('p2')}
                            className={cn(
                                "px-4 py-2 text-xs font-bold font-mono border rounded-lg transition-all min-w-[100px]",
                                recordingKey === 'p2' ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            {recordingKey === 'p2' ? "PRESS..." : part2Key}
                        </button>
                    </div>

                    {/* Dodge */}
                    <div className="flex items-center justify-between p-3 bg-zinc-950/30 rounded-xl border border-zinc-800/30">
                        <div>
                            <span className="text-sm font-bold text-zinc-200">Dodge Roll</span>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Animation Cancel</div>
                        </div>
                        <button
                            onClick={() => handleKeyRecord('dodge')}
                            className={cn(
                                "px-4 py-2 text-xs font-bold font-mono border rounded-lg transition-all min-w-[100px]",
                                recordingKey === 'dodge' ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            {recordingKey === 'dodge' ? "PRESS..." : dodgeKey}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Positions Card */}
            <Card title="Coordinates" icon={Crosshair}>
                <div className="space-y-4">
                    {/* Safe Pocket */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            <span>Safe Pocket</span>
                            <span className="text-zinc-600 font-mono">X:{safePocketPos.x} Y:{safePocketPos.y}</span>
                        </div>
                        <button
                            onClick={() => startCapture('safe_pocket')}
                            disabled={capturing !== null}
                            className={cn(
                                "w-full py-2.5 text-xs font-bold rounded-lg transition-all border",
                                capturing === 'safe_pocket'
                                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 animate-pulse"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                            )}
                        >
                            {capturing === 'safe_pocket' ? 'PRESS ANY KEY TO CAPTURE...' : 'Set Coordinate'}
                        </button>
                    </div>

                    {/* Quick Use */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            <span>Quick Use Slot</span>
                            <span className="text-zinc-600 font-mono">X:{quickUsePos.x} Y:{quickUsePos.y}</span>
                        </div>
                        <button
                            onClick={() => startCapture('quick_use')}
                            disabled={capturing !== null}
                            className={cn(
                                "w-full py-2.5 text-xs font-bold rounded-lg transition-all border",
                                capturing === 'quick_use'
                                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 animate-pulse"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                            )}
                        >
                            {capturing === 'quick_use' ? 'PRESS ANY KEY TO CAPTURE...' : 'Set Coordinate'}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Config Card */}
            <Card title="Configuration" icon={Settings2}>
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-zinc-400">Step Delay</span>
                            <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs font-bold font-mono">
                                {delayMs}ms
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={500}
                            step={10}
                            value={delayMs}
                            onChange={(e) => setDelayMs(parseInt(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                        />
                    </div>

                    <div className="pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-bold text-zinc-400">Macro Ready</span>
                            <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all",
                                positionsSet ? "bg-emerald-500 shadow-emerald-500/20" : "bg-red-500/50")}
                            />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-bold text-zinc-400">Status</span>
                            <span className={cn("text-xs font-bold tracking-wider uppercase", positionsSet ? "text-emerald-500" : "text-amber-500")}>
                                {positionsSet ? "OPERATIONAL" : "NEEDS CONFIG"}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Macro;
