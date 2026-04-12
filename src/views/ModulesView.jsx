import { MODULES } from "../constants.js";
import { css, textSec, textDim } from "../styles.js";

export default function ModulesView() {
  return (
    <div style={css.section}>
      <div style={{ padding: "20px 0 12px" }}>
        <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 4 }}>MODULES</div>
        <div style={{ fontSize: 13, color: textDim }}>Tools & capabilities</div>
      </div>
      {MODULES.map(m => (
        <div key={m.id} style={{ ...css.card, borderLeft: `3px solid ${m.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: m.color }}>{m.name}</div>
              <div style={{ fontSize: 11, color: textSec }}>{m.desc}</div>
            </div>
          </div>
        </div>
      ))}
      <div style={{
        padding: 16, background: "#0a0a14", borderRadius: 10,
        border: `1px dashed #2a2a3e`, marginTop: 8, textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: "#6a6a9a", marginBottom: 4 }}>More modules coming</div>
        <div style={{ fontSize: 11, color: textDim }}>
          Wiring diagrams · Fluid capacity lookup · Torque spec database · Photo documentation
        </div>
      </div>
    </div>
  );
}
