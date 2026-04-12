import { textDim } from "../styles.js";

const STATUS_COLORS = {
  active: "#4ade80",
  planned: "#818cf8",
  done: "#6e6e7a",
  stalled: "#f59e0b",
};

export default function StatusDot({ status }) {
  const c = STATUS_COLORS[status] || textDim;
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: c, boxShadow: `0 0 6px ${c}60`, marginRight: 6,
    }} />
  );
}
