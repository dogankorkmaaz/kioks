import { useState } from "react";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useProfiles,
  useSendGroupCommand,
} from "../api/queries";
import type { CommandType } from "../api/types";

const COMMANDS: CommandType[] = ["RELOAD", "LOCK", "UNLOCK", "RESTART_APP", "APPLY_PROFILE"];

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
      { onSuccess: () => { setName(""); setDefaultProfileId(""); } },
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>Groups</h2>
      </div>

      <form className="card inline-form" onSubmit={onCreate}>
        <input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={defaultProfileId} onChange={(e) => setDefaultProfileId(e.target.value)}>
          <option value="">No default profile</option>
          {profiles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="primary" type="submit" disabled={createGroup.isPending}>
          Add group
        </button>
      </form>

      {isLoading ? (
        <p className="muted">Loading…</p>
      ) : (
        groups?.map((g) => (
          <div className="card" key={g.id}>
            <div className="page-header">
              <div>
                <strong>{g.name}</strong>
                <p className="muted">Default profile: {g.defaultProfile?.name ?? "none"}</p>
              </div>
              <button className="danger" onClick={() => deleteGroup.mutate(g.id)}>
                Delete group
              </button>
            </div>
            <div className="command-bar">
              {COMMANDS.map((type) => (
                <button
                  key={type}
                  disabled={sendGroupCommand.isPending}
                  onClick={() => sendGroupCommand.mutate({ groupId: g.id, type })}
                >
                  {type} all devices
                </button>
              ))}
            </div>
          </div>
        ))
      )}
      {groups?.length === 0 && <p className="muted">No groups yet.</p>}
    </div>
  );
}
