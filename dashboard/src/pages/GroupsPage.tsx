import { useState } from "react";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useProfiles,
  useSendGroupCommand,
} from "../api/queries";
import type { CommandType } from "../api/types";
import {
  IconInbox,
  IconLock,
  IconPlus,
  IconRefresh,
  IconRotate,
  IconSliders,
  IconTrash,
  IconUnlock,
} from "../components/Icons";

const COMMANDS: { type: CommandType; label: string; icon: typeof IconRefresh }[] = [
  { type: "RELOAD", label: "Reload", icon: IconRefresh },
  { type: "LOCK", label: "Lock", icon: IconLock },
  { type: "UNLOCK", label: "Unlock", icon: IconUnlock },
  { type: "RESTART_APP", label: "Restart app", icon: IconRotate },
  { type: "APPLY_PROFILE", label: "Re-apply profile", icon: IconSliders },
];

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const { data: profiles } = useProfiles();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const sendGroupCommand = useSendGroupCommand();

  const [name, setName] = useState("");
  const [defaultProfileId, setDefaultProfileId] = useState("");

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createGroup.mutate(
      { name, defaultProfileId: defaultProfileId || null },
      {
        onSuccess: () => {
          setName("");
          setDefaultProfileId("");
        },
      },
    );
  };

  return (
    <div>
      <div className="card">
        <h3>Create a group</h3>
        <p className="section-sub" style={{ marginBottom: "var(--sp-3)" }}>
          Devices inherit the group's default profile unless they have their own override.
        </p>
        <form className="inline-form" onSubmit={onCreate}>
          <input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select value={defaultProfileId} onChange={(e) => setDefaultProfileId(e.target.value)}>
            <option value="">No default profile</option>
            {profiles?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="primary" type="submit" disabled={createGroup.isPending}>
            <IconPlus size={16} />
            Add group
          </button>
        </form>
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      {groups?.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <IconInbox />
            <div className="empty-title">No groups yet</div>
            <div>Groups let you push one command or profile to many devices at once.</div>
          </div>
        </div>
      )}

      {groups?.map((g) => (
        <div className="card" key={g.id}>
          <div className="page-header" style={{ marginBottom: "var(--sp-3)" }}>
            <div>
              <h3>{g.name}</h3>
              <p className="section-sub">
                Default profile: {g.defaultProfile?.name ?? "none"} · {g.devices?.length ?? 0}{" "}
                device(s)
              </p>
            </div>
            <button className="danger" onClick={() => deleteGroup.mutate(g.id)}>
              <IconTrash size={16} />
              Delete
            </button>
          </div>

          <div className="field-label" style={{ marginBottom: "var(--sp-2)" }}>
            Send to every device in this group
          </div>
          <div className="command-bar">
            {COMMANDS.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                disabled={sendGroupCommand.isPending}
                onClick={() => sendGroupCommand.mutate({ groupId: g.id, type })}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
