import { textSec, accent, border } from "../styles.js";

export default function ProgressBar({ steps }) {
  if (!steps || steps.length === 0) return null;
  const done = steps.filter(s => s.done).length;
  const pct = (done / steps.length) * 100;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: textSec, fontSize: 10 }}>{done}/{steps.length} steps</span>
        <span style={{ color: pct === 100 ? accent : textSec, fontSize: 10 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 3, background: border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 2,
          background: pct === 100 ? accent : "#818cf8",
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}
