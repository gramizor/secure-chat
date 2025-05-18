import type { PropsWithChildren } from "react";

export const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <header>🔐 P2P Chat</header>
      <main>{children}</main>
    </div>
  );
};
