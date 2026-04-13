import { useState, useEffect } from "react";
import { css, surface, border, textSec, textDim, textPri, accent, font } from "../styles.js";

// Map common FSM sub-section codes to the PDF section codes stored in R2.
// FSM refs like "BL-8" mean "Blower section, page/diagram 8"
// but the actual PDF file is HA.pdf (Heater and A/C).
const CODE_MAP = {
  // HVAC / blower system
  "BL": ["HA", "HAC"],       // Blower → Heater & A/C
  "EC": ["BCS", "EVC"],      // Electrical Control → Body Control / EV Control
  "PG": ["PG"],              // Power & Ground → direct match
  // General
  "BR": ["BR", "BRC"],       // Brake
  "ST": ["ST", "STC"],       // Steering
  "SRS": ["SRS", "SRSC"],    // Airbag
  "FSU": ["FSU"],            // Front Suspension
  "RSU": ["RSU"],            // Rear Suspension
  "TM": ["TM"],              // Transmission
  "DLK": ["DLK"],            // Door/Lock
  "SE": ["SE"],              // Seats
  "HA": ["HA", "HAC"],       // HVAC
  "EXL": ["EXL"],            // Exterior Lighting
  "ILL": ["ILL"],            // Interior Lighting
  "MWI": ["MWI"],            // Meters/Warning
  "WT": ["WT"],              // Wheels/Tires
  "MA": ["MA"],              // Maintenance
};

function parseRefCodes(fsmRef) {
  if (!fsmRef) return [];
  // "BL-8, PG-42" → ["BL", "PG"]
  // "Fuel Supply 20-1" → ["Fuel Supply"]
  return fsmRef.split(',').map(part => {
    const trimmed = part.trim();
    // Try "CODE-NUM" pattern first
    const match = trimmed.match(/^([A-Z]{2,5})-\d+/);
    if (match) return match[1];
    // Fallback: take the whole thing as a code
    return trimmed.split(/[\s-]/)[0];
  }).filter(Boolean);
}

export default function FSMRefLink({ fsmRef, vehicleId, style }) {
  const [showPicker, setShowPicker] = useState(false);
  const [sections, setSections] = useState([]);

  // Load available sections for this vehicle
  useEffect(() => {
    if (!showPicker || sections.length > 0) return;
    fetch(`/api/fsm/sections?vehicle_id=${encodeURIComponent(vehicleId)}`)
      .then(r => r.ok ? r.json() : { sections: [] })
      .then(d => setSections(d.sections || []))
      .catch(() => {});
  }, [showPicker, vehicleId]);

  if (!fsmRef) return null;

  const refCodes = parseRefCodes(fsmRef);

  // Find matching sections by mapping ref codes to PDF codes
  const getMatchingSections = () => {
    const pdfCodes = new Set();
    for (const code of refCodes) {
      const mapped = CODE_MAP[code];
      if (mapped) {
        mapped.forEach(c => pdfCodes.add(c));
      } else {
        pdfCodes.add(code);
      }
    }

    const matched = sections.filter(s => {
      // s.title looks like "HA — Heater and A/C System" or s.r2_key ends with "/HA.pdf"
      const titleCode = s.title?.split(/\s/)[0];
      const keyCode = s.r2_key?.split('/').pop()?.replace('.pdf', '');
      return pdfCodes.has(titleCode) || pdfCodes.has(keyCode);
    });

    return matched;
  };

  const openPdf = (section) => {
    window.open(`/api/fsm/view?key=${encodeURIComponent(section.r2_key)}`, '_blank');
    setShowPicker(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
        style={{ ...css.btnSmall("#818cf8"), ...(style || {}) }}>
        📄 {fsmRef}
      </button>

      {showPicker && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4,
          background: "#111118", border: "1px solid #2a2a3e", borderRadius: 8,
          padding: 8, zIndex: 50, minWidth: 220, maxHeight: 300, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          {sections.length === 0 && (
            <div style={{ fontSize: 11, color: textDim, padding: 8 }}>Loading sections...</div>
          )}
          {sections.length > 0 && (() => {
            const matched = getMatchingSections();
            const others = sections.filter(s => !matched.includes(s));
            return (
              <>
                {matched.length > 0 && (
                  <div style={{ fontSize: 9, color: "#818cf8", letterSpacing: 1, padding: "4px 8px", marginBottom: 4 }}>
                    LIKELY MATCH
                  </div>
                )}
                {matched.map((s, i) => (
                  <button key={s.id || i} onClick={() => openPdf(s)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: "#818cf810", border: "1px solid #818cf830",
                    borderRadius: 4, padding: "6px 8px", marginBottom: 4,
                    color: textPri, fontSize: 11, fontFamily: font, cursor: "pointer",
                  }}>
                    {s.title}
                  </button>
                ))}
                {others.length > 0 && (
                  <div style={{ fontSize: 9, color: textDim, letterSpacing: 1, padding: "4px 8px", marginTop: 4, marginBottom: 4 }}>
                    ALL SECTIONS
                  </div>
                )}
                {others.map((s, i) => (
                  <button key={s.id || i} onClick={() => openPdf(s)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: "none", border: "none",
                    padding: "5px 8px",
                    color: textSec, fontSize: 11, fontFamily: font, cursor: "pointer",
                    borderBottom: `1px solid ${border}`,
                  }}>
                    {s.title}
                  </button>
                ))}
                {matched.length === 0 && (
                  <div style={{ fontSize: 10, color: textDim, padding: "4px 8px", marginTop: 4 }}>
                    No direct match for "{fsmRef}" — pick a section above
                  </div>
                )}
              </>
            );
          })()}
          <button onClick={() => setShowPicker(false)} style={{
            display: "block", width: "100%", textAlign: "center", marginTop: 4,
            background: "none", border: "none", color: textDim,
            fontSize: 10, fontFamily: font, cursor: "pointer", padding: 6,
          }}>close</button>
        </div>
      )}
    </div>
  );
}
