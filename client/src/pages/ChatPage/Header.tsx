export const Header = () => (
  <div
    style={{
      height: "70px",
      width: "100%",
      overflow: "hidden",
      backgroundImage: "url('/gr-secure.png')",
      backgroundRepeat: "repeat-x",
      backgroundSize: "auto 100%",
      animation: "scroll-bg 50s linear infinite",
    }}
  >
    <style>{`
      @keyframes scroll-bg {
        from { background-position: 0 0; }
        to { background-position: 100% 0; }
      }
    `}</style>
  </div>
);
