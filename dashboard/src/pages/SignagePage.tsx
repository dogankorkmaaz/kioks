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
import { IconCheck, IconInbox, IconPlay, IconStop, IconTrash, IconUpload } from "../components/Icons";

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
  const [dragOver, setDragOver] = useState(false);
  const { data: current } = useSignageCurrent(activeTv);

  const toggleSelected = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const uploadFiles = (files: FileList | null) => {
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
      <div className="card">
        <div className="page-header" style={{ marginBottom: "var(--sp-3)" }}>
          <div>
            <h3>Screens</h3>
            <p className="section-sub">
              {current
                ? `TV ${activeTv} is playing ${current.type}${
                    current.mediaIds ? ` — ${current.mediaIds.length} items` : ""
                  }`
                : `TV ${activeTv} is stopped`}
            </p>
          </div>
          <div className="segmented">
            {TVS.map((tv) => (
              <button
                key={tv}
                className={tv === activeTv ? "active" : ""}
                onClick={() => setActiveTv(tv)}
              >
                TV {tv}
              </button>
            ))}
          </div>
        </div>

        <div className="command-bar">
          <button
            className="primary"
            disabled={selected.length === 0 || play.isPending}
            onClick={onPlaySelected}
          >
            <IconPlay size={15} />
            Play {selected.length > 0 ? `${selected.length} selected` : "selection"} on TV {activeTv}
          </button>
          <button disabled={stop.isPending} onClick={() => stop.mutate({ tv: activeTv })}>
            <IconStop size={15} />
            Stop TV {activeTv}
          </button>
          {selected.length > 0 && (
            <button className="ghost" onClick={() => setSelected([])}>
              Clear selection
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Slideshow interval</h3>
        <form
          className="inline-form"
          style={{ marginTop: "var(--sp-3)" }}
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).elements.namedItem(
              "interval",
            ) as HTMLInputElement;
            updateSettings.mutate(Number(input.value));
          }}
        >
          <input
            name="interval"
            type="number"
            min={1}
            defaultValue={settings?.slideshowInterval ?? 5}
            style={{ width: 90 }}
            aria-label="Seconds per item"
          />
          <span className="muted">seconds per item</span>
          <button className="primary" type="submit" disabled={updateSettings.isPending}>
            Save
          </button>
        </form>
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: "var(--sp-3)" }}>
          <div>
            <h3>Media library</h3>
            <p className="section-sub">
              Click a tile to select it. Pick two or more for a slideshow.
            </p>
          </div>
          <span className="badge">{media?.length ?? 0} items</span>
        </div>

        <div
          className={`dropzone ${dragOver ? "dragover" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            uploadFiles(e.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
        >
          <IconUpload size={26} />
          <div style={{ marginTop: "var(--sp-2)" }}>
            {upload.isPending ? (
              "Uploading…"
            ) : (
              <>
                <strong style={{ color: "var(--accent)" }}>Click to upload</strong> or drag files
                here
              </>
            )}
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>Images and video, up to 500 MB each</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {isLoading && (
          <p className="muted" style={{ marginTop: "var(--sp-4)" }}>
            Loading…
          </p>
        )}

        {media?.length === 0 && !isLoading && (
          <div className="empty-state">
            <IconInbox />
            <div className="empty-title">Library is empty</div>
            <div>Upload an image or video to get started.</div>
          </div>
        )}

        {media && media.length > 0 && (
          <div className="media-grid" style={{ marginTop: "var(--sp-4)" }}>
            {media.map((m) => {
              const isSelected = selected.includes(m.id);
              const src = `${SIGNAGE_BASE}${m.path}`;
              return (
                <div
                  key={m.id}
                  className={`media-tile ${isSelected ? "selected" : ""}`}
                  onClick={() => toggleSelected(m.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelected(m.id);
                    }
                  }}
                >
                  <div className="media-thumb">
                    {m.type === "video" ? (
                      <video src={src} muted preload="metadata" />
                    ) : (
                      <img src={src} alt={m.originalName} loading="lazy" />
                    )}
                  </div>

                  {isSelected && (
                    <span className="media-check">
                      <IconCheck size={13} />
                    </span>
                  )}

                  <button
                    className="media-del"
                    title="Delete media"
                    aria-label={`Delete ${m.originalName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMedia.mutate(m.id);
                      setSelected((prev) => prev.filter((id) => id !== m.id));
                    }}
                  >
                    <IconTrash size={14} />
                  </button>

                  <div className="media-info">
                    <div className="media-name">{m.originalName}</div>
                    <div className="media-type">{m.type === "video" ? "Video" : "Image"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
