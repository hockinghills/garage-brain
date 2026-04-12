import { useState } from "react";
import StatusDot from "../components/StatusDot.jsx";
import { css, textSec, textDim, border, font } from "../styles.js";

export default function GarageView({ vehicles, onSelectVehicle, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const activeProjects = vehicles.reduce(
    (n, v) => n + (v.projects || []).filter(p => p.status === "active").length, 0
  );
  return (
    <div style={css.section}>
      <div style={{ padding: "20px 0 12px" }}>
        <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 4 }}>YOUR GARAGE</div>
        <div style={{ fontSize: 13, color: textDim }}>
          {vehicles.length} vehicles · {activeProjects} active projects
        </div>
      </div>
      {vehicles.map(v => {
        const active = (v.projects || []).filter(p => p.status === "active");
        return (
          <div key={v.id} onClick={() => onSelectVehicle(v)}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectVehicle(v); } }}
            style={{ ...css.card, borderLeft: `3px solid ${v.color}` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = v.color}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.borderLeftColor = v.color; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{v.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {v.year} {v.make} {v.model}
                </div>
                <div style={{ fontSize: 11, color: textSec, marginTop: 2 }}>
                  {v.bolt_pattern} · {v.obd_protocol}
                </div>
              </div>
              {active.length > 0 && (
                <span style={css.tag(v.color)}>{active.length} ACTIVE</span>
              )}
            </div>
            {v.notes && (
              <div style={{ fontSize: 11, color: textDim, marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>
                {v.notes}
              </div>
            )}
            {active.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {active.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 0", fontSize: 12, color: textSec,
                  }}>
                    <StatusDot status={p.status} />
                    {p.title}
                    {p.module && <span style={{ color: textDim, fontSize: 10 }}>({p.module})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {onReset && (
        <div style={{ marginTop: 20, padding: "12px 0", borderTop: `1px solid ${border}` }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} style={{
              background: "none", border: "none", color: textDim,
              fontSize: 10, fontFamily: font, cursor: "pointer",
              padding: "8px 0", width: "100%", textAlign: "center",
              letterSpacing: 1,
            }}>
              RESET ALL DATA
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>
                This will wipe all your progress. Are you sure?
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => { onReset(); setConfirmReset(false); }}
                  style={{ ...css.btnSmall("#f87171"), padding: "8px 20px" }}>Yes, reset</button>
                <button onClick={() => setConfirmReset(false)}
                  style={{ ...css.btnSmall(textDim), padding: "8px 20px" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
