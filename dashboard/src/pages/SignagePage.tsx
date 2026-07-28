import { useRef, useState } from "react";
import {
  useDeleteSignageMedia,
  usePlaySignage,
  useSignageCurrent,
  useSignageMedia,
  useSignageSettings,
  useStopSignage,
  useUpdateSignageSettings,
  useUploadSignageMedia,
} from "../api/queries";

const TVS = ["1", "2", "3", "4"];
const SIGNAGE_BASE = "/api/admin/signage";

export function SignagePage() {
  const { data: media, isLoading } = useSignageMedia();
  const upload = useUploadSignageMedia();
  const deleteMedia = useDeleteSignageMedia();
  const play = usePlaySignage();
  const stop = useStopSignage();
  const { data: settings } = useSignageSettings();
  const updateSettings = useUpdateSignageSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTv, setActiveTv] = useState("1");
  const { data: current } = useSignageCurrent(activeTv);

  const toggleSelected = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onFilesChosen = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => upload.mutate(file));
  };

  const onPlaySelected = () => {
    if (selected.length === 0) return;
    play.mutate({
      tv: activeTv,
      type: selected.length === 1 ? "single" : "slideshow",
      mediaId: selected.length === 1 ? selected[0] : undefined,
      mediaIds: selected.length > 1 ? selected : undefined,
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Signage (TV Kiosk Panel)</h2>
      </div>

      <div className="card">
        <h3>Screens</h3>
        <div className="command-bar">
          {TVS.map((tv) => (
            <button key={tv} className={tv === activeTv ? "primary" : ""} onClick={() => setActiveTv(tv)}>
              TV {tv}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {current
            ? `Now playing on TV ${activeTv}: ${current.type}${current.mediaIds ? ` (${current.mediaIds.length} items)` : ""}`
            : `TV ${activeTv} is stopped.`}
        </p>
        <div className="command-bar" style={{ marginTop: 8 }}>
          <button className="primary" disabled={selected.length === 0 || play.isPending} onClick={onPlaySelected}>
            Play selected on TV {activeTv} ({selected.length})
          </button>
          <button disabled={stop.isPending} onClick={() => stop.mutate({ tv: activeTv })}>
            Stop TV {activeTv}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Slideshow interval</h3>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).elements.namedItem("interval") as HTMLInputElement;
            updateSettings.mutate(Number(input.value));
          }}
        >
          <input name="interval" type="number" min={1} defaultValue={settings?.slideshowInterval ?? 5} style={{ width: 100 }} />
          <span className="muted">seconds per item</span>
          <button className="primary" type="submit" disabled={updateSettings.isPending}>
            Save
          </button>
        </form>
      </div>

      <div className="card">
        <div className="page-header">
          <h3>Media library</h3>
          <button className="primary" onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload media"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              onFilesChosen(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {isLoading && <p className="muted">Loading…</p>}
        {media?.length === 0 && <p className="muted">No media uploaded yet.</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {media?.map((m) => {
            const isSelected = selected.includes(m.id);
            const src = `${SIGNAGE_BASE}${m.path}`;
            return (
              <div
                key={m.id}
                className="card"
                style={{
                  margin: 0,
                  padding: 8,
                  cursor: "pointer",
                  borderColor: isSelected ? "var(--accent)" : undefined,
                  borderWidth: isSelected ? 2 : 1,
                }}
                onClick={() => toggleSelected(m.id)}
              >
                <div style={{ height: 100, background: "#000", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                  {m.type === "video" ? (
                    <video src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={src} alt={m.originalName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.originalName}
                </div>
                <button
                  className="danger"
                  style={{ marginTop: 6, width: "100%" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMedia.mutate(m.id);
                    setSelected((prev) => prev.filter((id) => id !== m.id));
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
