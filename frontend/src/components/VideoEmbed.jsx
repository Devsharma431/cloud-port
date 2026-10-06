import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const IFRAME_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

const SRC = {
  youtube: (v) => `https://www.youtube.com/embed/${v.videoId}?rel=0&modestbranding=1&enablejsapi=1`,
  vimeo: (v) => `https://player.vimeo.com/video/${v.videoId}?badge=0&byline=0&portrait=0&title=0&dnt=1`,
  drive: (v) => `https://drive.google.com/file/d/${v.fileId}/preview`,
};

const RATIO_CLASS = { "16/9": "aspect-video", "9/16": "aspect-[9/16]", "1/1": "aspect-square" };

const sourceLabel = (v) => {
  if (v.source === "drive") return "Google Drive";
  if (v.source === "vimeo") return "Vimeo";
  return v.ratio === "9/16" ? "YouTube Short" : "YouTube";
};

export const VideoEmbed = ({ video, index }) => {
  const isDrive = video.source === "drive";
  const driveLink = isDrive ? `https://drive.google.com/file/d/${video.fileId}/view?usp=sharing` : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: (index % 3) * 0.06 }}
      data-testid={`video-card-${video.id}`}
      className="mb-5 break-inside-avoid rounded-2xl border border-white/10 bg-[#111] overflow-hidden"
    >
      <div className={`relative w-full bg-black ${RATIO_CLASS[video.ratio]} overflow-hidden`}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={SRC[video.source](video)}
          title={`${video.sub} — ${sourceLabel(video)}`}
          loading="lazy"
          allow={IFRAME_ALLOW}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-testid={`video-iframe-${video.id}`}
        />

        {/* Category badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="absolute top-3 left-3 z-10"
        >
          <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white/90">
            {video.sub}
          </span>
        </motion.div>

        {/* Source indicator */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="absolute top-3 right-3 z-10"
        >
          <span className="rounded-full bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#a1a1aa]">
            {sourceLabel(video)}
          </span>
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white/90 truncate">
            {video.sub}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#a1a1aa] truncate">{sourceLabel(video)}</span>
        </div>
        {isDrive && (
          <a
            href={`https://drive.google.com/file/d/${video.fileId}/view?usp=sharing`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`video-drive-link-${video.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#a1a1aa] hover:border-[#2997FF] hover:text-[#2997FF] transition-colors"
          >
            Open in Drive <ExternalLink size={12} />
          </a>
        )}
      </div>
    </motion.article>
  );
};