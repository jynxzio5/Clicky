import React from 'react';

const Background: React.FC = () => {
    return (
        <div
            className="fixed inset-0 -z-10 overflow-hidden bg-zinc-950"
            data-tauri-drag-region
        >
            {/* Subtle Grid */}
            <div
                className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
            />

            {/* Radial Gradient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.yellow.900/10),transparent_70%)] pointer-events-none" />

            {/* Decorative Elements - Darker/Subtler */}
            <div className="absolute top-0 right-0 p-10 opacity-20 pointer-events-none">
                <div className="w-32 h-32 border border-zinc-800 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
            </div>
            <div className="absolute bottom-0 left-0 p-10 opacity-20 pointer-events-none">
                <div className="w-48 h-48 border border-zinc-800 rounded-full border-dotted animate-[spin_15s_linear_infinite_reverse]" />
            </div>

            {/* Drag Region Coverage */}
            <div className="absolute inset-0 z-0" data-tauri-drag-region />
        </div>
    );
};

export default Background;
