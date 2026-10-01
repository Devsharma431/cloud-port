import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, X, FileImage, FileText, FileVideo, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadFile, validateFile, ACCEPT, MAX_FILES } from "../lib/upload";

const ICONS = { image: FileImage, pdf: FileText, video: FileVideo };
const kindOf = (type) => (type.startsWith("video/") ? "video" : type === "application/pdf" ? "pdf" : "image");
const fmt = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

// items: [{ localId, name, size, kind, progress, status: 'uploading'|'done'|'error', id?, error? }]
export const FileDropzone = ({ items, onChange, disabled }) => {
  const inputRef = useRef(null);
  const controllers = useRef(new Map());
  const [dragging, setDragging] = useState(false);

  const patch = (localId, data) => onChange((list) => list.map((it) => (it.localId === localId ? { ...it, ...data } : it)));

  const addFiles = (fileList) => {
    const files = Array.from(fileList);
    const room = MAX_FILES - items.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    files.slice(0, room).forEach((file) => {
      const problem = validateFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        return;
      }
      const localId = crypto.randomUUID();
      const controller = new AbortController();
      controllers.current.set(localId, controller);
      onChange((list) => [...list, { localId, name: file.name, size: file.size, kind: kindOf(file.type), progress: 0, status: "uploading" }]);
      uploadFile(file, (p) => patch(localId, { progress: p }), controller.signal)
        .then((out) => patch(localId, { status: "done", id: out.id, progress: 1 }))
        .catch((err) => {
          if (err.name !== "AbortError") patch(localId, { status: "error", error: err.message });
        })
        .finally(() => controllers.current.delete(localId));
    });
    if (files.length > room) toast.error(`Only ${MAX_FILES} files allowed — extra files were skipped.`);
  };

  const remove = (localId) => {
    controllers.current.get(localId)?.abort();
    onChange((list) => list.filter((it) => it.localId !== localId));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled || items.length >= MAX_FILES}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-testid="contact-dropzone"
        data-cursor
        className={`group flex w-full items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3.5 text-left transition-colors disabled:opacity-50 ${
          dragging ? "border-[#2997FF] bg-[#2997FF]/10" : "border-white/20 bg-[#111] hover:border-white/40"
        }`}
      >
        <span className="flex items-center gap-3 text-sm text-[#a1a1aa]">
          <Paperclip size={16} className="text-[#2997FF]" />
          <span>
            <span className="text-white">Attach references</span> — drop files or click to browse
          </span>
        </span>
        <span className="hidden sm:block font-mono text-[10px] uppercase tracking-wider text-[#71717a]">
          {items.length}/{MAX_FILES} · img/pdf 10MB · video 100MB
        </span>
      </button>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" data-testid="contact-file-input" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      <AnimatePresence initial={false}>
        {items.map((it) => {
          const Icon = ICONS[it.kind];
          return (
            <motion.div
              key={it.localId}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              data-testid={`attachment-${it.status}`}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0e0e0e] px-4 py-3"
            >
              {it.status === "uploading" && (
                <motion.div className="absolute inset-y-0 left-0 bg-[#2997FF]/10" animate={{ width: `${Math.round(it.progress * 100)}%` }} transition={{ ease: "linear", duration: 0.2 }} />
              )}
              <div className="relative flex items-center gap-3">
                <Icon size={18} className={it.status === "error" ? "text-red-400" : "text-[#2997FF]"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">{it.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#71717a]">
                    {it.status === "uploading" && `Uploading ${Math.round(it.progress * 100)}% · ${fmt(it.size)}`}
                    {it.status === "done" && `Attached · ${fmt(it.size)}`}
                    {it.status === "error" && <span className="text-red-400 normal-case tracking-normal">{it.error}</span>}
                  </div>
                </div>
                {it.status === "done" && <Check size={16} className="text-[#2997FF]" />}
                {it.status === "error" && <AlertCircle size={16} className="text-red-400" />}
                <button type="button" onClick={() => remove(it.localId)} aria-label="Remove attachment" data-testid="attachment-remove" className="text-[#71717a] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
