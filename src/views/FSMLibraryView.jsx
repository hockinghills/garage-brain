import { useState, useEffect, useRef, useCallback } from "react";
import BackButton from "../components/BackButton.jsx";
import * as api from "../api.js";
import { css, surface, border, textSec, textDim, textPri, accent, font } from "../styles.js";

// Map vehicle makes to crawler sources
function guessSource(vehicle) {
  const make = vehicle.make?.toLowerCase();
  if (make === "nissan") return "nicoclub_nissan";
  if (make === "infiniti") return "nicoclub_infiniti";
  return null;
}

function guessModel(vehicle) {
  // Strip trim level — "Leaf SL" → "Leaf", "QX60" → "QX60"
  return vehicle.model?.split(/\s+/)[0] || vehicle.model;
}

export default function FSMLibraryView({ vehicle, onBack }) {
  const [selectedSource, setSelectedSource] = useState(() => guessSource(vehicle) || "custom_url");
  const [customUrl, setCustomUrl] = useState("");

  // Crawler state
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [crawlError, setCrawlError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const pollingRef = useRef(null);

  // Existing FSM sections from D1
  const [existingSections, setExistingSections] = useState([]);

  // Load existing sections from D1 on mount
  useEffect(() => {
    fetch(`/api/fsm/sections?vehicle_id=${encodeURIComponent(vehicle.id)}`)
      .then(r => r.ok ? r.json() : { sections: [] })
      .then(d => setExistingSections(d.sections || []))
      .catch(() => {});
  }, [vehicle.id]);

  // Poll job status
  const pollStatus = useCallback(async (id) => {
    try {
      const data = await api.getCrawlStatus(id);
      setJobData(data);
      return data;
    } catch (e) {
      setCrawlError(e.message);
      return null;
    }
  }, []);

  // Process next batch + poll
  const processNextBatch = useCallback(async (id) => {
    setContinuing(true);
    try {
      const result = await api.continueFSMCrawl(id);
      // Fetch fresh status after processing
      const fresh = await pollStatus(id);
      if (fresh && fresh.status !== "complete" && fresh.status !== "partial") {
        // More work to do — wait 2s then process next batch
        pollingRef.current = setTimeout(() => processNextBatch(id), 2000);
      }
    } catch (e) {
      // 409 means a batch is still processing — retry
      if (e.message?.includes("409") || e.message?.includes("still processing")) {
        pollingRef.current = setTimeout(() => processNextBatch(id), 3000);
      } else {
        setCrawlError(e.message);
      }
    }
    setContinuing(false);
  }, [pollStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // Start crawl
  const startCrawl = async () => {
    setStarting(true);
    setCrawlError(null);
    try {
      const model = guessModel(vehicle);
      const year = String(vehicle.year);
      const result = await api.startFSMCrawl(vehicle.id, selectedSource, model, year);
      setJobId(result.jobId);
      // Immediately fetch status to populate UI
      await pollStatus(result.jobId);
      // Start processing batches
      processNextBatch(result.jobId);
    } catch (e) {
      setCrawlError(e.message);
    }
    setStarting(false);
  };

  // Derived state
  const sections = jobData?.sections || [];
  const downloaded = jobData?.downloaded || 0;
  const failed = jobData?.failed || 0;
  const total = jobData?.total || sections.length;
  const pending = sections.filter(s => s.status === "pending" || s.status === "in_progress").length;
  const isDone = jobData?.status === "complete" || jobData?.status === "partial";
  const isRunning = jobId && !isDone && !crawlError;

  const sources = [
    { id: "nicoclub_nissan", name: "NICOclub — Nissan", models: "Leaf, Altima, Maxima, Frontier, etc." },
    { id: "nicoclub_infiniti", name: "NICOclub — Infiniti", models: "QX60, Q50, G35, G37, etc." },
    { id: "custom_url", name: "Custom URL / Upload", models: "Any — paste URL or upload PDF" },
  ];

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
        {total > 0 && (
          <>
            <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
              {downloaded} downloaded · {failed > 0 ? `${failed} failed · ` : ""}{pending} remaining
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, background: "#1a1a24", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${((downloaded + failed) / total) * 100}%`,
                  background: failed > 0 ? "#f59e0b" : "#818cf8",
                  borderRadius: 2, transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          </>
        )}
        {existingSections.length > 0 && !jobId && (
          <div style={{ fontSize: 11, color: accent, marginTop: 6 }}>
            ✓ {existingSections.length} sections already in library
          </div>
        )}
      </div>

      {/* Source Selector — only show before crawl starts */}
      {!jobId && (
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
                  <div style={{ fontSize: 10, color: textDim }}>{s.models}</div>
                </div>
                {selectedSource === s.id && <span style={{ color: "#818cf8" }}>●</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom URL input */}
      {selectedSource === "custom_url" && !jobId && (
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

      {/* Error */}
      {crawlError && (
        <div style={{
          padding: 12, background: "#1a0808", borderRadius: 8,
          border: "1px solid #3a1a1a", marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: "#f87171", marginBottom: 4 }}>Crawl Error</div>
          <div style={{ fontSize: 11, color: textSec, lineHeight: 1.5 }}>{crawlError}</div>
          <button onClick={() => { setCrawlError(null); setJobId(null); setJobData(null); }}
            style={{ ...css.btnSmall("#f87171"), marginTop: 8 }}>Dismiss</button>
        </div>
      )}

      {/* Start button */}
      {!jobId && !crawlError && selectedSource !== "custom_url" && (
        <button onClick={startCrawl} disabled={starting}
          style={{ ...css.btn("#818cf8"), marginBottom: 12, opacity: starting ? 0.5 : 1 }}>
          {starting ? "Starting crawler..." : `↓ DOWNLOAD FSM — ${vehicle.year} ${guessModel(vehicle)}`}
        </button>
      )}

      {/* Active crawl status */}
      {isRunning && (
        <div style={{
          padding: 12, background: "#080a14", borderRadius: 8,
          border: "1px solid #1a1a3e", marginBottom: 12, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "#818cf8", marginBottom: 8 }}>
            {continuing ? `Downloading... ${downloaded}/${total}` : `Waiting... ${downloaded}/${total}`}
          </div>
          <div style={{ fontSize: 10, color: textDim }}>
            Rate-limited — 3s between downloads, 5 per batch
          </div>
        </div>
      )}

      {/* Done */}
      {isDone && (
        <div style={{
          padding: 12,
          background: jobData.status === "complete" ? "#0a1a0a" : "#1a1a0a",
          borderRadius: 8,
          border: `1px solid ${jobData.status === "complete" ? "#1a3a1a" : "#3a3a1a"}`,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, color: jobData.status === "complete" ? accent : "#f59e0b" }}>
            {jobData.status === "complete"
              ? `✓ All ${total} sections downloaded`
              : `⚠ ${downloaded} downloaded, ${failed} failed`}
          </div>
          <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
            FSM sections stored in R2 and indexed in D1
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
          {sections.map((s, i) => {
            const statusColor = s.status === "done" ? accent
              : s.status === "failed" ? "#f87171"
              : s.status === "in_progress" ? "#818cf8"
              : textDim;
            const statusIcon = s.status === "done" ? "✓"
              : s.status === "failed" ? "✗"
              : s.status === "in_progress" ? "↻"
              : "○";
            return (
              <div key={s.code} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 0",
                borderBottom: i < sections.length - 1 ? `1px solid ${border}` : "none",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: statusColor, width: 14, textAlign: "center" }}>
                    {statusIcon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: s.status === "done" ? textPri : textSec }}>{s.name}</div>
                    <div style={{ fontSize: 9, color: textDim }}>
                      {s.code}
                      {s.error && <span style={{ color: "#f87171" }}> — {s.error}</span>}
                    </div>
                  </div>
                </div>
                {s.status === "done" && (
                  <button style={css.btnSmall(accent)}>View</button>
                )}
                {s.status === "failed" && (
                  <span style={{ fontSize: 10, color: "#f87171" }}>failed</span>
                )}
                {(s.status === "pending" || s.status === "in_progress") && (
                  <span style={{ fontSize: 10, color: textDim }}>
                    {s.status === "in_progress" ? "downloading..." : "pending"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Existing sections from D1 (when no active crawl) */}
      {!jobId && existingSections.length > 0 && (
        <div style={{
          padding: 12, background: surface, borderRadius: 8,
          border: `1px solid ${border}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 10 }}>
            DOWNLOADED ({existingSections.length})
          </div>
          {existingSections.map((s, i) => (
            <div key={s.id || i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "7px 0",
              borderBottom: i < existingSections.length - 1 ? `1px solid ${border}` : "none",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: accent }}>✓</span>
                <span style={{ fontSize: 12, color: textPri }}>{s.title}</span>
              </div>
              <button style={css.btnSmall(accent)}>View</button>
            </div>
          ))}
        </div>
      )}

      {/* Search — when we have sections */}
      {(isDone || existingSections.length > 0) && (
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
