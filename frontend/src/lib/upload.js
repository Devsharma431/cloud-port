const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MB = 1024 * 1024;

export const MAX_FILES = 3;

const RULES = {
  "image/jpeg": 10 * MB,
  "image/png": 10 * MB,
  "image/gif": 10 * MB,
  "image/webp": 10 * MB,
  "application/pdf": 10 * MB,
  "video/mp4": 100 * MB,
  "video/quicktime": 100 * MB,
  "video/webm": 100 * MB,
  "video/x-matroska": 100 * MB,
};

export const ACCEPT = Object.keys(RULES).join(",");

export const validateFile = (file) => {
  const limit = RULES[file.type];
  if (!limit) return "Only images, PDFs and video clips (MP4, MOV, WebM, MKV) are allowed.";
  if (file.size > limit) return `${file.type.startsWith("video/") ? "Videos" : "Images and PDFs"} must be under ${limit / MB} MB.`;
  return null;
};

const parseError = async (res) => {
  try {
    return (await res.json()).detail || "Upload failed";
  } catch {
    return "Upload failed";
  }
};

// Chunked upload: init -> PUT chunks -> complete. onProgress(0..1). Returns FileOut from backend.
export async function uploadFile(file, onProgress, signal) {
  const init = await fetch(`${API}/uploads/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size }),
    signal,
  });
  if (!init.ok) throw new Error(await parseError(init));
  const { upload_id, chunk_size } = await init.json();

  for (let offset = 0; offset < file.size; offset += chunk_size) {
    const res = await fetch(`${API}/uploads/${upload_id}/chunk`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: file.slice(offset, offset + chunk_size),
      signal,
    });
    if (!res.ok) throw new Error(await parseError(res));
    onProgress(Math.min((offset + chunk_size) / file.size, 0.98));
  }

  const done = await fetch(`${API}/uploads/${upload_id}/complete`, { method: "POST", signal });
  if (!done.ok) throw new Error(await parseError(done));
  onProgress(1);
  return done.json();
}
