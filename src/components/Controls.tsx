import React, { useState, useEffect } from 'react';
import { Activity, Keyboard, Settings2, Mouse } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Slider = ({ label, value, min, max, onChange, unit }: { label: string, value: number, min: number, max: number, onChange: (val: number) => void, unit?: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            <span>{label}</span>
            <span className="text-yellow-500">{value}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
        />
    </div>
);

const ToggleRow = ({ label, active }: { label: string, active: boolean }) => (
    <div className="flex items-center justify-between py-1">
        <span className={cn("text-sm font-mono", active ? "text-white" : "text-zinc-500")}>{label}</span>
        <div className={cn("w-3 h-3 rounded-sm border", active ? "bg-yellow-500 border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "bg-transparent border-zinc-700")} />
    </div>
);

const CLICK_MODES = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'double', label: 'Double' },
] as const;

const Controls: React.FC = () => {
    const loadState = <T,>(key: string, defaultVal: T): T => {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            try { return JSON.parse(saved); } catch (_e) { return defaultVal; }
        }
        return defaultVal;
    }

    const [isRunning, setIsRunning] = useState(false);
    const [cps, setCps] = useState(() => loadState('cliky_cps', 10));
    const [randomness, setRandomness] = useState(() => loadState('cliky_randomness', 0));
    const [humanizationEnabled, setHumanizationEnabled] = useState(() => loadState('cliky_humanization', true));
    const [toggleKey, setToggleKey] = useState(() => loadState('cliky_key', 'F6'));
    const [clickMode, setClickMode] = useState(() => loadState('cliky_click_mode', 'left'));
    const [isRecordingKey, setIsRecordingKey] = useState(false);

    // Persist settings to localStorage
    useEffect(() => {
        localStorage.setItem('cliky_cps', JSON.stringify(cps));
        localStorage.setItem('cliky_randomness', JSON.stringify(randomness));
        localStorage.setItem('cliky_humanization', JSON.stringify(humanizationEnabled));
        localStorage.setItem('cliky_key', JSON.stringify(toggleKey));
        localStorage.setItem('cliky_click_mode', JSON.stringify(clickMode));
    }, [cps, randomness, humanizationEnabled, toggleKey, clickMode]);

    // Event-driven state sync from backend (replaces polling)
    useEffect(() => {
        const unlisten = listen<{ running: boolean; cps: number; click_mode: string }>(
            'clicker-state-changed',
            (event) => {
                setIsRunning(event.payload.running);
            }
        );

        // Initial state fetch on mount
        invoke<[boolean, number, number, boolean, string, string]>('get_clicker_state')
            .then(([running]) => setIsRunning(running))
            .catch(console.error);

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    // Push config updates to backend
    useEffect(() => {
        invoke('update_config', { cps, randomness, humanizationEnabled, toggleKey, clickMode }).catch(console.error);
    }, [cps, randomness, humanizationEnabled, toggleKey, clickMode]);

    const handleKeyRecord = () => {
        setIsRecordingKey(true);

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
                setToggleKey(key);
                setIsRecordingKey(false);
                cleanup();
            }
        };

        const cleanup = () => {
            window.removeEventListener('keyup', keyUpHandler);
            window.removeEventListener('keydown', keyDownHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
            window.removeEventListener('mousedown', mouseDownHandler);
        };

        const keyUpHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            setToggleKey(e.code);
            setIsRecordingKey(false);
            cleanup();
        };

        const keyDownHandler = (e: KeyboardEvent) => {
            e.preventDefault();
        };

        const mouseDownHandler = (e: MouseEvent) => {
            if (e.button > 2) e.preventDefault();
        };

        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        window.addEventListener('mousedown', mouseDownHandler);
    };

    const [isListening, setIsListening] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(null);

    useEffect(() => {
        let recognition: any = null;

        if (isListening) {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                // @ts-ignore
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onstart = () => {
                    setSpeechError(null);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setSpeechError(event.error);
                    if (event.error === 'not-allowed') {
                        setIsListening(false);
                    }
                };

                recognition.onend = () => {
                    if (isListening) {
                        try { recognition.start(); } catch (_e) { }
                    }
                };

                recognition.onresult = async (event: any) => {
                    const last = event.results.length - 1;
                    const command = event.results[last][0].transcript.trim().toLowerCase();
                    console.log("Voice command:", command);

                    if (command.includes('start') || command.includes('go') || command.includes('enable')) {
                        if (!isRunning) {
                            await invoke('toggle_clicker');
                        }
                    } else if (command.includes('stop') || command.includes('halt') || command.includes('disable') || command.includes('off')) {
                        if (isRunning) {
                            await invoke('toggle_clicker');
                        }
                    } else if (command === 'clicky on') {
                        if (!isRunning) await invoke('toggle_clicker');
                    } else if (command === 'clicky off') {
                        if (isRunning) await invoke('toggle_clicker');
                    }
                };

                try {
                    recognition.start();
                } catch (e) {
                    console.error(e);
                }
            } else {
                setSpeechError("Not Supported");
                setIsListening(false);
            }
        }

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [isListening, isRunning]);

    return (
        <div className="h-screen w-screen font-sans select-none overflow-hidden" data-tauri-drag-region>
            <div className="w-full h-full bg-[#0a0a0a]/90 backdrop-blur-md flex flex-col pointer-events-auto">

                {/* Spacer for TitleBar */}
                <div className="h-10 border-b border-zinc-800/50" />

                {/* Content */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">

                    {/* Section: CLICKER CONFIG */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 space-y-4">
                        <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Clicker Config</span>
                            </div>
                            {/* Voice Toggle */}
                            <button
                                onClick={() => setIsListening(!isListening)}
                                className={cn(
                                    "flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all",
                                    isListening
                                        ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
                                )}
                                title="Voice Control: 'Start', 'Stop'"
                            >
                                <div className={cn("w-1.5 h-1.5 rounded-full", isListening ? "bg-red-500" : "bg-zinc-600")} />
                                <span>{isListening ? "LISTENING" : "VOICE OFF"}</span>
                            </button>
                        </div>

                        <div className="space-y-6 px-1">
                            <Slider label="Clicks Per Second" value={cps} min={1} max={23} onChange={setCps} unit=" CPS" />

                            {/* Click Mode Selector */}
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                                    <Mouse className="w-3 h-3" />
                                    <span>Click Mode</span>
                                </div>
                                <div className="flex space-x-1">
                                    {CLICK_MODES.map((mode) => (
                                        <button
                                            key={mode.value}
                                            onClick={() => setClickMode(mode.value)}
                                            className={cn(
                                                "flex-1 py-1.5 text-[11px] font-mono rounded border transition-all",
                                                clickMode === mode.value
                                                    ? "bg-yellow-500/15 border-yellow-500 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.15)]"
                                                    : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                                            )}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Humanization Toggle */}
                            <div className="flex items-center justify-between">
                                <span className={cn("text-[10px] uppercase tracking-wider font-semibold", humanizationEnabled ? "text-zinc-500" : "text-zinc-600")}>
                                    Humanization
                                </span>
                                <button
                                    onClick={() => setHumanizationEnabled(!humanizationEnabled)}
                                    className={cn(
                                        "w-8 h-4 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none",
                                        humanizationEnabled ? "bg-yellow-500" : "bg-zinc-700"
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 bg-black rounded-full absolute top-1 transition-transform duration-200 ease-in-out",
                                        humanizationEnabled ? "left-5" : "left-1"
                                    )} />
                                </button>
                            </div>

                            {humanizationEnabled && (
                                <Slider label="Jitter / Randomness" value={randomness} min={0} max={50} onChange={setRandomness} unit="ms" />
                            )}

                            {speechError && (
                                <div className="text-[10px] text-red-500 font-mono text-center pt-2">
                                    Error: {speechError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: BINDINGS */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 space-y-3">
                        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
                            <Keyboard className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Keybinds</span>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm text-zinc-300 font-mono">Toggle Key</span>
                            <button
                                onClick={handleKeyRecord}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-mono border rounded transition-all min-w-[100px] text-center",
                                    isRecordingKey
                                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                                )}
                            >
                                {isRecordingKey ? "PRESS KEY..." : toggleKey}
                            </button>
                        </div>
                    </div>

                    {/* Section: STATUS */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 p-4">
                        <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2 mb-2">
                            <Settings2 className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Status Console</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 px-1">
                            <ToggleRow label="Input Driver Loaded" active={true} />
                            <ToggleRow label="Clicker Engine Core" active={isRunning} />
                            <ToggleRow label="Humanization Algo" active={humanizationEnabled} />
                            <ToggleRow label="Voice Command Module" active={isListening} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="h-8 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between px-4 text-[10px] text-zinc-600 font-mono">
                    <span>BUILD: 2026.02.16</span>
                    <span>SYSTEM READY</span>
                </div>
            </div>
        </div>
    );
};

export default Controls;
