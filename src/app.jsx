import { useState, useEffect, useCallback } from "react";

// ============================================================
// GARAGE BRAIN - Modular Vehicle Platform Skeleton
// Target deployment: Cloudflare Workers + Pages + R2 + D1
// ============================================================

// --- Data Layer (will be D1 + R2 on Cloudflare) ---
const VEHICLES = [
  {
    id: "leaf-2013",
    year: 2013,
    make: "Nissan",
    model: "Leaf SL",
    color: "#3b82f6",
    bolt: "5x114.3",
    obd: "CAN 11-bit 500k",
    icon: "⚡",
    notes: "HVAC blower dead. Blower transistor replaced fan already.",
    projects: [
      {
        id: "leaf-blower",
        title: "HVAC Blower Fix",
        status: "active",
        created: "2025-01-15",
        updated: "2025-01-15",
        module: "repair",
        fsmSections: ["HVAC — Blower Motor", "HVAC — Wiring Diagram"],
        notes: "Replaced fan motor, still dead. Suspect blower motor resistor/transistor. Located passenger footwell, accessible without full dash pull. Have replacement part on hand.",
        steps: [
          { text: "Verify 12V at blower connector with ignition on", done: false },
          { text: "Check blower transistor connector for power & signal", done: false },
          { text: "Test transistor output to blower motor", done: false },
          { text: "If no output → replace transistor (passenger footwell, 2 screws)", done: false },
          { text: "Verify all fan speeds working", done: false },
        ],
        parts: [{ name: "Blower motor transistor", status: "on-hand", partNo: "27761-3SB0A" }],
        tools: [
          { name: "Multimeter", have: true },
          { name: "Test light", have: true },
          { name: "Phillips #2 screwdriver", have: true },
          { name: "Trim removal tool", have: false, note: "For lower dash panel clips — or just be gentle" },
          { name: "10mm socket", have: true, note: "If you can find it" },
        ],
        troubleshooting: {
          symptom: "HVAC blower does not work on any speed",
          known: [
            { fact: "Blower motor replaced — still dead", eliminates: "Motor failure / seized / burned" },
            { fact: "All other electrical works fine", eliminates: "Main fuse / ignition circuit" },
          ],
          currentStep: 0,
          steps: [
            {
              id: "check-fuse",
              instruction: "Check fuse #33 (30A) in IPDM (under-hood fuse box)",
              detail: "This is the main blower motor fuse. Pull it and inspect visually, or test continuity with your multimeter.",
              fsmRef: "BL-8, PG-42",
              expect: "Fuse intact / continuity",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-blower-relay",
              instruction: "Check blower motor relay in IPDM",
              detail: "Swap with another identical relay in the box to test. Listen for click when turning fan switch on.",
              fsmRef: "BL-10",
              expect: "Relay clicks, or works with known-good swap",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-power-at-transistor",
              instruction: "Check 12V at blower transistor connector (passenger footwell)",
              detail: "3-pin connector on the transistor unit. With ignition ON and fan switch on, you should see 12V on the power input pin. Probe with multimeter — black lead to chassis ground.",
              fsmRef: "BL-12, EC-48",
              expect: "12V present at power pin",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-signal-at-transistor",
              instruction: "Check control signal at transistor connector",
              detail: "The BCM sends a variable signal to the transistor to control fan speed. With fan switch on different speeds, you should see varying voltage on the signal pin (typically 0-5V PWM).",
              fsmRef: "BL-12, EC-50",
              expect: "Voltage changes when fan speed selector is moved",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-transistor-output",
              instruction: "Check transistor output to blower motor",
              detail: "Measure voltage on the output side going to the motor. If you have power in and signal in but no output — transistor is dead. This is the most likely failure point since you already replaced the motor.",
              fsmRef: "BL-14",
              expect: "Voltage present, varies with speed setting",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "replace-transistor",
              instruction: "Replace blower motor transistor",
              detail: "2 screws hold it in. Passenger footwell, tucked up behind the lower dash panel on the HVAC housing. You should be able to reach it without pulling the dash — just remove the lower kick panel (2 clips + 1 screw). Part is on hand: 27761-3SB0A.",
              fsmRef: "BL-16",
              expect: "Blower works on all speeds after replacement",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "verify-all-speeds",
              instruction: "Verify all fan speeds 1-4 and defrost mode",
              detail: "Turn on the car, cycle through every fan speed. Let it run for a few minutes at max speed to confirm it doesn't cut out. Test defrost mode specifically since that's what made winter hell.",
              fsmRef: "BL-4",
              expect: "All speeds work, defrost blows strong",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
          ],
        },
      },
      {
        id: "leaf-alignment",
        title: "4-Wheel Alignment",
        status: "planned",
        created: "2026-04-11",
        module: "alignment",
        fsmSections: ["FSU — Front Suspension", "RSU — Rear Suspension"],
        notes: "Front tires fucked from running without alignment after suspension work. Front camber/caster NOT adjustable, toe only. Rear toe + camber adjustable.",
        steps: [],
        parts: [],
        tools: [
          { name: "Printed checkerboard targets", have: false },
          { name: "3D printed wheel mount (5x114.3)", have: false },
          { name: "19mm wrench (tie rod jam nut)", have: true },
          { name: "Tape measure", have: true },
        ],
      },
    ],
  },
  {
    year: 2003,
    make: "VW",
    model: "Golf",
    color: "#22c55e",
    bolt: "5x100",
    obd: "CAN / K-line",
    icon: "🟢",
    notes: "Won't start. Suspect fuel pump.",
    projects: [
      {
        id: "golf-nostart",
        title: "No-Start Diagnosis",
        status: "active",
        created: "2026-03-01",
        module: "diagnostics",
        fsmSections: ["Fuel Supply — Fuel Pump", "Engine Mgmt — Starting System", "Wiring — Fuel Pump Circuit"],
        notes: "Engine cranks, won't fire. Need to verify spark, fuel pressure, and immobilizer status. Check fuel pump relay first (common Mk4 failure).",
        steps: [
          { text: "Turn key to ON — listen for fuel pump prime (2sec hum from rear)", done: false },
          { text: "If no prime → check fuel pump relay (position 409 in relay panel)", done: false },
          { text: "Check fuse #28 (15A) fuel pump", done: false },
          { text: "If relay/fuse OK → test power at fuel pump connector (under rear seat)", done: false },
          { text: "If power OK → fuel pump is dead, replace", done: false },
          { text: "If no power → trace wiring, check grounds", done: false },
          { text: "Also verify: spark present at plugs, immobilizer light behavior", done: false },
        ],
        parts: [],
        tools: [
          { name: "Multimeter", have: true },
          { name: "Test light", have: true },
          { name: "Fuel pressure gauge", have: false, note: "Schrader valve on fuel rail — borrow or rent from AutoZone" },
          { name: "Spark tester", have: false, note: "Inline — cheap, worth having" },
          { name: "Relay puller or needle nose pliers", have: true },
          { name: "Spare fuel pump relay (for swap test)", have: false, note: "Same relay used in multiple spots, swap from another position to test" },
        ],
        troubleshooting: {
          symptom: "Engine cranks but will not start",
          known: [
            { fact: "Engine cranks at normal speed", eliminates: "Starter / battery / ignition switch" },
          ],
          currentStep: 0,
          steps: [
            {
              id: "listen-fuel-pump",
              instruction: "Turn key to ON (not start) — listen for fuel pump prime",
              detail: "Sit in the car, windows up, quiet. Turn key to ON position. You should hear a 2-second hum/whine from the rear of the car. This is the fuel pump pressurizing the rail. No sound = pump isn't running.",
              fsmRef: "Fuel Supply 20-1",
              expect: "2-second hum from rear of car",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-fuel-pump-relay",
              instruction: "Locate and test fuel pump relay — position 409 in relay panel",
              detail: "Under dash, driver side relay panel. Position 409. Pull it, inspect contacts for burning. Swap with an identical relay from another position (horn, AC, etc.) and re-test fuel pump prime. Common Mk4 failure — relay contacts burn out.",
              fsmRef: "Fuel Supply 20-4, Relay Panel 97-3",
              expect: "Fuel pump primes with swapped relay",
              testType: "choice",
              choices: [
                { label: "Pump primes with swapped relay", next: "confirm-relay-fix", color: "#4ade80" },
                { label: "Still no prime with swapped relay", next: "check-fuel-fuse", color: "#f87171" },
                { label: "Original relay was fine (pump primed in step 1)", next: "check-fuel-pressure", color: "#818cf8" },
              ],
              result: null, testedAt: null, note: "",
            },
            {
              id: "confirm-relay-fix",
              instruction: "Order a new relay — that was your problem",
              detail: "Common VW Mk4 failure. The relay is cheap (~$8). Order the correct one for position 409. In the meantime the swapped relay will work fine. Move on to verify the car actually starts.",
              fsmRef: "Fuel Supply 20-4",
              expect: "Car starts",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-fuel-fuse",
              instruction: "Check fuse #28 (15A) — fuel pump circuit",
              detail: "In the under-dash fuse panel. Pull and inspect, or test continuity. If blown, replace and test. If it blows again immediately, you have a short in the fuel pump wiring.",
              fsmRef: "Fuse Panel 97-5",
              expect: "Fuse intact",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-pump-power",
              instruction: "Test power at fuel pump connector (under rear seat)",
              detail: "Pull up the rear seat bottom (clips at front, pull up firmly). You'll see an access panel. Open it to find the fuel pump connector. With key ON, probe for 12V. If no power here but fuse and relay are good — wiring issue between relay panel and pump.",
              fsmRef: "Fuel Supply 20-8, Wiring 97-40",
              expect: "12V at fuel pump connector with key ON",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-fuel-pressure",
              instruction: "Check fuel pressure at rail",
              detail: "Connect fuel pressure gauge to Schrader valve on fuel rail. Key ON, engine off — should see ~55-60 PSI (3.8-4.1 bar) on the Mk4 2.0. If pump runs but pressure is low or zero, pump is weak/dead internally or filter is clogged. Rent gauge from AutoZone free.",
              fsmRef: "Fuel Supply 20-12",
              expect: "55-60 PSI / 3.8-4.1 bar",
              testType: "measurement",
              unit: "PSI",
              specMin: 50, specMax: 65,
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-spark",
              instruction: "Check for spark at plugs",
              detail: "Pull a coil pack connector, plug in an inline spark tester, crank engine. You should see a bright blue/white spark. No spark = coil, crank sensor, or ECU issue. Test multiple cylinders to rule out single coil failure.",
              fsmRef: "Ignition 28-1",
              expect: "Strong blue/white spark visible",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-immobilizer",
              instruction: "Check immobilizer light behavior on dash",
              detail: "Key to ON — watch the immobilizer light (car with key icon). Should flash briefly then go OFF. If it stays ON or flashes continuously, the immobilizer is not recognizing the key. Try your spare key. Common Mk4 issue — key transponder dies or cluster loses sync.",
              fsmRef: "Immobilizer 96-1",
              expect: "Light flashes then goes off within 2-3 seconds",
              testType: "choice",
              choices: [
                { label: "Light goes off (immobilizer OK)", next: "check-crank-sensor", color: "#4ade80" },
                { label: "Light stays on / keeps flashing", next: "immobilizer-issue", color: "#f87171" },
              ],
              result: null, testedAt: null, note: "",
            },
            {
              id: "immobilizer-issue",
              instruction: "Immobilizer is preventing start",
              detail: "Try your spare key first. If spare works — original key transponder is dead. If neither key works — immobilizer module has lost key adaptation. This requires VCDS/VAG-COM to re-adapt keys, or a locksmith with VW capability. Don't throw parts at this — it's a programming issue, not hardware.",
              fsmRef: "Immobilizer 96-4",
              expect: "Spare key starts the car, or VCDS re-adaptation needed",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
            {
              id: "check-crank-sensor",
              instruction: "Check crankshaft position sensor",
              detail: "If you have fuel AND no spark on any cylinder, the crank position sensor is suspect. Located on the bell housing, driver side. Check connector first — these corrode. Sensor resistance should be 700-1000 ohms. Common Mk4 failure — they die with no warning, no codes sometimes.",
              fsmRef: "Engine Sensors 24-12",
              expect: "Resistance 700-1000 ohms, connector clean",
              testType: "pass_fail",
              result: null, testedAt: null, note: "",
            },
          ],
        },
      },
    ],
  },
  {
    id: "ram-2000",
    year: 2000,
    make: "Dodge",
    model: "Ram 2500 Cummins",
    color: "#ef4444",
    bolt: "8x165.1",
    obd: "J1850 / CAN",
    icon: "🔴",
    notes: "47RE rebuilt but valve body not installed. 3 years. Don't tell anyone.",
    projects: [
      {
        id: "ram-47re",
        title: "47RE Valve Body Install",
        status: "active",
        created: "2023-06-01",
        updated: "2023-06-15",
        module: "repair",
        fsmSections: ["21 — Transmission", "21 — Valve Body", "21 — Fluid & Adjustments"],
        notes: "Trans rebuilt with shift improvement kits + HD components for known 47RE failure points. Torque converter refurbed and installed. Main trans on. VALVE BODY STILL OUT. Need to: install VB, adjust bands, fill fluid, test.",
        steps: [
          { text: "Locate valve body + shift kit components (garage shelf?)", done: false },
          { text: "Clean valve body mating surface on trans case", done: false },
          { text: "Install valve body with shift kit modifications per kit instructions", done: false },
          { text: "Torque VB bolts to spec (sequence matters)", done: false },
          { text: "Install new filter + gasket on pan", done: false },
          { text: "Adjust front band (kickdown) — back off, torque 72 in-lb, back off, 2.5 turns", done: false },
          { text: "Adjust rear band — back off, torque 72 in-lb, back off, 4 turns", done: false },
          { text: "Install pan, fill with ATF+4 (approx 4qt initial)", done: false },
          { text: "Start engine, shift through gears, check level, top off", done: false },
          { text: "Road test — check shift points, line pressure, temp", done: false },
        ],
        parts: [
          { name: "Valve body assembly (rebuilt w/ shift kit)", status: "on-hand" },
          { name: "Trans filter + gasket kit", status: "need" },
          { name: "ATF+4 (12qt)", status: "need" },
        ],
        tools: [
          { name: "Inch-pound torque wrench", have: true, note: "Critical for band adjustments — 72 in-lb" },
          { name: "Ft-lb torque wrench", have: true },
          { name: "T-handle ratchet (for VB bolts)", have: true },
          { name: "Transmission funnel w/ long neck", have: false, note: "Fill tube is awkward on the 2nd gen" },
          { name: "Drain pan (big — 12qt+)", have: true },
          { name: "Band adjustment tool / socket", have: true },
          { name: "Gasket scraper / razor blade", have: true },
          { name: "RTV sealant", have: false, note: "For pan if not using gasket" },
          { name: "OBD2 scanner (for trans temp monitoring)", have: true, note: "Use the Foxwell — it reads trans PIDs" },
        ],
      },
    ],
  },
  {
    id: "qx60-2013",
    year: 2013,
    make: "Infiniti",
    model: "QX60",
    color: "#a855f7",
    bolt: "5x114.3",
    obd: "CAN 11-bit 500k",
    icon: "🟣",
    notes: "Buddy's car. Needs alignment. Same bolt pattern as Leaf — shares mount plate.",
    projects: [
      {
        id: "qx60-alignment",
        title: "4-Wheel Alignment",
        status: "planned",
        module: "alignment",
        created: "2026-04-11",
        fsmSections: [],
        notes: "Find FSM. Same 5x114.3 bolt pattern as Leaf, same alignment target hardware works.",
        steps: [],
        parts: [],
        tools: [
          { name: "Printed checkerboard targets", have: false, note: "Same as Leaf set" },
          { name: "3D printed wheel mount (5x114.3)", have: false, note: "Shares with Leaf mount" },
        ],
      },
    ],
  },
];

const MODULES = [
  { id: "repair", name: "Repair Guide", icon: "🔧", desc: "Step-by-step FSM-guided repairs", color: "#f59e0b" },
  { id: "diagnostics", name: "Diagnostics", icon: "⚡", desc: "OBD2 + troubleshooting trees", color: "#3b82f6" },
  { id: "troubleshoot", name: "Troubleshoot", icon: "🔎", desc: "AI-flattened diagnostic paths from FSM", color: "#e879f9" },
  { id: "alignment", name: "Alignment", icon: "◎", desc: "Camera-based wheel alignment", color: "#4ade80" },
  { id: "maintenance", name: "Maintenance", icon: "🛢️", desc: "Service intervals & fluid tracking", color: "#8b5cf6" },
  { id: "obd_live", name: "OBD2 Live", icon: "📊", desc: "Real-time PID monitoring & logging", color: "#06b6d4" },
  { id: "parts", name: "Parts Bin", icon: "📦", desc: "Inventory of parts on hand", color: "#f87171" },
];

// --- Styles ---
const font = "'SF Mono', 'Fira Code', 'Courier New', monospace";
const bg = "#08080a";
const surface = "#111114";
const border = "#1e1e24";
const borderHi = "#2a2a34";
const textPri = "#e8e8ec";
const textSec = "#6e6e7a";
const textDim = "#3e3e48";
const accent = "#4ade80";

const css = {
  app: { minHeight: "100vh", background: bg, color: textPri, fontFamily: font, maxWidth: 520, margin: "0 auto" },
  header: {
    padding: "16px 20px", borderBottom: `1px solid ${border}`,
    position: "sticky", top: 0, zIndex: 20, background: bg,
    backdropFilter: "blur(12px)",
  },
  section: { padding: "0 20px" },
  card: {
    background: surface, border: `1px solid ${border}`, borderRadius: 10,
    padding: 16, marginBottom: 10, cursor: "pointer",
    transition: "border-color 0.15s",
  },
  btn: (color = accent) => ({
    background: `${color}15`, color, border: `1px solid ${color}40`,
    borderRadius: 8, padding: "12px 20px", fontSize: 13, fontWeight: 700,
    fontFamily: font, cursor: "pointer", width: "100%", letterSpacing: 0.5,
    transition: "all 0.15s",
  }),
  btnSmall: (color = accent) => ({
    background: `${color}10`, color, border: `1px solid ${color}30`,
    borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600,
    fontFamily: font, cursor: "pointer", letterSpacing: 0.5,
  }),
  tag: (color) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 4,
    background: `${color}15`, border: `1px solid ${color}30`,
    color, fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: font,
  }),
  input: {
    background: "#0c0c10", border: `1px solid ${border}`, borderRadius: 6,
    color: textPri, padding: "10px 12px", fontSize: 13, fontFamily: font,
    width: "100%", boxSizing: "border-box",
  },
  divider: { height: 1, background: border, margin: "16px 0" },
};

