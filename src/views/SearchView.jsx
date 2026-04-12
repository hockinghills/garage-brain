import { css, textSec, border, font } from "../styles.js";

const SUGGESTIONS = [
  "47RE torque specs",
  "Leaf blower transistor location",
  "Golf fuel pump relay",
  "QX60 alignment specs",
  "ATF+4 capacity Ram",
];

export default function SearchView() {
  return (
    <div style={css.section}>
      <div style={{ padding: "20px 0" }}>
        <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 12 }}>SEARCH EVERYTHING</div>
        <input placeholder="Search vehicles, projects, FSM, parts..."
          style={{ ...css.input, fontSize: 14, padding: "14px 16px" }} />
        <div style={{ marginTop: 16 }}>
          {SUGGESTIONS.map(q => (
            <button key={q} style={{
              display: "block", width: "100%", textAlign: "left",
              background: "none", border: "none", borderBottom: `1px solid ${border}`,
              color: textSec, fontSize: 12, fontFamily: font,
              padding: "10px 0", cursor: "pointer",
            }}>
              🔍 {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
