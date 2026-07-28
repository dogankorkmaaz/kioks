import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useCreateDevice,
  useDeleteDevice,
  useDevices,
  useGenerateEnrollmentCode,
  useGroups,
  useProfiles,
  useUpdateDevice,
} from "../api/queries";
import type { Device, Group, SettingsProfile } from "../api/types";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function GroupProfileCells({ device, groups, profiles }: { device: Device; groups?: Group[]; profiles?: SettingsProfile[] }) {
  const updateDevice = useUpdateDevice();

  return (
    <>
      <td>
        <select
          value={device.groupId ?? ""}
          onChange={(e) => updateDevice.mutate({ id: device.id, groupId: e.target.value || null })}
        >
          <option value="">No group</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          value={device.profileId ?? ""}
          onChange={(e) => updateDevice.mutate({ id: device.id, profileId: e.target.value || null })}
        >
          <option value="">No profile override</option>
          {profiles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </td>
    </>
  );
}

export function DevicesPage() {
  const { data: devices, isLoading } = useDevices();
  const { data: groups } = useGroups();
  const { data: profiles } = useProfiles();
  const createDevice = useCreateDevice();
  const deleteDevice = useDeleteDevice();
  const generateCode = useGenerateEnrollmentCode();

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [revealed, setRevealed] = useState<{ name: string; code: string; expiresAt: string } | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDevice.mutate(
      { name, groupId: groupId || undefined, profileId: profileId || undefined },
      {
        onSuccess: (device) => {
          setRevealed({ name: device.name, code: device.enrollmentCode!, expiresAt: device.enrollmentCodeExpiresAt! });
          setName("");
          setGroupId("");
          setProfileId("");
        },
      },
    );
  };

  const onGetCode = (device: Device) => {
    generateCode.mutate(device.id, {
      onSuccess: (updated) => {
        setRevealed({ name: updated.name, code: updated.enrollmentCode!, expiresAt: updated.enrollmentCodeExpiresAt! });
      },
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Devices</h2>
      </div>

      <form className="card inline-form" onSubmit={onCreate}>
        <input placeholder="Device name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">No group</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
          <option value="">No profile override</option>
          {profiles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="primary" type="submit" disabled={createDevice.isPending}>
          Add device
        </button>
      </form>

      {revealed && (
        <div className="card">
          <strong>{revealed.name}</strong> — on the device, open Settings (5 taps / long-press OK) → Backend
          enrollment → enter the server URL and this code, then tap Enroll:
          <div className="field">
            <label>Enrollment code (expires {new Date(revealed.expiresAt).toLocaleTimeString()})</label>
            <div className="token-reveal" style={{ fontSize: 28, letterSpacing: 4, textAlign: "center" }}>
              {revealed.code}
            </div>
          </div>
          <button onClick={() => setRevealed(null)} style={{ marginTop: 8 }}>
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <p className="muted">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Device ID</th>
                <th>Battery</th>
                <th>Current URL/app</th>
                <th>Group</th>
                <th>Profile</th>
                <th>Last seen</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devices?.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className={`status-dot ${d.isOnline ? "online" : "offline"}`} />
                    {d.isOnline ? "Online" : "Offline"}
                  </td>
                  <td>
                    <Link to={`/devices/${d.id}`}>{d.name}</Link>
                  </td>
                  <td>
                    <code style={{ fontSize: 12 }}>{d.id}</code>
                  </td>
                  <td>{d.batteryLevel != null ? `${d.batteryLevel}%` : "—"}</td>
                  <td className="muted">{d.currentUrlOrApp ?? "—"}</td>
                  <GroupProfileCells device={d} groups={groups} profiles={profiles} />
                  <td className="muted">{timeAgo(d.lastSeenAt)}</td>
                  <td>
                    <button disabled={generateCode.isPending} onClick={() => onGetCode(d)}>
                      Get enrollment code
                    </button>
                  </td>
                  <td>
                    <button className="danger" onClick={() => deleteDevice.mutate(d.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {devices?.length === 0 && (
                <tr>
                  <td colSpan={10} className="muted">
                    No devices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
