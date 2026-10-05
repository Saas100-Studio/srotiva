import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Srotiva — turn websites into reliable feeds";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "100px",
        background: "#fff9f5",
        color: "#171717",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 80, fontWeight: 800, letterSpacing: -4 }}>
        Srotiva
      </div>
      <div style={{ marginTop: 64, fontSize: 54, fontWeight: 700 }}>
        Turn websites into reliable feeds
      </div>
      <div style={{ marginTop: 22, fontSize: 32, color: "#67615d" }}>
        RSS, JSON, and CSV from the sources you follow.
      </div>
    </div>,
    size,
  );
}
