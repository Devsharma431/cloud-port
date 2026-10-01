import { motion } from "framer-motion";
import { MANIFESTO, SERVICES } from "../data/portfolio";

export const About = () => {
  return (
    <section id="about" className="relative z-10 py-24 md:py-32 px-6 md:px-12 lg:px-24">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-24">
        <div className="lg:col-span-4">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#2997FF]">/ About</span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-4 leading-tight"
          >
            An editor who thinks like a director.
          </motion.h2>
          <p className="text-[#a1a1aa] leading-relaxed mt-6">
            Freelance video editor & motion designer partnering with creators, studios and brands to ship
            scroll-stopping content — from viral shorts to feature-length documentaries. Worked with the
            world&apos;s biggest creators like <span className="text-white">Jake Sweet</span>,{" "}
            <span className="text-white">Louie Sweet</span>, <span className="text-white">Scout</span>,{" "}
            <span className="text-white">Payal Gaming</span> and more.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <span key={s} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa]">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col">
          {MANIFESTO.map((m, i) => (
            <motion.div
              key={m.no}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-12 py-10 border-t border-white/10 last:border-b"
            >
              <div className="font-heading text-5xl md:text-7xl font-black text-white/10">{m.no}</div>
              <div>
                <h3 className="font-heading text-2xl md:text-3xl font-medium">{m.title}</h3>
                <p className="text-[#a1a1aa] leading-relaxed mt-3 max-w-xl">{m.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
