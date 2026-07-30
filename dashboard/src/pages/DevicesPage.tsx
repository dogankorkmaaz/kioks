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
import { StatusPill } from "../components/StatusPill";
import { IconInbox, IconKey, IconPlus, IconTrash } from "../components/Icons";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function GroupProfileCells({
  device,
  groups,
  profiles,
}: {
  device: Device;
  groups?: Group[];
  profiles?: SettingsProfile[];
}) {
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
          <option value="">No override</option>
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
  const [revealed, setRevealed] = useState<{ name: string; code: string; expiresAt: string } | null>(
    null,
  );

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDevice.mutate(
      { name, groupId: groupId || undefined, profileId: profileId || undefined },
      {
        onSuccess: (device) => {
          setRevealed({
            name: device.name,
            code: device.enrollmentCode!,
            expiresAt: device.enrollmentCodeExpiresAt!,
          });
          setName("");
          setGroupId("");
          setProfileId("");
        },
      },
    );
  };

  const onGetCode = (device: Device) => {
    generateCode.mutate(device.id, {
      onSuccess: (updated) =>
        setRevealed({
          name: updated.name,
          code: updated.enrollmentCode!,
          expiresAt: updated.enrollmentCodeExpiresAt!,
        }),
    });
  };

  const total = devices?.length ?? 0;
  const online = devices?.filter((d) => d.isOnline).length ?? 0;
  const unenrolled = devices?.filter((d) => !d.lastSeenAt).length ?? 0;
  const batteries = devices?.map((d) => d.batteryLevel).filter((b): b is number => b != null) ?? [];
  const avgBattery = batteries.length
    ? Math.round(batteries.reduce((a, b) => a + b, 0) / batteries.length)
    : null;

  return (
    <div>
      {/* KPI row — plain figures; no chart is warranted for four single values. */}
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Total devices</div>
          <div className="stat-value">{total}</div>
          <div className="stat-foot">across all groups</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Online now</div>
          <div className="stat-value">{online}</div>
          <div className={`stat-foot ${online === total && total > 0 ? "good" : ""}`}>
            {total > 0 ? `${Math.round((online / total) * 100)}% of fleet` : "no devices yet"}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Offline</div>
          <div className="stat-value">{total - online}</div>
          <div className={`stat-foot ${total - online > 0 ? "critical" : ""}`}>
            {total - online > 0 ? "needs attention" : "all reporting"}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Avg. battery</div>
          <div className="stat-value">{avgBattery != null ? `${avgBattery}%` : "—"}</div>
          <div className="stat-foot">
            {unenrolled > 0 ? `${unenrolled} not enrolled yet` : "all enrolled"}
          </div>
        </div>
      </div>

      {revealed && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: "var(--sp-3)" }}>
            <div>
              <h3>Enrollment code for “{revealed.name}”</h3>
              <p className="section-sub">
                On the device: open Settings (long-press OK or 5 taps) → Backend enrollment → enter
                the server URL and this code, then tap Enroll.
              </p>
            </div>
            <button className="ghost" onClick={() => setRevealed(null)}>
              Dismiss
            </button>
          </div>
          <div className="code-hero">{revealed.code}</div>
          <p className="section-sub" style={{ textAlign: "center", marginTop: "var(--sp-2)" }}>
            Expires at {new Date(revealed.expiresAt).toLocaleTimeString()}
          </p>
        </div>
      )}

      <div className="card">
        <h3>Add a device</h3>
        <form className="inline-form" onSubmit={onCreate} style={{ marginTop: "var(--sp-3)" }}>
          <input
            placeholder="Device name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            <IconPlus size={16} />
            Add device
          </button>
        </form>
      </div>

      <div className="card card-flush">
        <div className="card-head">
          <h3>Fleet</h3>
          <span className="badge">{total} registered</span>
        </div>

        {isLoading ? (
          <p className="muted" style={{ padding: "var(--sp-5)" }}>
            Loading…
          </p>
        ) : total === 0 ? (
          <div className="empty-state">
            <IconInbox />
            <div className="empty-title">No devices yet</div>
            <div>Add one above, then enroll it with the code shown.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Current URL / app</th>
                  <th className="num">Battery</th>
                  <th>Group</th>
                  <th>Profile</th>
                  <th className="num">Last seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {devices?.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <StatusPill online={d.isOnline} />
                    </td>
                    <td>
                      <Link to={`/devices/${d.id}`} className="cell-strong">
                        {d.name}
                      </Link>
                      <div className="mono">{d.id.slice(0, 8)}…</div>
                    </td>
                    <td className="muted">{d.currentUrlOrApp ?? "—"}</td>
                    <td className="num">{d.batteryLevel != null ? `${d.batteryLevel}%` : "—"}</td>
                    <GroupProfileCells device={d} groups={groups} profiles={profiles} />
                    <td className="num muted">{timeAgo(d.lastSeenAt)}</td>
                    <td>
                      <div className="command-bar" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="ghost icon-only"
                          disabled={generateCode.isPending}
                          onClick={() => onGetCode(d)}
                          title="Get enrollment code"
                          aria-label={`Get enrollment code for ${d.name}`}
                        >
                          <IconKey size={16} />
                        </button>
                        <button
                          className="danger icon-only"
                          onClick={() => deleteDevice.mutate(d.id)}
                          title="Delete device"
                          aria-label={`Delete ${d.name}`}
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
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
