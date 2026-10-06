import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_PROJECTS, VIDEO_PROJECTS, MOTION_SUBS, VIDEO_SUBS } from "../data/portfolio";
import { VideoEmbed } from "./VideoEmbed";

const TYPES = [
  { k: "motion", label: "Motion Graphics", subs: MOTION_SUBS, items: MOTION_PROJECTS },
  { k: "video", label: "Video Editing", subs: VIDEO_SUBS, items: VIDEO_PROJECTS },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

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
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-heading text-4xl sm:text-6xl font-bold tracking-tighter mt-3"
        >
          Projects
        </motion.h2>
      </div>

      {/* Main type toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex flex-wrap items-center gap-3 mb-6"
      >
        {TYPES.map((t) => (
          <motion.button
            key={t.k}
            onClick={() => switchType(t.k)}
            data-testid={`type-${t.k}`}
            data-cursor
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative rounded-full px-6 py-3 text-sm md:text-base font-medium transition-colors duration-300 ${
              mainType === t.k ? "text-black" : "text-[#a1a1aa] hover:text-white border border-white/15"
            }`}
          >
            <motion.span
              layoutId="type-pill"
              className="absolute inset-0 rounded-full bg-white"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              {mainType === t.k && <span className="relative z-10">{t.label}</span>}
            </motion.span>
            <span className="relative z-10">{mainType !== t.k && t.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Sub filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex flex-wrap items-center gap-2 mb-12 border-t border-white/10 pt-6"
      >
        <AnimatePresence mode="wait">
          {current.subs.map((s) => (
            <motion.button
              key={s}
              onClick={() => setSub(s)}
              data-testid={`sub-${s.toLowerCase().replace(/\s|-/g, "")}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors duration-300 ${
                sub === s ? "bg-[#2997FF] text-white" : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              {s}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Masonry grid of embeds */}
      <motion.div
        key={`${mainType}-${sub}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5"
        data-testid="video-grid"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((v, i) => (
            <motion.div key={v.id} variants={itemVariants}>
              <VideoEmbed video={v} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
};