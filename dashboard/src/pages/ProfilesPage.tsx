import { useState } from "react";
import { useCreateProfile, useDeleteProfile, useProfiles, useUpdateProfile } from "../api/queries";
import type { SettingsProfile } from "../api/types";

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
      setError("Invalid JSON — fix syntax before saving.");
    }
  };

  return (
    <div className="card">
      <div className="page-header">
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ fontWeight: 600 }} />
        <span className="muted">v{profile.version}</span>
      </div>
      <textarea className="json-editor" value={json} onChange={(e) => setJson(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <div className="command-bar" style={{ marginTop: 8 }}>
        <button className="primary" onClick={onSave} disabled={updateProfile.isPending}>
          Save
        </button>
        <button className="danger" onClick={() => deleteProfile.mutate(profile.id)}>
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

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = JSON.parse(newJson);
      setCreateError(null);
      createProfile.mutate(
        { name: newName, config },
        { onSuccess: () => { setNewName(""); setNewJson(DEFAULT_CONFIG_TEMPLATE); } },
      );
    } catch {
      setCreateError("Invalid JSON — fix syntax before creating.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Settings profiles</h2>
      </div>

      <form className="card" onSubmit={onCreate}>
        <div className="field">
          <label>Name</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Config JSON (see docs/settings-profile-schema.json)</label>
          <textarea className="json-editor" value={newJson} onChange={(e) => setNewJson(e.target.value)} />
        </div>
        {createError && <p className="error">{createError}</p>}
        <button className="primary" type="submit" disabled={createProfile.isPending}>
          Create profile
        </button>
      </form>

      {isLoading && <p className="muted">Loading…</p>}
      {profiles?.map((p) => (
        <ProfileEditor key={p.id} profile={p} />
      ))}
    </div>
  );
}
