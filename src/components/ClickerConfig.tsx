import React, { useState, useEffect } from 'react';
import { Activity, Keyboard } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Card = ({ title, icon: Icon, children, className }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
    <div className={cn("bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5 shadow-sm transition-all hover:border-zinc-700/50", className)}>
        <div className="flex items-center gap-2 mb-4 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-zinc-800/50">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        {children}
    </div>
);

const Slider = ({ label, value, min, max, onChange, unit }: { label: string, value: number, min: number, max: number, onChange: (val: number) => void, unit?: string }) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-400">{label}</span>
            <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs font-bold font-mono">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
        />
    </div>
);

const CLICK_MODES = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'double', label: 'Double' },
] as const;

const ClickerConfig: React.FC = () => {
    const loadState = <T,>(key: string, defaultVal: T): T => {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            try { return JSON.parse(saved); } catch (_e) { return defaultVal; }
        }
        return defaultVal;
    }

    const [cps, setCps] = useState(() => loadState('cliky_cps', 10));
    const [randomness, setRandomness] = useState(() => loadState('cliky_randomness', 0));
    const [humanizationEnabled, setHumanizationEnabled] = useState(() => loadState('cliky_humanization', true));
    const [toggleKey, setToggleKey] = useState(() => loadState('cliky_key', 'F6'));
    const [clickMode, setClickMode] = useState(() => loadState('cliky_click_mode', 'left'));
    const [isRecordingKey, setIsRecordingKey] = useState(false);

    // Persist & Push Config
    useEffect(() => {
        localStorage.setItem('cliky_cps', JSON.stringify(cps));
        localStorage.setItem('cliky_randomness', JSON.stringify(randomness));
        localStorage.setItem('cliky_humanization', JSON.stringify(humanizationEnabled));
        localStorage.setItem('cliky_key', JSON.stringify(toggleKey));
        localStorage.setItem('cliky_click_mode', JSON.stringify(clickMode));

        invoke('update_config', { cps, randomness, humanizationEnabled, toggleKey, clickMode }).catch(console.error);
    }, [cps, randomness, humanizationEnabled, toggleKey, clickMode]);

    const handleKeyRecord = () => {
        setIsRecordingKey(true);
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
                setToggleKey(key);
                setIsRecordingKey(false);
                cleanup();
            }
        };
        const mouseDownHandler = (e: MouseEvent) => { if (e.button > 2) e.preventDefault(); };
        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        window.addEventListener('mousedown', mouseDownHandler);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {/* Clicker Config */}
            <Card title="Clicker Configuration" icon={Activity} className="md:col-span-2">
                <div className="space-y-8">
                    <Slider label="Clicks Per Second" value={cps} min={1} max={23} onChange={setCps} unit=" CPS" />

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-zinc-400">Click Mode</label>
                        <div className="grid grid-cols-3 gap-2 bg-zinc-950/50 p-1 rounded-xl">
                            {CLICK_MODES.map((mode) => (
                                <button
                                    key={mode.value}
                                    onClick={() => setClickMode(mode.value)}
                                    className={cn(
                                        "py-2 text-xs font-bold rounded-lg transition-all",
                                        clickMode === mode.value
                                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                    )}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-sm font-bold text-zinc-200 block">Humanization</span>
                                <span className="text-[10px] text-zinc-500 font-medium">Add random jitter to clicks</span>
                            </div>
                            <button
                                onClick={() => setHumanizationEnabled(!humanizationEnabled)}
                                className={cn(
                                    "w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none",
                                    humanizationEnabled ? "bg-indigo-500" : "bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm",
                                    humanizationEnabled ? "left-6" : "left-1"
                                )} />
                            </button>
                        </div>
                        {humanizationEnabled && (
                            <Slider label="Randomness Intensity" value={randomness} min={0} max={50} onChange={setRandomness} unit="ms" />
                        )}
                    </div>
                </div>
            </Card>

            {/* Keybinds */}
            <Card title="Keybinds" icon={Keyboard}>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-300">Toggle Key</span>
                    <button
                        onClick={handleKeyRecord}
                        className={cn(
                            "px-4 py-2 text-xs font-bold font-mono border rounded-lg transition-all min-w-[100px]",
                            isRecordingKey
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        )}
                    >
                        {isRecordingKey ? "PRESS KEY" : toggleKey}
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default ClickerConfig;
