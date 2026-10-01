import Marquee from "react-fast-marquee";
import { TOOLS } from "../data/portfolio";

export const Tools = () => {
  return (
    <section id="tools" className="relative z-10 py-20 md:py-28 border-y border-white/10" data-testid="tools-section">
      <div className="px-6 md:px-12 lg:px-24 mb-10">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#2997FF]">/ Software</span>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-3 max-w-xl">
          Tools I cut, animate and mix with.
        </h2>
      </div>

      <Marquee direction="left" speed={40} gradient gradientColor="#050505" gradientWidth={120} autoFill pauseOnHover>
        {TOOLS.map((t) => (
          <span
            key={t}
            data-testid={`tool-${t.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
            className="mx-8 font-heading text-4xl md:text-6xl font-black tracking-tighter text-[#52525b] hover:text-white transition-colors duration-500 cursor-default"
          >
            {t}
          </span>
        ))}
      </Marquee>
    </section>
  );
};