// --- Components ---
function StatusDot({ status }) {
  const colors = { active: "#4ade80", planned: "#818cf8", done: "#6e6e7a", stalled: "#f59e0b" };
  const c = colors[status] || textDim;
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: c, boxShadow: `0 0 6px ${c}60`, marginRight: 6,
    }} />
  );
}

function ProgressBar({ steps }) {
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

function BackButton({ onClick, label = "Back" }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", color: textSec, fontSize: 12,
      fontFamily: font, cursor: "pointer", padding: "4px 0", marginBottom: 12,
      display: "flex", alignItems: "center", gap: 4,
    }}>
      ← {label}
    </button>
  );
}

// --- Views ---
function GarageView({ vehicles, onSelectVehicle }) {
  const activeProjects = vehicles.reduce((n, v) => n + v.projects.filter(p => p.status === "active").length, 0);
  return (
    <div style={css.section}>
      <div style={{ padding: "20px 0 12px" }}>
        <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 4 }}>YOUR GARAGE</div>
        <div style={{ fontSize: 13, color: textDim }}>
          {vehicles.length} vehicles · {activeProjects} active projects
        </div>
      </div>
      {vehicles.map(v => {
        const active = v.projects.filter(p => p.status === "active");
        return (
          <div key={v.id} onClick={() => onSelectVehicle(v)}
            style={{ ...css.card, borderLeft: `3px solid ${v.color}` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = v.color}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.borderLeftColor = v.color; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{v.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: textPri }}>
                  {v.year} {v.make} {v.model}
                </div>
                <div style={{ fontSize: 11, color: textSec, marginTop: 2 }}>{v.bolt} · {v.obd}</div>
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
    </div>
  );
}

function VehicleView({ vehicle, onBack, onSelectProject, onNewProject }) {
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
          Bolt: {vehicle.bolt} · Protocol: {vehicle.obd}
        </div>
        <div style={{ ...css.divider }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={css.btnSmall("#818cf8")}>📄 FSM Library</button>
          <button style={css.btnSmall("#06b6d4")}>📊 OBD2 Connect</button>
          <button style={css.btnSmall("#f59e0b")}>🕐 History</button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 8 }}>PROJECTS</div>
      {vehicle.projects.map(p => (
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
          {p.updated && (
            <div style={{ fontSize: 10, color: textDim, marginTop: 6 }}>Last touched: {p.updated}</div>
          )}
        </div>
      ))}
      <button onClick={onNewProject} style={{ ...css.btn(), marginTop: 8 }}>
        + NEW PROJECT
      </button>
    </div>
  );
}

