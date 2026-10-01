import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MOTION_PROJECTS, VIDEO_PROJECTS, MOTION_SUBS, VIDEO_SUBS } from "../data/portfolio";
import { VideoEmbed } from "./VideoEmbed";

const TYPES = [
  { k: "motion", label: "Motion Graphics", subs: MOTION_SUBS, items: MOTION_PROJECTS },
  { k: "video", label: "Video Editing", subs: VIDEO_SUBS, items: VIDEO_PROJECTS },
];

export const Projects = () => {
  const [mainType, setMainType] = useState("motion");
  const [sub, setSub] = useState("All");

  const current = TYPES.find((t) => t.k === mainType);

  const filtered = useMemo(
    () => current.items.filter((v) => sub === "All" || v.sub === sub),
    [current, sub]
  );

  const switchType = (k) => {
    setMainType(k);
    setSub("All");
  };

  return (
    <section id="work" className="relative z-10 py-24 md:py-32 px-6 md:px-12 lg:px-24">
      <div className="mb-12">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#2997FF]">/ Selected work</span>
        <h2 className="font-heading text-4xl sm:text-6xl font-bold tracking-tighter mt-3">Projects</h2>
      </div>

      {/* Main type toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {TYPES.map((t) => (
          <button
            key={t.k}
            onClick={() => switchType(t.k)}
            data-testid={`type-${t.k}`}
            data-cursor
            className={`relative rounded-full px-6 py-3 text-sm md:text-base font-medium transition-colors duration-300 ${
              mainType === t.k ? "text-black" : "text-[#a1a1aa] hover:text-white border border-white/15"
            }`}
          >
            {mainType === t.k && (
              <motion.span layoutId="type-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 400, damping: 35 }} />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Sub filters */}
      <div className="flex flex-wrap items-center gap-2 mb-12 border-t border-white/10 pt-6">
        {current.subs.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            data-testid={`sub-${s.toLowerCase().replace(/\s|-/g, "")}`}
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors duration-300 ${
              sub === s ? "bg-[#2997FF] text-white" : "text-[#a1a1aa] hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Masonry grid of embeds */}
      <div key={`${mainType}-${sub}`} className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5" data-testid="video-grid">
        {filtered.map((v, i) => (
          <VideoEmbed key={v.id} video={v} index={i} />
        ))}
      </div>
    </section>
  );
};
