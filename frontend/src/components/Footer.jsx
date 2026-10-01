import { PROFILE } from "../data/portfolio";

export const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 md:px-12 lg:px-24 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-redhawk text-2xl">
          CLOUD<span className="text-[#2997FF]">.</span>
        </span>
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#a1a1aa]">
          © {new Date().getFullYear()} <span className="font-redhawk">CLOUD</span> — Crafted frame by frame
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#a1a1aa]">
          {PROFILE.location}
        </p>
      </div>
    </footer>
  );
};
