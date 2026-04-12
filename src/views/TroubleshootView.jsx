import { useState, useEffect, useRef } from "react";
import BackButton from "../components/BackButton.jsx";
import FSMRefLink from "../components/FSMRefLink.jsx";
import { css, border, textSec, textDim, textPri, accent, font } from "../styles.js";

export default function TroubleshootView({ vehicle, project, onBack, onSave }) {
  const ts = project.troubleshooting;
  if (!ts) return null;

  const [steps, setSteps] = useState(ts.steps);
  const [activeIdx, setActiveIdx] = useState(() => {
    const firstUntested = steps.findIndex(s => s.result === null);
    return firstUntested === -1 ? steps.length - 1 : firstUntested;
  });
  const [measureValue, setMeasureValue] = useState("");
  const isFirstRender = useRef(true);

  // Persist troubleshooting results whenever steps change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (onSave) {
      onSave({ steps });
    }
  }, [steps]);

  const activeStep = steps[activeIdx];
  const testedCount = steps.filter(s => s.result !== null).length;

  const resultColor = (r) => r === "pass" ? accent : r === "fail" ? "#f87171" : r === "skipped" ? "#818cf8" : textDim;
  const resultIcon = (r) => r === "pass" ? "✓" : r === "fail" ? "✗" : r === "skipped" ? "→" : "○";

  const recordResult = (result, note = "", { autoAdvance = true } = {}) => {
    const updated = [...steps];
    updated[activeIdx] = {
      ...updated[activeIdx],
      result,
      testedAt: new Date().toLocaleString(),
      note: note || updated[activeIdx].note,
    };
    setSteps(updated);

    if (autoAdvance) {
      const nextUntested = updated.findIndex((s, i) => i > activeIdx && s.result === null);
      if (nextUntested !== -1) {
        setTimeout(() => setActiveIdx(nextUntested), 300);
      }
    }
  };

  const jumpToStep = (stepId) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx !== -1) setActiveIdx(idx);
  };

  return (
    <div style={css.section}>
      <BackButton onClick={onBack} label={project.title} />

      {/* Header */}
      <div style={{
        padding: 16, background: "#12081a", borderRadius: 10,
        border: "1px solid #2a1a3a", marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>🔎</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e879f9" }}>TROUBLESHOOTING</div>
        </div>
        <div style={{ fontSize: 13, color: textPri, marginBottom: 6 }}>{ts.symptom}</div>
        <div style={{ fontSize: 11, color: textSec }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: textSec }}>{testedCount}/{steps.length} tests completed</span>
          </div>
          <div style={{ height: 3, background: "#1a1a24", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(testedCount / steps.length) * 100}%`,
              background: "#e879f9", borderRadius: 2, transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Known Facts */}
      {ts.known?.length > 0 && (
        <div style={{
          padding: 10, background: "#0a0f0a", borderRadius: 8,
          border: "1px solid #1a2e1a", marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: "#5a9a5a", letterSpacing: 2, marginBottom: 6 }}>ALREADY KNOWN</div>
          {ts.known.map((k, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 11 }}>
              <span style={{ color: accent }}>✓</span>{" "}
              <span style={{ color: textSec }}>{k.fact}</span>
              <span style={{ color: textDim, fontSize: 10 }}> — eliminates: {k.eliminates}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{
        padding: 12, background: "#111114", borderRadius: 8,
        border: `1px solid ${border}`, marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: textSec, letterSpacing: 2, marginBottom: 10 }}>DIAGNOSTIC PATH</div>
        {steps.map((step, i) => {
          const isActive = i === activeIdx;
          const isTested = step.result !== null;
          return (
            <div key={step.id} onClick={() => setActiveIdx(i)} style={{
              display: "flex", gap: 10, cursor: "pointer",
              padding: "8px 0",
              borderBottom: i < steps.length - 1 ? `1px solid ${border}` : "none",
              opacity: (!isTested && !isActive) ? 0.4 : 1,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                <div style={{
                  width: isActive ? 20 : 16, height: isActive ? 20 : 16,
                  borderRadius: "50%",
                  background: isTested ? `${resultColor(step.result)}20` : isActive ? "#e879f920" : border,
                  border: `2px solid ${isTested ? resultColor(step.result) : isActive ? "#e879f9" : border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: resultColor(step.result),
                  fontWeight: 700, transition: "all 0.15s",
                }}>
                  {isTested ? resultIcon(step.result) : isActive ? "●" : ""}
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 2, flex: 1, minHeight: 8,
                    background: isTested ? `${resultColor(step.result)}40` : border,
                  }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{
                  fontSize: 12, fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#e879f9" : isTested ? textSec : textDim,
                }}>
                  {step.instruction}
                </div>
                {isTested && step.testedAt && (
                  <div style={{ fontSize: 10, color: textDim, marginTop: 2 }}>
                    {resultIcon(step.result)} {step.result.toUpperCase()} — {step.testedAt}
                    {step.note && ` — "${step.note}"`}
                  </div>
                )}
                {step.fsmRef && (
                  <div style={{ fontSize: 9, color: "#6a6a9a", marginTop: 2 }}>
                    <FSMRefLink fsmRef={step.fsmRef} vehicleId={vehicle.id}
                      style={{ fontSize: 9, padding: "2px 6px" }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Step Detail */}
      {activeStep && (
        <div style={{
          padding: 16, background: "#12081a", borderRadius: 10,
          border: "2px solid #3a1a5a", marginBottom: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#e879f9", letterSpacing: 2 }}>
              STEP {activeIdx + 1} OF {steps.length}
            </div>
            {activeStep.fsmRef && (
              <FSMRefLink fsmRef={activeStep.fsmRef} vehicleId={vehicle.id} />
            )}
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: textPri, lineHeight: 1.5, marginBottom: 10 }}>
            {activeStep.instruction}
          </div>

          <div style={{
            fontSize: 12, color: "#c8c0d8", lineHeight: 1.8, marginBottom: 12,
            padding: 12, background: "#0e0618", borderRadius: 6,
          }}>
            {activeStep.detail}
          </div>

          {activeStep.expect && (
            <div style={{
              padding: "8px 12px", background: `${accent}08`, border: `1px solid ${accent}25`,
              borderRadius: 6, marginBottom: 12,
            }}>
              <span style={{ fontSize: 10, color: accent, letterSpacing: 1 }}>EXPECTED: </span>
              <span style={{ fontSize: 12, color: accent }}>{activeStep.expect}</span>
            </div>
          )}

          {/* Result Buttons */}
          {activeStep.result === null && (
            <div style={{ marginTop: 8 }}>
              {activeStep.testType === "pass_fail" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => recordResult("pass")}
                    style={{ ...css.btn(accent), flex: 1, padding: "14px 16px" }}>✓ PASS</button>
                  <button onClick={() => recordResult("fail")}
                    style={{ ...css.btn("#f87171"), flex: 1, padding: "14px 16px" }}>✗ FAIL</button>
                  <button onClick={() => recordResult("skipped")}
                    style={{ ...css.btn("#818cf8"), flex: "0 0 auto", padding: "14px 12px" }}>SKIP</button>
                </div>
              )}
              {activeStep.testType === "choice" && activeStep.choices && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeStep.choices.map((ch, i) => (
                    <button key={i} onClick={() => {
                      recordResult(ch.label, "", { autoAdvance: !ch.next });
                      if (ch.next) jumpToStep(ch.next);
                    }} style={{ ...css.btn(ch.color || "#818cf8"), padding: "14px 16px", textAlign: "left" }}>
                      {ch.label}
                    </button>
                  ))}
                </div>
              )}
              {activeStep.testType === "measurement" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="number" value={measureValue}
                      onChange={e => setMeasureValue(e.target.value)}
                      placeholder={`Enter reading (${activeStep.unit || ''})`}
                      style={{ ...css.input, flex: 1 }} />
                    <span style={{ color: textSec, fontSize: 14, alignSelf: "center" }}>{activeStep.unit}</span>
                  </div>
                  {activeStep.specMin != null && (
                    <div style={{ fontSize: 11, color: textDim, marginBottom: 8 }}>
                      Spec range: {activeStep.specMin} – {activeStep.specMax} {activeStep.unit}
                    </div>
                  )}
                  <button onClick={() => {
                    const val = parseFloat(measureValue);
                    if (measureValue.trim() === "" || Number.isNaN(val)) return;
                    const inSpec = val >= (activeStep.specMin ?? -Infinity) && val <= (activeStep.specMax ?? Infinity);
                    recordResult(inSpec ? "pass" : "fail", `${val} ${activeStep.unit}`);
                    setMeasureValue("");
                  }} disabled={measureValue.trim() === ""} style={{
                    ...css.btn("#e879f9"),
                    opacity: measureValue.trim() === "" ? 0.4 : 1,
                  }}>RECORD READING</button>
                </div>
              )}

              <input placeholder="Add a note about this test..."
                onBlur={e => {
                  if (e.target.value) {
                    const updated = [...steps];
                    updated[activeIdx] = { ...updated[activeIdx], note: e.target.value };
                    setSteps(updated);
                  }
                }}
                style={{ ...css.input, marginTop: 8, fontSize: 11, padding: "8px 10px", background: "#0e0618", border: "1px solid #2a1a3a" }}
              />
            </div>
          )}

          {/* Already tested */}
          {activeStep.result !== null && (
            <div style={{
              padding: 12, background: `${resultColor(activeStep.result)}10`,
              border: `1px solid ${resultColor(activeStep.result)}30`,
              borderRadius: 8, marginTop: 8,
            }}>
              <div style={{ fontSize: 13, color: resultColor(activeStep.result), fontWeight: 700 }}>
                {resultIcon(activeStep.result)} {typeof activeStep.result === "string" ? activeStep.result.toUpperCase() : activeStep.result}
              </div>
              {activeStep.testedAt && (
                <div style={{ fontSize: 10, color: textDim, marginTop: 4 }}>Tested: {activeStep.testedAt}</div>
              )}
              {activeStep.note && (
                <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>Note: {activeStep.note}</div>
              )}
              <button onClick={() => {
                const updated = [...steps];
                updated[activeIdx] = { ...updated[activeIdx], result: null, testedAt: null, note: "" };
                setSteps(updated);
              }} style={{ ...css.btnSmall(textDim), marginTop: 8 }}>↺ Re-test this step</button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          style={{ ...css.btnSmall("#818cf8"), flex: 1, opacity: activeIdx === 0 ? 0.3 : 1 }}>← Previous</button>
        <button onClick={onBack}
          style={{ ...css.btnSmall(textSec), flex: 1 }}>Back to Project</button>
        <button onClick={() => setActiveIdx(Math.min(steps.length - 1, activeIdx + 1))}
          disabled={activeIdx === steps.length - 1}
          style={{ ...css.btnSmall("#818cf8"), flex: 1, opacity: activeIdx === steps.length - 1 ? 0.3 : 1 }}>Next →</button>
      </div>
    </div>
  );
}
