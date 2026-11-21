import { useRef, useState } from "react";
import Icon from "./Icon";
import "./PhotoUploader.css";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_MB = 8;

// Shrinks a photo to a web-friendly JPEG (long side <= 1024px) and returns a data URL.
// Phone photos are often 5-10 MB; this keeps them to roughly 100-250 KB.
// When Firebase Storage is connected, upload the resized blob instead and keep the download URL.
export const resizeImage = (file, maxSide = 1024, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const url = window.URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // PNG/WebP transparency becomes white instead of black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      window.URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      window.URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });

export default function PhotoUploader({ images, onChange, max = 4, error }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const problems = [];
    const room = max - images.length;
    if (files.length > room) problems.push(`You can add up to ${max} photos per product.`);

    const valid = files.slice(0, room).filter((f) => {
      if (!ACCEPTED.includes(f.type)) { problems.push(`${f.name} isn't a JPG, PNG or WebP image.`); return false; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { problems.push(`${f.name} is larger than ${MAX_FILE_MB} MB.`); return false; }
      return true;
    });

    if (valid.length) {
      setBusy(true);
      try {
        const added = await Promise.all(valid.map((f) => resizeImage(f)));
        onChange([...images, ...added]);
      } catch {
        problems.push("A photo couldn't be read. Try a different file.");
      } finally {
        setBusy(false);
      }
    }
    setNote(problems.join(" "));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="photo-field">
      <div className="photo-grid">
        {images.map((src, i) => (
          <div className="photo-tile" key={i}>
            <img src={src} alt={`Product photo ${i + 1}`} />
            <button
              type="button"
              className="photo-remove"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => { onChange(images.filter((_, j) => j !== i)); setNote(""); }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            className={`photo-add${dragging ? " is-dragging" : ""}`}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <span className={busy ? "photo-spin" : ""}><Icon name={busy ? "progress_activity" : "add_photo_alternate"} size={26} /></span>
            <span>{busy ? "Processing…" : images.length ? "Add more" : "Add photos"}</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} multiple hidden onChange={(e) => addFiles(e.target.files)} />
      <p className="photo-hint">Up to {max} photos · JPG, PNG or WebP.</p>
      {(note || error) && <p className="photo-error" role="alert">{note || error}</p>}
    </div>
  );
}