import BackButton from "../components/BackButton.jsx";
import StatusDot from "../components/StatusDot.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { MODULES } from "../constants.js";
import { css, surface, border, borderHi, textSec, textDim, textPri, accent } from "../styles.js";

export default function VehicleView({ vehicle, onBack, onSelectProject, onNewProject, onOpenFsmLibrary }) {
  return (
    <div style={css.section}>
      <BackButton onClick={onBack} label="Garage" />
      <div style={{
        padding: "16px", background: surface, borderRadius: 10,
        border: `1px solid ${border}`, borderLeft: `3px solid ${vehicle.color}`,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 22 }}>{vehicle.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </div>
        <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
          Bolt: {vehicle.bolt_pattern} · Protocol: {vehicle.obd_protocol}
        </div>
        <div style={{ ...css.divider }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onOpenFsmLibrary && onOpenFsmLibrary()} style={css.btnSmall("#818cf8")}>📄 FSM Library</button>
          <button disabled style={css.btnSmallPlaceholder("#06b6d4")} title="Planned">📊 OBD2 Connect</button>
          <button disabled style={css.btnSmallPlaceholder("#f59e0b")} title="Planned">🕐 History</button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 8 }}>PROJECTS</div>
      {(vehicle.projects || []).map(p => (
        <div key={p.id} onClick={() => onSelectProject(p)}
          style={{ ...css.card }}
          onMouseEnter={e => e.currentTarget.style.borderColor = borderHi}
          onMouseLeave={e => e.currentTarget.style.borderColor = border}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StatusDot status={p.status} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</span>
            </div>
            <span style={css.tag(
              p.status === "active" ? accent : p.status === "planned" ? "#818cf8" : textDim
            )}>
              {p.status.toUpperCase()}
            </span>
          </div>
          {p.module && (
            <div style={{ fontSize: 11, color: textSec, marginTop: 6 }}>
              Module: {MODULES.find(m => m.id === p.module)?.name || p.module}
            </div>
          )}
          <ProgressBar steps={p.steps} />
          {p.updated_at && (
            <div style={{ fontSize: 10, color: textDim, marginTop: 6 }}>Last touched: {p.updated_at}</div>
          )}
        </div>
      ))}
      <button onClick={onNewProject} style={{ ...css.btn(), marginTop: 8 }}>
        + NEW PROJECT
      </button>
    </div>
  );
}
