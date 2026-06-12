import { ImageResponse } from "next/og";
import { baselineRanking, fmtOg, loadDisplayFont, ogFonts, OG_SERIF } from "@/lib/og";

export const alt = "The Anti-Forbes List — ranked by wealth created for others";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const rows = baselineRanking().slice(0, 3);
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 21, letterSpacing: 3, textTransform: "uppercase", color: "#57503f" }}>
            “…rank people by how much wealth they’ve created for other people” — Jeff Bezos
          </div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, marginTop: 14 }}>
            The Anti-Forbes List
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid #16140f", paddingTop: 4 }}>
          <div style={{ width: "100%", borderTop: "2px solid #16140f", marginBottom: 24 }} />
          {rows.map((r, i) => (
            <div key={r.slug} style={{ display: "flex", justifyContent: "space-between", fontSize: 40, marginTop: i ? 14 : 0 }}>
              <span>{`${i + 1}. ${r.name}`}</span>
              <span style={{ color: "#1d6b3c" }}>{fmtOg(r.v)}</span>
            </div>
          ))}
          <div style={{ fontSize: 20, color: "#57503f", marginTop: 26 }}>
            Every number traceable to an SEC filing · updated every 15 minutes
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts(font) },
  );
}
