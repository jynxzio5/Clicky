import { MousePointer2, Keyboard, Bolt, Activity } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

type Page = "clicker" | "macro" | "settings";

interface SidebarProps {
    activePage: Page;
    setPage: Dispatch<SetStateAction<Page>>;
}

const Sidebar = ({ activePage, setPage }: SidebarProps) => {
    const navItems = [
        { id: "clicker", icon: MousePointer2, label: "Auto Clicker" },
        { id: "macro", icon: Keyboard, label: "Macros" },
        { id: "settings", icon: Bolt, label: "Settings" },
    ];

    return (
        <div className="w-64 h-full bg-zinc-950/50 backdrop-blur-xl border-r border-zinc-800/50 flex flex-col p-4 relative z-50 pointer-events-auto">
            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                        CliKy
                    </h1>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide">
                        v1.0.0
                    </p>
                </div>
            </div>

            <div className="space-y-1">
                <p className="px-2 text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">
                    Menu
                </p>
                {navItems.map((item) => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setPage(item.id as Page)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                    ? "bg-indigo-500/10 text-indigo-400"
                                    : "text-zinc-400 hover:bg-zinc-900/50 hover:text-indigo-300"
                                }`}
                        >
                            <Icon
                                className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"
                                    }`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span
                                className={`text-sm font-bold ${isActive ? "text-indigo-400" : "text-zinc-400"
                                    }`}
                            >
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto">
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-zinc-400">System Status</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        Driver Active<br />
                        Latency: &lt;1ms
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
