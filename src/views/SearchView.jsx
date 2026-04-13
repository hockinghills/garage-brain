import { css, textSec, textDim, border, font } from "../styles.js";

const SUGGESTIONS = [
  "brake pad torque specs",
  "fuel pump relay location",
  "alignment specifications",
  "transmission fluid capacity",
  "wiring diagram HVAC",
];

export default function SearchView() {
  return (
    <div style={css.section}>
      <div style={{ padding: "20px 0" }}>
        <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 12 }}>SEARCH EVERYTHING</div>
        <input disabled placeholder="Search — requires AI indexing (planned)"
          style={{ ...css.input, fontSize: 14, padding: "14px 16px", opacity: 0.5, cursor: "default" }} />
        <div style={{ marginTop: 16 }}>
          {SUGGESTIONS.map(q => (
            <div key={q} style={{
              display: "block", width: "100%", textAlign: "left",
              background: "none", borderBottom: `1px dashed ${border}`,
              color: textDim, fontSize: 12, fontFamily: font,
              padding: "10px 0", opacity: 0.5,
            }}>
              🔍 {q}
            </div>
          ))}
          <div style={{ fontSize: 10, color: textDim, marginTop: 12, fontStyle: "italic" }}>
            Search requires FSM ingestion + AI indexing — coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