function ProjectView({ vehicle, project, onBack, onToggleStep, onUpdateNotes, onLaunchTroubleshoot }) {
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
              {project.fsmSections.map((s, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: i < project.fsmSections.length - 1 ? `1px solid ${border}` : "none",
                }}>
                  <span style={{ fontSize: 12, color: textSec }}>{s}</span>
                  <button style={css.btnSmall("#818cf8")}>Load</button>
                </div>
              ))}
              <button style={{ ...css.btnSmall("#818cf8"), marginTop: 8, width: "100%" }}>
                + Add FSM Section
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {project.notes && (
        <div style={{
          padding: 12, background: "#0f0f0a", borderRadius: 8,
          border: `1px solid #2a2a1a`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: "#8a8a4a", letterSpacing: 2, marginBottom: 6 }}>NOTES</div>
          <div style={{ fontSize: 12, color: "#c8c8a0", lineHeight: 1.7 }}>{project.notes}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              style={{ ...css.input, flex: 1, padding: "6px 10px", fontSize: 11, background: "#0a0a08", border: `1px solid #2a2a1a` }}
            />
            <button onClick={() => { if (newNote.trim()) { onUpdateNotes(newNote); setNewNote(""); } }}
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
                border: `2px solid ${step.done ? accent : borderHi}`,
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
                {part.partNo && <div style={{ fontSize: 10, color: textDim, marginTop: 2 }}>P/N: {part.partNo}</div>}
              </div>
              <span style={css.tag(part.status === "on-hand" ? accent : "#f87171")}>
                {part.status === "on-hand" ? "ON HAND" : "NEED"}
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
              {project.tools.filter(t => t.have).length}/{project.tools.length} ready
            </span>
          </div>
          {project.tools.filter(t => !t.have).length > 0 && (
            <div style={{
              background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 6,
              padding: "8px 10px", marginBottom: 10, fontSize: 11, color: "#f87171",
            }}>
              ⚠ {project.tools.filter(t => !t.have).length} tool{project.tools.filter(t => !t.have).length > 1 ? "s" : ""} missing — get these before you start
            </div>
          )}
          {project.tools.map((tool, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "7px 0",
              borderBottom: i < project.tools.length - 1 ? `1px solid #1a2a1a` : "none",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1 }}>
                <span style={{
                  fontSize: 13, marginTop: 1,
                  color: tool.have ? accent : "#f87171",
                }}>{tool.have ? "✓" : "✗"}</span>
                <div>
                  <div style={{ fontSize: 12, color: tool.have ? textSec : textPri }}>{tool.name}</div>
                  {tool.note && <div style={{ fontSize: 10, color: textDim, marginTop: 2, lineHeight: 1.4 }}>{tool.note}</div>}
                </div>
              </div>
              <span style={css.tag(tool.have ? "#2a4a2a" : "#f87171")}>
                {tool.have ? "HAVE" : "NEED"}
              </span>
            </div>
          ))}
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
            <button key={q} style={{
              ...css.btnSmall("#6a6a9a"),
              fontSize: 10, padding: "4px 8px",
            }}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TroubleshootView({ vehicle, project, onBack, onUpdateTroubleshooting }) {
  const ts = project.troubleshooting;
  if (!ts) return null;

  const [steps, setSteps] = useState(ts.steps);
  const [activeIdx, setActiveIdx] = useState(() => {
    const firstUntested = steps.findIndex(s => s.result === null);
    return firstUntested === -1 ? steps.length - 1 : firstUntested;
  });
  const [measureValue, setMeasureValue] = useState("");

  const activeStep = steps[activeIdx];
  const testedCount = steps.filter(s => s.result !== null).length;

  const recordResult = (result, note = "") => {
    const updated = [...steps];
    updated[activeIdx] = {
      ...updated[activeIdx],
      result,
      testedAt: new Date().toLocaleString(),
      note: note || updated[activeIdx].note,
    };
    setSteps(updated);

    // Auto-advance to next untested step
    const nextUntested = updated.findIndex((s, i) => i > activeIdx && s.result === null);
    if (nextUntested !== -1) {
      setTimeout(() => setActiveIdx(nextUntested), 300);
    }
  };

  const jumpToStep = (stepId) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx !== -1) setActiveIdx(idx);
  };

  const resultColor = (r) => r === "pass" ? accent : r === "fail" ? "#f87171" : r === "skipped" ? "#818cf8" : textDim;
  const resultIcon = (r) => r === "pass" ? "✓" : r === "fail" ? "✗" : r === "skipped" ? "→" : "○";

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
        <div style={{ fontSize: 13, color: textPri, marginBottom: 6 }}>
          {ts.symptom}
        </div>
        <div style={{ fontSize: 11, color: textSec }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </div>
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
        padding: 12, background: surface, borderRadius: 8,
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
              {/* Timeline dot + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                <div style={{
                  width: isActive ? 20 : 16, height: isActive ? 20 : 16,
                  borderRadius: "50%",
                  background: isTested ? `${resultColor(step.result)}20` : isActive ? "#e879f920" : `${border}`,
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
              {/* Step info */}
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
                  <div style={{ fontSize: 9, color: "#6a6a9a", marginTop: 2 }}>FSM: {step.fsmRef}</div>
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
              <button style={css.btnSmall("#818cf8")}>📄 {activeStep.fsmRef}</button>
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
                    style={{ ...css.btn(accent), flex: 1, padding: "14px 16px" }}>
                    ✓ PASS
                  </button>
                  <button onClick={() => recordResult("fail")}
                    style={{ ...css.btn("#f87171"), flex: 1, padding: "14px 16px" }}>
                    ✗ FAIL
                  </button>
                  <button onClick={() => recordResult("skipped")}
                    style={{ ...css.btn("#818cf8"), flex: "0 0 auto", padding: "14px 12px" }}>
                    SKIP
                  </button>
                </div>
              )}
              {activeStep.testType === "choice" && activeStep.choices && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeStep.choices.map((ch, i) => (
                    <button key={i} onClick={() => {
                      recordResult(ch.label);
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
                    <input
                      type="number"
                      value={measureValue}
                      onChange={e => setMeasureValue(e.target.value)}
                      placeholder={`Enter reading (${activeStep.unit || ''})`}
                      style={{ ...css.input, flex: 1 }}
                    />
                    <span style={{ color: textSec, fontSize: 14, alignSelf: "center" }}>{activeStep.unit}</span>
                  </div>
                  {activeStep.specMin != null && (
                    <div style={{ fontSize: 11, color: textDim, marginBottom: 8 }}>
                      Spec range: {activeStep.specMin} – {activeStep.specMax} {activeStep.unit}
                    </div>
                  )}
                  <button onClick={() => {
                    const val = parseFloat(measureValue);
                    const inSpec = val >= (activeStep.specMin || -Infinity) && val <= (activeStep.specMax || Infinity);
                    recordResult(inSpec ? "pass" : "fail", `${measureValue} ${activeStep.unit}`);
                    setMeasureValue("");
                  }} style={css.btn("#e879f9")}>
                    RECORD READING
                  </button>
                </div>
              )}

              {/* Note field */}
              <input
                placeholder="Add a note about this test..."
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
                {resultIcon(activeStep.result)} {typeof activeStep.result === 'string' ? activeStep.result.toUpperCase() : activeStep.result}
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
              }} style={{ ...css.btnSmall(textDim), marginTop: 8 }}>
                ↺ Re-test this step
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          style={{ ...css.btnSmall("#818cf8"), flex: 1, opacity: activeIdx === 0 ? 0.3 : 1 }}>
          ← Previous
        </button>
        <button onClick={onBack}
          style={{ ...css.btnSmall(textSec), flex: 1 }}>
          Back to Project
        </button>
        <button onClick={() => setActiveIdx(Math.min(steps.length - 1, activeIdx + 1))}
          disabled={activeIdx === steps.length - 1}
          style={{ ...css.btnSmall("#818cf8"), flex: 1, opacity: activeIdx === steps.length - 1 ? 0.3 : 1 }}>
          Next →
        </button>
      </div>
    </div>
  );
}

