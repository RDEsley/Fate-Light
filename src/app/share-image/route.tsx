import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 1200 };
export const contentType = "image/png";
export const alt = "Fate Light logo";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c342f",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 450, right: -390, top: -360, background: "#124c42", display: "flex" }} />
        <div style={{ position: "absolute", width: 760, height: 760, borderRadius: 380, left: -420, bottom: -430, background: "#103f39", display: "flex" }} />
        <div
          style={{
            width: 650,
            height: 650,
            borderRadius: 190,
            background: "#176052",
            border: "10px solid #70d8a4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: "0 25px 70px rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ display: "flex", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 470, lineHeight: 1, fontWeight: 800, letterSpacing: -35, color: "#f4fff7", marginTop: -24 }}>
            F
          </div>
          <div style={{ position: "absolute", right: 103, top: 92, width: 54, height: 54, borderRadius: 27, background: "#f5c568", display: "flex" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
