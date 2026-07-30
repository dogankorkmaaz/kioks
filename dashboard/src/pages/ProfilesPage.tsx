import { useState } from "react";
import { useCreateProfile, useDeleteProfile, useProfiles, useUpdateProfile } from "../api/queries";
import type { SettingsProfile } from "../api/types";
import { IconInbox, IconInfo, IconPlus, IconTrash } from "../components/Icons";

const DEFAULT_CONFIG_TEMPLATE = JSON.stringify(
  {
    mode: "web",
    url: "https://intranet.example.com",
    urlWhitelist: [],
    urlBlacklist: [],
    javascriptEnabled: true,
    popupsBlocked: true,
    zoomEnabled: false,
    autoplayEnabled: true,
    cookiesEnabled: true,
    motionDetectionMode: "accelerometer",
  },
  null,
  2,
);

function ProfileEditor({ profile }: { profile: SettingsProfile }) {
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const [name, setName] = useState(profile.name);
  const [json, setJson] = useState(JSON.stringify(profile.configJson, null, 2));
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    try {
      const config = JSON.parse(json);
      setError(null);
      updateProfile.mutate({ id: profile.id, name, config });
    } catch {
      setError("Invalid JSON — fix the syntax before saving.");
    }
  };

  return (
    <div className="card">
      <div className="page-header" style={{ marginBottom: "var(--sp-3)" }}>
        <input
          className="profile-title-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Profile name"
        />
        <span className="badge">v{profile.version}</span>
      </div>

      <textarea
        className="json-editor"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        aria-label={`Config JSON for ${profile.name}`}
      />

      {error && (
        <p className="error" style={{ marginTop: "var(--sp-2)" }}>
          {error}
        </p>
      )}

      <div className="command-bar" style={{ marginTop: "var(--sp-3)" }}>
        <button className="primary" onClick={onSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </button>
        <button className="danger" onClick={() => deleteProfile.mutate(profile.id)}>
          <IconTrash size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}

export function ProfilesPage() {
  const { data: profiles, isLoading } = useProfiles();
  const createProfile = useCreateProfile();

  const [newName, setNewName] = useState("");
  const [newJson, setNewJson] = useState(DEFAULT_CONFIG_TEMPLATE);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = JSON.parse(newJson);
      setCreateError(null);
      createProfile.mutate(
        { name: newName, config },
        {
          onSuccess: () => {
            setNewName("");
            setNewJson(DEFAULT_CONFIG_TEMPLATE);
            setShowCreate(false);
          },
        },
      );
    } catch {
      setCreateError("Invalid JSON — fix the syntax before creating.");
    }
  };

  return (
    <div>
      <div className="callout">
        <IconInfo size={16} />
        <div>
          A profile is the settings bundle a device pulls on startup and whenever you edit it.
          Saving bumps its version, which is how devices detect a stale cache. Field reference:{" "}
          <code>docs/settings-profile-schema.json</code>.
        </div>
      </div>

      <div className="page-header">
        <div>
          <h2>Settings profiles</h2>
          <p className="section-sub">{profiles?.length ?? 0} profile(s)</p>
        </div>
        <button className="primary" onClick={() => setShowCreate((v) => !v)}>
          <IconPlus size={16} />
          {showCreate ? "Cancel" : "New profile"}
        </button>
      </div>

      {showCreate && (
        <form className="card" onSubmit={onCreate}>
          <h3>New profile</h3>
          <div className="field" style={{ marginTop: "var(--sp-3)" }}>
            <label htmlFor="new-profile-name">Name</label>
            <input
              id="new-profile-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="lobby-web-kiosk"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-profile-json">Config JSON</label>
            <textarea
              id="new-profile-json"
              className="json-editor"
              value={newJson}
              onChange={(e) => setNewJson(e.target.value)}
              spellCheck={false}
            />
          </div>
          {createError && <p className="error">{createError}</p>}
          <div className="command-bar" style={{ marginTop: "var(--sp-2)" }}>
            <button className="primary" type="submit" disabled={createProfile.isPending}>
              Create profile
            </button>
            <button type="button" className="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="muted">Loading…</p>}

      {profiles?.length === 0 && !showCreate && (
        <div className="card">
          <div className="empty-state">
            <IconInbox />
            <div className="empty-title">No profiles yet</div>
            <div>Create one to push settings to a device or a whole group.</div>
          </div>
        </div>
      )}

      {profiles?.map((p) => (
        <ProfileEditor key={p.id} profile={p} />
      ))}
    </div>
  );
}
