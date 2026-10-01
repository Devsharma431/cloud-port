import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import { PROFILE, STATS } from "../data/portfolio";

const LINES = ["VIDEO", "EDITOR &", "MOTION"];

const lineVariant = {
  hidden: { y: "110%" },
  show: (i) => ({
    y: "0%",
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.12 },
  }),
};

export const Hero = ({ onNavigate }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -120]);

  return (
    <section ref={ref} id="top" className="relative min-h-screen flex flex-col justify-end overflow-hidden pt-24 md:pt-28 pb-20 md:pb-24">
      {/* floating parallax orb */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute -top-20 right-[-10%] h-[520px] w-[520px] rounded-full blur-[120px]"
      >
        <div className="h-full w-full rounded-full bg-[#2997FF]/25" />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "80px 80px" }}
      />

      <motion.div style={{ y, opacity }} className="relative z-10 px-6 md:px-12 lg:px-24 w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <span className="h-2 w-2 rounded-full bg-[#2997FF] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#a1a1aa]">
            {PROFILE.role} — {PROFILE.location}
          </span>
        </motion.div>

        <h1 className="font-heading font-black uppercase tracking-tighter leading-[0.85] text-[15vw] lg:text-[11vw]">
          {LINES.map((line, i) => (
            <span key={line} className="line-mask">
              <motion.span
                custom={i}
                variants={lineVariant}
                initial="hidden"
                animate="show"
                className="inline-block"
              >
                {line === "MOTION" ? (
                  <>MOTION<span className="text-[#2997FF]">.</span></>
                ) : line}
              </motion.span>
            </span>
          ))}
        </h1>

        <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="max-w-md text-lg text-[#a1a1aa] leading-relaxed"
          >
            {PROFILE.tagline}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            onClick={() => onNavigate("work")}
            data-testid="hero-cta"
            data-cursor
            className="group inline-flex items-center gap-3 self-start rounded-full bg-white text-black px-7 py-4 font-medium hover:bg-[#2997FF] hover:text-white transition-colors duration-300"
          >
            View the work
            <ArrowDownRight size={20} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-1" />
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-8"
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-heading text-3xl md:text-4xl font-bold">{s.value}</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#a1a1aa] mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};
