import React, { useState, useEffect } from 'react';
import { Activity, Power, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Controls: React.FC = () => {
    const loadState = <T,>(key: string, defaultVal: T): T => {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            try { return JSON.parse(saved); } catch (_e) { return defaultVal; }
        }
        return defaultVal;
    }

    const [isRunning, setIsRunning] = useState(false);


    // We read config just for display
    const [targetCps] = useState(() => loadState('cliky_cps', 10));
    const [toggleKey] = useState(() => loadState('cliky_key', 'F6'));

    // State sync
    useEffect(() => {
        const unlisten = listen<{ running: boolean; cps: number; click_mode: string }>(
            'clicker-state-changed',
            (event) => {
                setIsRunning(event.payload.running);
                // event.payload.cps might be live or target depending on backend implementation
                // For now backend usually sends actual target or 0.
                // Let's assume dashboard just shows running state mainly.
            }
        );

        invoke<[boolean, number, number, boolean, string, string]>('get_clicker_state')
            .then(([running]) => setIsRunning(running))
            .catch(console.error);

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-20">
            {/* Status Card Big */}
            <div className={cn(
                "md:col-span-2 rounded-3xl p-8 flex items-center justify-between transition-all duration-500 relative overflow-hidden group",
                isRunning
                    ? "bg-gradient-to-br from-indigo-600 to-violet-800 shadow-2xl shadow-indigo-500/30"
                    : "bg-zinc-900/50 border border-zinc-800"
            )}>
                <div className="relative z-10">
                    <h2 className={cn("text-4xl font-black tracking-tight mb-2", isRunning ? "text-white" : "text-zinc-500")}>
                        {isRunning ? "SYSTEM ACTIVE" : "SYSTEM READY"}
                    </h2>
                    <p className={cn("font-mono text-sm", isRunning ? "text-indigo-200" : "text-zinc-600")}>
                        {isRunning ? "Clicking engine engaging target..." : `Waiting for input (${toggleKey})`}
                    </p>
                </div>

                <div className="relative z-10">
                    <div className={cn(
                        "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isRunning ? "bg-white/20 backdrop-blur-md" : "bg-zinc-800/50"
                    )}>
                        <Power className={cn("w-10 h-10", isRunning ? "text-white animate-pulse" : "text-zinc-600")} strokeWidth={3} />
                    </div>
                </div>

                {/* Background Glow */}
                {isRunning && (
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                )}
            </div>

            {/* Stats Cards */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 flex flex-col justify-between group hover:border-zinc-700/50 transition-all">
                <div className="flex items-center gap-3 text-zinc-500 mb-4">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Target CPS</span>
                </div>
                <div>
                    <span className="text-4xl font-black text-white">{targetCps}</span>
                    <span className="text-zinc-500 font-mono text-sm ml-2">CLICKS/SEC</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(targetCps / 25) * 100}%` }} />
                </div>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 flex items-center justify-between group hover:border-zinc-700/50 transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-zinc-800/50 text-zinc-400">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Driver Status</h3>
                        <p className="text-xs text-zinc-500 font-mono">Check</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold font-mono">
                    OPERATIONAL
                </span>
            </div>
        </div>
    );
};

export default Controls;
