/**
 * Status is carried by the dot *and* the word — never by color alone, so it
 * survives colorblind vision, grayscale print and forced-colors mode.
 */
export function StatusPill({ online }: { online: boolean }) {
  return (
    <span className={`status-pill ${online ? "online" : "offline"}`}>
      <span className="dot" />
      {online ? "Online" : "Offline"}
    </span>
  );
}
