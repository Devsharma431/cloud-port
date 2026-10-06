import { useEffect, useRef, useState } from "react";

const FINE_POINTER = "(hover: hover) and (pointer: fine) and (min-width: 768px)";

export const Cursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(() => window.matchMedia(FINE_POINTER).matches);

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER);
    const onChange = (e) => setEnabled(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    let rx = 0, ry = 0, mx = 0, my = 0;
    let raf;

    const move = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot) dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    };
    const loop = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    const over = (e) => {
      const target = e.target.closest("a, button, [data-cursor], iframe, .group");
      if (target) {
        ring?.classList.add("hovered");
        if (target.closest(".group") || target.tagName === "IFRAME") {
          ring?.classList.add("video-hover");
        }
      }
    };
    const out = (e) => {
      const target = e.target.closest("a, button, [data-cursor], iframe, .group");
      if (target) {
        ring?.classList.remove("hovered");
        ring?.classList.remove("video-hover");
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over, true);
    window.addEventListener("mouseout", out, true);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over, true);
      window.removeEventListener("mouseout", out, true);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
};