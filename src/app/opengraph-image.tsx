import { ImageResponse } from "next/og";

export const runtime = "edge";
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
          alignItems: "center",
          justifyContent: "center",
          padding: 54,
          color: "#f5faf6",
          background:
            "linear-gradient(135deg, #092b31 0%, #104347 58%, #176052 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: 56,
            borderRadius: 34,
            border: "2px solid #326f65",
            background: "rgba(7, 32, 38, 0.48)",
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 52,
              background: "#164d4d",
              border: "4px solid #70d8a4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginRight: 58,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 138,
                lineHeight: 1,
                fontWeight: 800,
                color: "#f5faf6",
                letterSpacing: -10,
              }}
            >
              F
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 72,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: -2,
              }}
            >
              Fate Light
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: 29,
                color: "#c2dfd4",
              }}
            >
              Clareza financeira. Caminho certo.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 36,
                padding: "19px 24px",
                borderRadius: 18,
                border: "1px solid #326f65",
                background: "#164d4d",
                fontSize: 22,
                fontWeight: 600,
                color: "#e0f2e7",
              }}
            >
              Clientes · Serviços · Cobranças · Despesas
            </div>
            <div
              style={{
                marginTop: 42,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: "#70d8a4",
              }}
            >
              GESTÃO LEVE PARA FREELANCERS E PEQUENOS NEGÓCIOS
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
