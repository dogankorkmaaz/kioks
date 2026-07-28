import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useDeviceHeartbeats,
  useDevices,
  useLatestScreenshot,
  useSendDeviceCommand,
} from "../api/queries";
import type { CommandType } from "../api/types";

const COMMANDS: { type: CommandType; label: string }[] = [
  { type: "RELOAD", label: "Reload" },
  { type: "LOCK", label: "Lock" },
  { type: "UNLOCK", label: "Unlock" },
  { type: "RESTART_APP", label: "Restart app" },
  { type: "REBOOT", label: "Reboot device" },
  { type: "REQUEST_SCREENSHOT", label: "Request screenshot" },
  { type: "APPLY_PROFILE", label: "Re-apply profile" },
];

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: devices } = useDevices();
  const { data: heartbeats } = useDeviceHeartbeats(id ?? null);
  const { data: screenshot } = useLatestScreenshot(id ?? null);
  const sendCommand = useSendDeviceCommand();

  const device = devices?.find((d) => d.id === id);
  const [newUrl, setNewUrl] = useState("");

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
      <p>
        <Link to="/devices">&larr; Devices</Link>
      </p>
      <div className="page-header">
        <h2>{device.name}</h2>
        <span className={`status-dot ${device.isOnline ? "online" : "offline"}`} />
        {device.isOnline ? "Online" : "Offline"}
      </div>

      <div className="card">
        <h3>Commands</h3>
        <div className="command-bar">
          {COMMANDS.map((c) => (
            <button
              key={c.type}
              disabled={sendCommand.isPending}
              onClick={() => sendCommand.mutate({ deviceId: device.id, type: c.type })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Change website</h3>
        <p className="muted">
          Quick override without editing a full profile — applied directly on the device as soon as it's picked up,
          no profile assignment needed.
        </p>
        <form className="inline-form" onSubmit={onSetUrl}>
          <input
            placeholder="https://…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            style={{ minWidth: 320 }}
          />
          <button className="primary" type="submit" disabled={sendCommand.isPending}>
            Set URL
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Details</h3>
        <table>
          <tbody>
            <tr>
              <th>Device ID</th>
              <td>
                <code>{device.id}</code>
              </td>
            </tr>
            <tr>
              <th>Battery</th>
              <td>{device.batteryLevel != null ? `${device.batteryLevel}%` : "—"}</td>
            </tr>
            <tr>
              <th>Current URL/app</th>
              <td>{device.currentUrlOrApp ?? "—"}</td>
            </tr>
            <tr>
              <th>IP address</th>
              <td>{device.ipAddress ?? "—"}</td>
            </tr>
            <tr>
              <th>App version</th>
              <td>{device.appVersion ?? "—"}</td>
            </tr>
            <tr>
              <th>Android version</th>
              <td>{device.androidVersion ?? "—"}</td>
            </tr>
            <tr>
              <th>Group</th>
              <td>{device.group?.name ?? "—"}</td>
            </tr>
            <tr>
              <th>Profile</th>
              <td>{device.profile?.name ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Latest screenshot</h3>
        {screenshot ? (
          <>
            <img
              className="screenshot-preview"
              src={`/api/admin/screenshot-files/${screenshot.filePath}`}
              alt={`Screenshot from ${device.name}`}
            />
            <p className="muted">Captured {new Date(screenshot.capturedAt).toLocaleString()}</p>
          </>
        ) : (
          <p className="muted">No screenshot yet — use "Request screenshot" above.</p>
        )}
      </div>

      <div className="card">
        <h3>Heartbeat history</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Battery</th>
              <th>URL/app</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {heartbeats?.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.timestamp).toLocaleString()}</td>
                <td>{h.batteryLevel != null ? `${h.batteryLevel}%` : "—"}</td>
                <td className="muted">{h.currentUrlOrApp ?? "—"}</td>
                <td className="muted">{h.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {heartbeats?.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No heartbeats yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
