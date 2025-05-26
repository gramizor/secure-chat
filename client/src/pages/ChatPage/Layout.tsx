// src/pages/ChatPage/ui/Layout.tsx

import type {ReactNode} from "react";

export const Layout = ({ header, sidebar, main }: { header: ReactNode, sidebar: ReactNode, main: ReactNode }) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            {header}
            <div style={{ display: "flex", flex: 1 }}>
                {sidebar}
                <main style={{ flex: 1, backgroundColor: '#7c0000', padding: '1rem' }}>
                    {main}
                </main>
            </div>
        </div>
    );
};