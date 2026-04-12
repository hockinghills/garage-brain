import { useState } from "react";
import BackButton from "../components/BackButton.jsx";
import { MODULES } from "../constants.js";
import { css, surface, border, textSec, textDim, textPri, font } from "../styles.js";

export default function NewProjectView({ vehicle, onBack, onCreate }) {
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("repair");
  const [notes, setNotes] = useState("");

  return (
    <div style={css.section}>
      <BackButton onClick={onBack} label={`${vehicle.year} ${vehicle.make}`} />
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        New Project — {vehicle.year} {vehicle.make}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, color: textSec, letterSpacing: 2, display: "block", marginBottom: 4 }}>TITLE</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Brake pad replacement"
          style={css.input} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, color: textSec, letterSpacing: 2, display: "block", marginBottom: 8 }}>MODULE</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {MODULES.map(m => (
            <button key={m.id} onClick={() => setModule(m.id)}
              style={{
                ...css.card, cursor: "pointer", padding: 12, marginBottom: 0,
                borderColor: module === m.id ? m.color : border,
                background: module === m.id ? `${m.color}08` : surface,
              }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: module === m.id ? m.color : textPri }}>{m.name}</div>
              <div style={{ fontSize: 10, color: textDim, marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10, color: textSec, letterSpacing: 2, display: "block", marginBottom: 4 }}>NOTES</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="What's going on? Symptoms, context, what you've tried..."
          rows={4}
          style={{ ...css.input, resize: "vertical" }} />
      </div>
      <button onClick={() => {
        if (title.trim()) {
          onCreate({ title, module, notes, status: "active" });
        }
      }} style={css.btn()}>
        CREATE PROJECT
      </button>
    </div>
  );
}
