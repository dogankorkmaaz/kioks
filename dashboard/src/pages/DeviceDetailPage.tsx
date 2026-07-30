import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useDeviceHeartbeats,
  useDevices,
  useLatestScreenshot,
  useSendDeviceCommand,
} from "../api/queries";
import type { CommandType } from "../api/types";
import { StatusPill } from "../components/StatusPill";
import {
  IconCamera,
  IconChevronLeft,
  IconLink,
  IconLock,
  IconPower,
  IconRefresh,
  IconRotate,
  IconSliders,
  IconUnlock,
} from "../components/Icons";

const COMMANDS: { type: CommandType; label: string; icon: typeof IconRefresh }[] = [
  { type: "RELOAD", label: "Reload", icon: IconRefresh },
  { type: "LOCK", label: "Lock", icon: IconLock },
  { type: "UNLOCK", label: "Unlock", icon: IconUnlock },
  { type: "RESTART_APP", label: "Restart app", icon: IconRotate },
  { type: "REBOOT", label: "Reboot", icon: IconPower },
  { type: "REQUEST_SCREENSHOT", label: "Screenshot", icon: IconCamera },
  { type: "APPLY_PROFILE", label: "Re-apply profile", icon: IconSliders },
];

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: devices } = useDevices();
  const { data: heartbeats } = useDeviceHeartbeats(id ?? null);
  const { data: screenshot } = useLatestScreenshot(id ?? null);
  const sendCommand = useSendDeviceCommand();
  const [newUrl, setNewUrl] = useState("");

  const device = devices?.find((d) => d.id === id);

  if (!device) return <p className="muted">Loading device…</p>;

  const onSetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    sendCommand.mutate(
      { deviceId: device.id, type: "SET_URL", payload: { url: newUrl.trim() } },
      { onSuccess: () => setNewUrl("") },
    );
  };

  return (
    <div>
      <Link to="/devices" className="back-link">
        <IconChevronLeft size={15} />
        All devices
      </Link>

      <div className="page-header">
        <div>
          <h2>{device.name}</h2>
          <p className="section-sub mono">{device.id}</p>
        </div>
        <StatusPill online={device.isOnline} />
      </div>

      <div className="card">
        <h3>Commands</h3>
        <p className="section-sub" style={{ marginBottom: "var(--sp-3)" }}>
          Queued and picked up on the device's next poll — usually within 20 seconds.
        </p>
        <div className="command-bar">
          {COMMANDS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              disabled={sendCommand.isPending}
              onClick={() => sendCommand.mutate({ deviceId: device.id, type })}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Change website</h3>
        <p className="section-sub" style={{ marginBottom: "var(--sp-3)" }}>
          A quick per-device override — no profile assignment needed.
        </p>
        <form className="inline-form" onSubmit={onSetUrl}>
          <input
            placeholder="https://…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            style={{ flex: 1, minWidth: 260 }}
          />
          <button className="primary" type="submit" disabled={sendCommand.isPending}>
            <IconLink size={16} />
            Set URL
          </button>
        </form>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>Details</h3>
          <dl className="kv-list" style={{ marginTop: "var(--sp-2)" }}>
            <div className="kv-row">
              <dt>Current URL / app</dt>
              <dd>{device.currentUrlOrApp ?? "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>Battery</dt>
              <dd>{device.batteryLevel != null ? `${device.batteryLevel}%` : "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>IP address</dt>
              <dd className="mono">{device.ipAddress ?? "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>Model</dt>
              <dd>{device.model ?? "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>Android version</dt>
              <dd>{device.androidVersion ?? "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>App version</dt>
              <dd>{device.appVersion ?? "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>Group</dt>
              <dd>{device.group?.name ?? "—"}</dd>
            </div>
            <div className="kv-row">
              <dt>Profile</dt>
              <dd>{device.profile?.name ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h3>Latest screenshot</h3>
          {screenshot ? (
            <>
              <img
                className="screenshot-preview"
                style={{ marginTop: "var(--sp-3)" }}
                src={`/api/admin/screenshot-files/${screenshot.filePath}`}
                alt={`Screen of ${device.name}`}
              />
              <p className="section-sub" style={{ marginTop: "var(--sp-2)" }}>
                Captured {new Date(screenshot.capturedAt).toLocaleString()}
              </p>
            </>
          ) : (
            <div className="empty-state">
              <IconCamera size={34} />
              <div className="empty-title">No screenshot yet</div>
              <div>Use the “Screenshot” command above.</div>
            </div>
          )}
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-head">
          <h3>Heartbeat history</h3>
          <span className="badge">{heartbeats?.length ?? 0} entries</span>
        </div>
        {heartbeats?.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No heartbeats yet</div>
            <div>The device reports in once it is enrolled and online.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="num">Time</th>
                  <th className="num">Battery</th>
                  <th>URL / app</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {heartbeats?.map((h) => (
                  <tr key={h.id}>
                    <td className="num">{new Date(h.timestamp).toLocaleString()}</td>
                    <td className="num">{h.batteryLevel != null ? `${h.batteryLevel}%` : "—"}</td>
                    <td className="muted">{h.currentUrlOrApp ?? "—"}</td>
                    <td className="muted mono">{h.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
