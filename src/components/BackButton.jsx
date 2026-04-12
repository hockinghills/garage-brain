import { textSec, font } from "../styles.js";

export default function BackButton({ onClick, label = "Back" }) {
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
