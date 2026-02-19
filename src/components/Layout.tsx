
import Sidebar, { Page } from "./Sidebar";
import { Dispatch, SetStateAction } from "react";

interface LayoutProps {
    children: React.ReactNode;
    activePage: Page;
    setPage: Dispatch<SetStateAction<Page>>;
}

const Layout = ({ children, activePage, setPage }: LayoutProps) => {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white select-none">
            {/* Sidebar */}
            <Sidebar activePage={activePage} setPage={setPage} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-zinc-950/50">

                {/* Background Gradients */}
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Content */}
                <main className="flex-1 p-8 overflow-y-auto no-scrollbar relative z-10">
                    <div className="max-w-4xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
