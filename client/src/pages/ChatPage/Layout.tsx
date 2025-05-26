// src/pages/ChatPage/ui/Layout.tsx

import type { ReactNode } from "react";

export const Layout = ({
  header,
  sidebar,
  main,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ flex: "0 0 70px" }}>{header}</div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {sidebar}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#7c0000",
            padding: "0 1rem 1rem",
            minHeight: 0,
            overflow: "hidden",
            width: "100%",
          }}
        >
          {main}
        </main>
      </div>
    </div>
  );
};