function NewProjectView({ vehicle, onBack, onCreate }) {
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
          onCreate({ title, module, notes, status: "active", steps: [], parts: [], tools: [], fsmSections: [] });
        }
      }} style={css.btn()}>
        CREATE PROJECT
      </button>
    </div>
  );
}

function ModulesView() {
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

// --- Main App ---
export default function GarageBrain() {
  const [vehicles, setVehicles] = useState(VEHICLES);
  const [view, setView] = useState("garage");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tab, setTab] = useState("garage");

  const handleSelectVehicle = (v) => { setSelectedVehicle(v); setView("vehicle"); };
  const handleSelectProject = (p) => { setSelectedProject(p); setView("project"); };

  const handleToggleStep = useCallback((stepIdx) => {
    setVehicles(prev => prev.map(v => {
      if (v.id !== selectedVehicle?.id) return v;
      return {
        ...v, projects: v.projects.map(p => {
          if (p.id !== selectedProject?.id) return p;
          const newSteps = [...p.steps];
          newSteps[stepIdx] = { ...newSteps[stepIdx], done: !newSteps[stepIdx].done };
          const updated = { ...p, steps: newSteps, updated: new Date().toISOString().split("T")[0] };
          setSelectedProject(updated);
          return updated;
        }),
      };
    }));
  }, [selectedVehicle, selectedProject]);

  const handleNewProject = (projectData) => {
    const newProject = {
      ...projectData,
      id: `${selectedVehicle.id}-${Date.now()}`,
      created: new Date().toISOString().split("T")[0],
    };
    setVehicles(prev => prev.map(v => {
      if (v.id !== selectedVehicle.id) return v;
      const updated = { ...v, projects: [...v.projects, newProject] };
      setSelectedVehicle(updated);
      return updated;
    }));
    setView("vehicle");
  };

  const tabs = [
    { id: "garage", label: "Garage", icon: "🏠" },
    { id: "modules", label: "Modules", icon: "⚙" },
    { id: "search", label: "Search", icon: "🔍" },
  ];

  return (
    <div style={css.app}>
      {/* Header */}
      <div style={css.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `${accent}15`, border: `1px solid ${accent}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>🧠</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: textPri }}>GARAGE BRAIN</div>
              <div style={{ fontSize: 9, color: textDim, letterSpacing: 3 }}>VEHICLE PLATFORM v0.1</div>
            </div>
          </div>
          <div style={{
            fontSize: 10, color: textDim, textAlign: "right", lineHeight: 1.5,
          }}>
            {vehicles.length} vehicles<br />
            {vehicles.reduce((n, v) => n + v.projects.filter(p => p.status === "active").length, 0)} active
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 80 }}>
        {view === "garage" && tab === "garage" && (
          <GarageView vehicles={vehicles} onSelectVehicle={handleSelectVehicle} />
        )}
        {view === "garage" && tab === "modules" && <ModulesView />}
        {view === "garage" && tab === "search" && (
          <div style={css.section}>
            <div style={{ padding: "20px 0" }}>
              <div style={{ fontSize: 11, color: textSec, letterSpacing: 2, marginBottom: 12 }}>SEARCH EVERYTHING</div>
              <input placeholder="Search vehicles, projects, FSM, parts..."
                style={{ ...css.input, fontSize: 14, padding: "14px 16px" }} />
              <div style={{ marginTop: 16 }}>
                {["47RE torque specs", "Leaf blower transistor location", "Golf fuel pump relay",
                  "QX60 alignment specs", "ATF+4 capacity Ram"].map(q => (
                  <button key={q} style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: "none", border: "none", borderBottom: `1px solid ${border}`,
                    color: textSec, fontSize: 12, fontFamily: font,
                    padding: "10px 0", cursor: "pointer",
                  }}>
                    🔍 {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {view === "vehicle" && selectedVehicle && (
          <VehicleView
            vehicle={selectedVehicle}
            onBack={() => setView("garage")}
            onSelectProject={handleSelectProject}
            onNewProject={() => setView("newproject")}
          />
        )}
        {view === "project" && selectedVehicle && selectedProject && (
          <ProjectView
            vehicle={selectedVehicle}
            project={selectedProject}
            onBack={() => { setView("vehicle"); setSelectedProject(null); }}
            onToggleStep={handleToggleStep}
            onLaunchTroubleshoot={() => setView("troubleshoot")}
            onUpdateNotes={(note) => {
              const ts = new Date().toLocaleString();
              setSelectedProject(prev => ({
                ...prev,
                notes: prev.notes + `\n\n[${ts}] ${note}`,
              }));
            }}
          />
        )}
        {view === "troubleshoot" && selectedVehicle && selectedProject && (
          <TroubleshootView
            vehicle={selectedVehicle}
            project={selectedProject}
            onBack={() => setView("project")}
          />
        )}
        {view === "newproject" && selectedVehicle && (
          <NewProjectView
            vehicle={selectedVehicle}
            onBack={() => setView("vehicle")}
            onCreate={handleNewProject}
          />
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 520,
        background: `${bg}f0`, backdropFilter: "blur(16px)",
        borderTop: `1px solid ${border}`,
        display: "flex", padding: "8px 0", zIndex: 20,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => {
            setTab(t.id);
            setView("garage");
            setSelectedVehicle(null);
            setSelectedProject(null);
          }} style={{
            flex: 1, background: "none", border: "none",
            color: tab === t.id ? accent : textDim,
            fontSize: 10, fontFamily: font, cursor: "pointer",
            padding: "6px 0", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, fontWeight: tab === t.id ? 700 : 400,
            letterSpacing: 1,
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
