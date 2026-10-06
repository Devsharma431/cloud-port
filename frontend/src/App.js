import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "@/App.css";
import { Toaster } from "sonner";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Projects } from "./components/Projects";
import { About } from "./components/About";
import { Tools } from "./components/Tools";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { ChatWidget } from "./components/ChatWidget";

function App() {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisRef.current = lenis;
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  const navigate = (id) => {
    if (id === "top") {
      lenisRef.current?.scrollTo(0, { duration: 1.2 });
      return;
    }
    const el = document.getElementById(id);
    if (el) lenisRef.current?.scrollTo(el, { offset: -60, duration: 1.3 });
  };

  return (
    <div className="App bg-[#050505] text-white font-body min-h-screen relative">
      <div className="grain" />
      <Toaster theme="dark" position="bottom-left" richColors />
      <Navbar onNavigate={navigate} />
      <main>
        <Hero onNavigate={navigate} />
        <Projects />
        <About />
        <Tools />
        <Contact />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

export default App;