import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { PROFILE } from "../data/portfolio";

const LINKS = [
  { label: "Projects", id: "work" },
  { label: "About", id: "about" },
];

export const Navbar = ({ onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    onNavigate(id);
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-[#050505]/70 backdrop-blur-xl border-b border-white/10" : "border-b border-transparent"
      }`}
      data-testid="navbar"
    >
      <nav className="mx-auto flex items-center justify-between px-6 md:px-12 lg:px-24 py-5">
        <button
          onClick={() => go("top")}
          data-testid="nav-logo"
          className="font-redhawk text-4xl md:text-5xl lg:text-6xl leading-none"
        >
          CLOUD<span className="text-[#2997FF]">.</span>
        </button>

        <div className="hidden md:flex items-center gap-10">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              data-testid={`nav-${l.id}`}
              className="font-mono text-xs uppercase tracking-[0.2em] text-[#a1a1aa] hover:text-white transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => go("contact")}
          data-testid="nav-contact-btn"
          className="hidden md:inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white hover:text-black transition-colors duration-300"
        >
          Let&apos;s Talk
        </button>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen((o) => !o)}
          data-testid="nav-mobile-toggle"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-[#050505] border-b border-white/10"
          >
            <div className="flex flex-col px-6 py-6 gap-5">
              {[...LINKS, { label: "Let's Talk", id: "contact" }].map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className="text-left font-heading text-2xl font-bold"
                  data-testid={`nav-mobile-${l.id}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
