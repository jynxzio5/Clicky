import React from 'react';
import { Settings2, RefreshCw, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Card = ({ title, icon: Icon, children, className }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
    <div className={cn("bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5 shadow-sm transition-all hover:border-zinc-700/50 flex flex-col", className)}>
        <div className="flex items-center gap-2 mb-4 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-zinc-800/50">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        {children}
    </div>
);

const SettingsPage: React.FC = () => {
    const [updateStatus, setUpdateStatus] = React.useState<'idle' | 'checking' | 'available' | 'uptodate' | 'error'>('idle');
    const [latestVersion, setLatestVersion] = React.useState<string>('');
    const [downloadUrl, setDownloadUrl] = React.useState<string>('');
    const CURRENT_VERSION = "1.0.1";

    const checkUpdate = async () => {
        setUpdateStatus('checking');
        try {
            const response = await fetch('https://api.github.com/repos/jynxzio5/cliky/releases/latest');
            if (!response.ok) {
                if (response.status === 404) {
                    setUpdateStatus('uptodate');
                    return;
                }
                throw new Error('Failed to fetch update');
            }
            const data = await response.json();
            const remoteVersion = data.tag_name.replace(/^v/, '');

            if (remoteVersion !== CURRENT_VERSION) {
                setLatestVersion(remoteVersion);
                setDownloadUrl(data.html_url);
                setUpdateStatus('available');
            } else {
                setUpdateStatus('uptodate');
            }
        } catch (error) {
            console.error(error);
            setUpdateStatus('error');
        }
    };

    return (
        <div className="h-full flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
                {/* Update Checker */}
                <Card title="Software Update" icon={RefreshCw} className="h-full min-h-[180px]">
                    <div className="flex flex-col gap-4 items-center justify-between flex-1 w-full text-center">
                        <div className="flex flex-col items-center">
                            <div className="text-sm font-bold text-zinc-200">
                                Current Version
                            </div>
                            <span className="font-mono text-2xl font-black text-indigo-400 my-1">v{CURRENT_VERSION}</span>
                            <div className="text-xs text-zinc-500">
                                {updateStatus === 'idle' && "Check for the latest features."}
                                {updateStatus === 'checking' && "Connecting to server..."}
                                {updateStatus === 'uptodate' && "You are up to date."}
                                {updateStatus === 'available' && `v${latestVersion} is available!`}
                                {updateStatus === 'error' && "Connection failed."}
                            </div>
                        </div>

                        <div className="w-full">
                            {updateStatus === 'available' ? (
                                <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Update
                                </a>
                            ) : (
                                <button
                                    onClick={checkUpdate}
                                    disabled={updateStatus === 'checking'}
                                    className={cn(
                                        "w-full px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2",
                                        updateStatus === 'checking'
                                            ? "bg-zinc-800/50 text-zinc-500 border-zinc-800 cursor-not-allowed"
                                            : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                                    )}
                                >
                                    {updateStatus === 'checking' ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    {updateStatus === 'checking' ? "Checking..." : "Check for Updates"}
                                </button>
                            )}
                        </div>
                    </div>
                </Card>

                <Card title="About" icon={Settings2} className="h-full min-h-[180px]">
                    <div className="flex flex-col justify-between flex-1 w-full space-y-2 text-xs text-zinc-500">
                        <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-800/20">
                            <span>Version</span>
                            <span className="font-mono text-zinc-300">{CURRENT_VERSION}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-800/20">
                            <span>Build Target</span>
                            <span className="font-mono text-zinc-300">Windows (x64)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-zinc-800/20">
                            <span>Author</span>
                            <span className="font-mono text-zinc-300">jynxzio5</span>
                        </div>
                        <div className="text-[10px] text-zinc-600 text-center pt-2">
                            © 2024 CliKy Project
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsPage;
