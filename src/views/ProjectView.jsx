import { useState } from "react";
import BackButton from "../components/BackButton.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { MODULES } from "../constants.js";
import { css, surface, border, textSec, textDim, textPri, accent, font } from "../styles.js";

export default function ProjectView({ vehicle, project, onBack, onToggleStep, onAddNote, onLaunchTroubleshoot }) {
  const [showFsm, setShowFsm] = useState(false);
  const [newNote, setNewNote] = useState("");
  const mod = MODULES.find(m => m.id === project.module);

  return (
    <div style={css.section}>
      <BackButton onClick={onBack} label={`${vehicle.year} ${vehicle.make}`} />

      {/* Project Header */}
      <div style={{
        padding: 16, background: surface, borderRadius: 10,
        border: `1px solid ${border}`, marginBottom: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{project.title}</div>
            <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          </div>
          <span style={css.tag(mod?.color || accent)}>{mod?.name || project.module}</span>
        </div>
        <ProgressBar steps={project.steps} />
      </div>

      {/* FSM Sections */}
      {project.fsmSections?.length > 0 && (
        <div style={{
          padding: 12, background: "#0d0d14", borderRadius: 8,
          border: `1px solid ${border}`, marginBottom: 12,
        }}>
          <button onClick={() => setShowFsm(!showFsm)} style={{
            background: "none", border: "none", color: "#818cf8",
            fontSize: 12, fontFamily: font, cursor: "pointer", padding: 0,
            width: "100%", textAlign: "left", fontWeight: 600,
          }}>
            📄 FSM SECTIONS {showFsm ? "▾" : "▸"} ({project.fsmSections.length})
          </button>
          {showFsm && (
            <div style={{ marginTop: 8 }}>
              {project.fsmSections.map((s, i) => {
                const label = typeof s === "string" ? s : s.title;
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 0", borderBottom: i < project.fsmSections.length - 1 ? `1px solid ${border}` : "none",
                  }}>
                    <span style={{ fontSize: 12, color: textSec }}>{label}</span>
                    <button style={css.btnSmall("#818cf8")}>Load</button>
                  </div>
                );
              })}
              <button style={{ ...css.btnSmall("#818cf8"), marginTop: 8, width: "100%" }}>
                + Add FSM Section
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {project.notes != null && (
        <div style={{
          padding: 12, background: "#0f0f0a", borderRadius: 8,
          border: `1px solid #2a2a1a`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: "#8a8a4a", letterSpacing: 2, marginBottom: 6 }}>NOTES</div>
          <div style={{ fontSize: 12, color: "#c8c8a0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{project.notes}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              style={{ ...css.input, flex: 1, padding: "6px 10px", fontSize: 11, background: "#0a0a08", border: `1px solid #2a2a1a` }}
              onKeyDown={e => {
                if (e.key === "Enter" && newNote.trim()) {
                  onAddNote(newNote);
                  setNewNote("");
                }
              }}
            />
            <button onClick={() => { if (newNote.trim()) { onAddNote(newNote); setNewNote(""); } }}
              style={css.btnSmall("#8a8a4a")}>+</button>
          </div>
        </div>
      )}

      {/* Steps */}
      {project.steps?.length > 0 && (
        <div style={{
          padding: 12, background: surface, borderRadius: 8,
          border: `1px solid ${border}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 10 }}>PROCEDURE</div>
          {project.steps.map((step, i) => (
            <div key={i} onClick={() => onToggleStep(i)}
              style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: i < project.steps.length - 1 ? `1px solid ${border}` : "none",
                cursor: "pointer", opacity: step.done ? 0.5 : 1,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${step.done ? accent : "#2a2a34"}`,
                background: step.done ? `${accent}20` : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: accent, marginTop: 1,
              }}>
                {step.done && "✓"}
              </div>
              <div style={{
                fontSize: 13, color: step.done ? textDim : textPri,
                lineHeight: 1.5, textDecoration: step.done ? "line-through" : "none",
              }}>
                {step.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parts */}
      {project.parts?.length > 0 && (
        <div style={{
          padding: 12, background: surface, borderRadius: 8,
          border: `1px solid ${border}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 10 }}>PARTS</div>
          {project.parts.map((part, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0",
              borderBottom: i < project.parts.length - 1 ? `1px solid ${border}` : "none",
            }}>
              <div>
                <div style={{ fontSize: 13, color: textPri }}>{part.name}</div>
                {(part.part_number || part.partNo) && (
                  <div style={{ fontSize: 10, color: textDim, marginTop: 2 }}>P/N: {part.part_number || part.partNo}</div>
                )}
              </div>
              <span style={css.tag(part.status === "on-hand" ? accent : "#f87171")}>
                {part.status === "on-hand" ? "ON HAND" : part.status?.toUpperCase() || "NEED"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tools */}
      {project.tools?.length > 0 && (
        <div style={{
          padding: 12, background: "#0a0f0a", borderRadius: 8,
          border: `1px solid #1a2e1a`, marginBottom: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#5a9a5a", letterSpacing: 2 }}>TOOLS NEEDED</div>
            <span style={{ fontSize: 10, color: textDim }}>
              {project.tools.filter(t => t.have || t.owned).length}/{project.tools.length} ready
            </span>
          </div>
          {project.tools.filter(t => !(t.have || t.owned)).length > 0 && (
            <div style={{
              background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 6,
              padding: "8px 10px", marginBottom: 10, fontSize: 11, color: "#f87171",
            }}>
              ⚠ {project.tools.filter(t => !(t.have || t.owned)).length} tool(s) missing
            </div>
          )}
          {project.tools.map((tool, i) => {
            const owned = tool.have || tool.owned;
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "7px 0",
                borderBottom: i < project.tools.length - 1 ? `1px solid #1a2a1a` : "none",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1 }}>
                  <span style={{ fontSize: 13, marginTop: 1, color: owned ? accent : "#f87171" }}>
                    {owned ? "✓" : "✗"}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, color: owned ? textSec : textPri }}>{tool.name}</div>
                    {(tool.note || tool.notes) && (
                      <div style={{ fontSize: 10, color: textDim, marginTop: 2, lineHeight: 1.4 }}>
                        {tool.note || tool.notes}
                      </div>
                    )}
                  </div>
                </div>
                <span style={css.tag(owned ? "#2a4a2a" : "#f87171")}>
                  {owned ? "HAVE" : "NEED"}
                </span>
              </div>
            );
          })}
          <button style={{ ...css.btnSmall("#5a9a5a"), marginTop: 10, width: "100%" }}>
            + Add Tool
          </button>
        </div>
      )}

      {/* Module Actions */}
      <div style={{
        padding: 12, background: surface, borderRadius: 8,
        border: `1px solid ${border}`, marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 10 }}>MODULE ACTIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {project.troubleshooting && (
            <button onClick={() => onLaunchTroubleshoot && onLaunchTroubleshoot()}
              style={css.btn("#e879f9")}>🔎 Launch Troubleshooting</button>
          )}
          {project.module === "alignment" && (
            <button style={css.btn()}>◎ Launch Alignment Tool</button>
          )}
          {project.module === "diagnostics" && (
            <>
              <button style={css.btn("#3b82f6")}>⚡ Connect OBD2</button>
              <button style={css.btn("#06b6d4")}>📊 View Trouble Codes</button>
            </>
          )}
          {project.module === "repair" && (
            <>
              <button style={css.btn("#f59e0b")}>📄 Open FSM Section</button>
              <button style={css.btn("#06b6d4")}>🔍 Ask AI About This Repair</button>
            </>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <div style={{
        padding: 12, background: "#0a0a14", borderRadius: 8,
        border: `1px solid #1a1a2e`, marginBottom: 20,
      }}>
        <div style={{ fontSize: 10, color: "#6a6a9a", letterSpacing: 2, marginBottom: 8 }}>AI ASSISTANT</div>
        <div style={{ fontSize: 12, color: "#8a8acc", marginBottom: 10, lineHeight: 1.5 }}>
          Ask anything about this repair. The AI has context of your vehicle, project, and loaded FSM sections.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input placeholder={`Ask about ${project.title.toLowerCase()}...`}
            style={{ ...css.input, flex: 1, fontSize: 12, background: "#08080e", border: `1px solid #1a1a2e` }}
          />
          <button style={css.btnSmall("#818cf8")}>→</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {["Torque specs?", "Common mistakes?", "What tool do I need?"].map(q => (
            <button key={q} style={{ ...css.btnSmall("#6a6a9a"), fontSize: 10, padding: "4px 8px" }}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
