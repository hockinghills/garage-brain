// Garage Brain — shared theme
export const font = "'SF Mono', 'Fira Code', 'Courier New', monospace";
export const bg = "#08080a";
export const surface = "#111114";
export const border = "#1e1e24";
export const borderHi = "#2a2a34";
export const textPri = "#e8e8ec";
export const textSec = "#6e6e7a";
export const textDim = "#3e3e48";
export const accent = "#4ade80";

export const css = {
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
