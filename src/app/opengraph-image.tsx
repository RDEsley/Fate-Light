import { ImageResponse } from "next/og";

export const alt = "Fate Light — Clareza financeira. Caminho certo.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "78px 92px",
          background: "#0c342f",
          color: "#f3fbf5",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: 250, right: -100, top: -180, background: "#145548", display: "flex" }} />
        <div style={{ position: "absolute", width: 340, height: 340, borderRadius: 170, right: 70, bottom: -210, background: "#176956", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 26, zIndex: 1 }}>
          <div style={{ width: 88, height: 88, borderRadius: 26, background: "#70d8a4", display: "flex", alignItems: "center", justifyContent: "center", color: "#0c342f", fontSize: 60, fontWeight: 800, lineHeight: 1 }}>F</div>
          <div style={{ display: "flex", fontSize: 35, fontWeight: 700, letterSpacing: -1 }}>Fate Light</div>
        </div>
        <div style={{ marginTop: 54, maxWidth: 920, fontSize: 65, fontWeight: 800, lineHeight: 1.12, letterSpacing: -2.5, zIndex: 1, display: "flex" }}>
          Clareza financeira.
          <br />
          Caminho certo.
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#c1e4d1", zIndex: 1, display: "flex" }}>
          Clientes, cobranças e despesas em um só lugar.
        </div>
        <div style={{ position: "absolute", left: 92, bottom: 58, height: 5, width: 154, borderRadius: 3, background: "#70d8a4", display: "flex" }} />
      </div>
    ),
    { ...size },
  );
}
