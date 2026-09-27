import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0d",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 100,
              height: 18,
              borderRadius: 6,
              background: "#e50914",
            }}
          />
          <div
            style={{
              width: 100,
              height: 18,
              borderRadius: 6,
              background: "#e50914",
            }}
          />
          <div
            style={{
              width: 100,
              height: 18,
              borderRadius: 6,
              background: "#e50914",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 18,
              height: 82,
              borderRadius: 6,
              background: "#e50914",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
