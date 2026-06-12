import { ImageResponse } from "next/og";
import { baselineRanking, fmtOg, loadDisplayFont, ogFonts, OG_SERIF } from "@/lib/og";

export const alt = "Anti-Forbes List founder card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = baselineRanking();
  const idx = all.findIndex((x) => x.slug === slug);
  const { name, v, kept } = all[idx];
  const font = await loadDisplayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f3ea",
          color: "#16140f",
          padding: "56px 72px",
          fontFamily: OG_SERIF,
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#57503f" }}>
          {`The Anti-Forbes List · Rank ${idx + 1} of ${all.length}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>{name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 8 }}>
            <div style={{ fontSize: 76, color: v < 0 ? "#9b3a2e" : "#1d6b3c" }}>{fmtOg(v)}</div>
            <div style={{ fontSize: 30, color: "#57503f" }}>created for others</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid #16140f", paddingTop: 4 }}>
          <div style={{ width: "100%", borderTop: "2px solid #16140f", marginBottom: 20 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#57503f" }}>
            <span>{`kept ${fmtOg(kept)}`}</span>
            <span>every number cited to an SEC filing</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts(font) },
  );
}
