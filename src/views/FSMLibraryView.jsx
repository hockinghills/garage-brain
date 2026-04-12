import { useState, useEffect } from "react";
import BackButton from "../components/BackButton.jsx";
import { LEAF_2013_FSM_SECTIONS } from "../constants.js";
import { css, surface, border, textSec, textDim, textPri, accent, font } from "../styles.js";

export default function FSMLibraryView({ vehicle, onBack }) {
  const [crawlStatus, setCrawlStatus] = useState(null);
  const [sections, setSections] = useState([]);
  const [customUrl, setCustomUrl] = useState("");
  const [selectedSource, setSelectedSource] = useState("nicoclub_nissan");
  const [progress, setProgress] = useState({ total: 0, downloaded: 0, failed: 0 });

  useEffect(() => {
    if (vehicle.id === "leaf-2013") {
      setSections(LEAF_2013_FSM_SECTIONS.map(s => ({ ...s, status: "available" })));
      setCrawlStatus("ready");
    }
  }, [vehicle.id]);

  const simulateCrawl = () => {
    setCrawlStatus("crawling");
    let downloaded = 0;
    const total = sections.length;
    setProgress({ total, downloaded: 0, failed: 0 });

    const interval = setInterval(() => {
      downloaded++;
      setSections(prev => prev.map((s, i) =>
        i < downloaded ? { ...s, status: "downloaded" } : s
      ));
      setProgress(p => ({ ...p, downloaded }));
      if (downloaded >= total) {
        clearInterval(interval);
        setCrawlStatus("done");
      }
    }, 200);
  };

  const sources = [
    { id: "nicoclub_nissan", name: "NICOclub — Nissan", supported: ["Leaf"] },
    { id: "nicoclub_infiniti", name: "NICOclub — Infiniti", supported: ["QX60"] },
    { id: "custom_url", name: "Custom URL / Upload", supported: ["any"] },
  ];

  const downloadedCount = sections.filter(s => s.status === "downloaded").length;

  return (
    <div style={css.section}>
      <BackButton onClick={onBack} label={`${vehicle.year} ${vehicle.make}`} />

      {/* Header */}
      <div style={{
        padding: 16, background: "#080a14", borderRadius: 10,
        border: "1px solid #1a1a3e", marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#818cf8" }}>FSM LIBRARY</div>
        </div>
        <div style={{ fontSize: 13, color: textPri }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
        <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
          {downloadedCount} of {sections.length} sections downloaded
        </div>
        {sections.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, background: "#1a1a24", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(downloadedCount / sections.length) * 100}%`,
                background: "#818cf8", borderRadius: 2, transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Source Selector */}
      <div style={{
        padding: 12, background: surface, borderRadius: 8,
        border: `1px solid ${border}`, marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 8 }}>SOURCE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sources.map(s => (
            <button key={s.id} onClick={() => setSelectedSource(s.id)} style={{
              ...css.card, marginBottom: 0, padding: "10px 12px", cursor: "pointer",
              borderColor: selectedSource === s.id ? "#818cf8" : border,
              background: selectedSource === s.id ? "#818cf808" : surface,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: selectedSource === s.id ? "#818cf8" : textPri }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 10, color: textDim }}>
                  {s.id === "custom_url" ? "Paste URL or upload PDF" : `Models: ${s.supported.join(", ")}`}
                </div>
              </div>
              {selectedSource === s.id && <span style={{ color: "#818cf8" }}>●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Custom URL input */}
      {selectedSource === "custom_url" && (
        <div style={{
          padding: 12, background: surface, borderRadius: 8,
          border: `1px solid ${border}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 8 }}>IMPORT URL</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
              placeholder="Paste FSM page URL or direct PDF link..."
              style={{ ...css.input, flex: 1, fontSize: 12 }} />
            <button style={css.btnSmall("#818cf8")}>Scan</button>
          </div>
          <div style={{ fontSize: 10, color: textDim, marginTop: 6, lineHeight: 1.5 }}>
            Paste a page with PDF links and we'll find them all, or drop in a direct PDF link.
          </div>
        </div>
      )}

      {/* Crawl Action */}
      {crawlStatus === "ready" && selectedSource !== "custom_url" && (
        <button onClick={simulateCrawl} style={{ ...css.btn("#818cf8"), marginBottom: 12 }}>
          ↓ DOWNLOAD ALL {sections.length} SECTIONS
        </button>
      )}

      {crawlStatus === "crawling" && (
        <div style={{
          padding: 12, background: "#080a14", borderRadius: 8,
          border: "1px solid #1a1a3e", marginBottom: 12, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "#818cf8", marginBottom: 8 }}>
            Downloading... {progress.downloaded}/{progress.total}
          </div>
          <div style={{ fontSize: 10, color: textDim }}>
            Rate-limited to respect NICOclub (3s between downloads)
          </div>
        </div>
      )}

      {crawlStatus === "done" && (
        <div style={{
          padding: 12, background: "#0a1a0a", borderRadius: 8,
          border: "1px solid #1a3a1a", marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, color: accent }}>✓ All {sections.length} sections downloaded and indexed</div>
          <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
            FSM is now searchable across all projects for this vehicle
          </div>
        </div>
      )}

      {/* Section List */}
      {sections.length > 0 && (
        <div style={{
          padding: 12, background: surface, borderRadius: 8,
          border: `1px solid ${border}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 10 }}>
            SECTIONS ({sections.length})
          </div>
          {sections.map((s, i) => (
            <div key={s.code} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "7px 0",
              borderBottom: i < sections.length - 1 ? `1px solid ${border}` : "none",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 11, color: s.status === "downloaded" ? accent : textDim,
                  width: 14, textAlign: "center",
                }}>
                  {s.status === "downloaded" ? "✓" : "○"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: s.status === "downloaded" ? textPri : textSec }}>{s.name}</div>
                  <div style={{ fontSize: 9, color: textDim }}>{s.code}</div>
                </div>
              </div>
              {s.status === "downloaded" ? (
                <button style={css.btnSmall(accent)}>View</button>
              ) : (
                <span style={{ fontSize: 10, color: textDim }}>pending</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {crawlStatus === "done" && (
        <div style={{
          padding: 12, background: "#080a14", borderRadius: 8,
          border: "1px solid #1a1a3e", marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, color: "#6a6a9a", letterSpacing: 2, marginBottom: 8 }}>SEARCH FSM</div>
          <input placeholder="e.g., blower motor transistor location..."
            style={{ ...css.input, fontSize: 12, background: "#06060e", border: "1px solid #1a1a3e" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {["blower transistor", "tie rod torque spec", "fuse layout", "wiring diagram HVAC"].map(q => (
              <button key={q} style={{ ...css.btnSmall("#6a6a9a"), fontSize: 10, padding: "4px 8px" }}>{q}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
