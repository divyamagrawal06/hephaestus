import { useEffect, useMemo, useState } from "react";
import Lenis from "lenis";
import { Loader } from "./components/Loader";
import { CursorAura } from "./components/CursorAura";
import { DistortionCanvas } from "./components/DistortionCanvas";
import { NavBar } from "./components/NavBar";
import { HeroSection } from "./components/HeroSection";
import { Marquee } from "./components/Marquee";
import { WorkGallery } from "./components/WorkGallery";
import { ManifestoSection } from "./components/ManifestoSection";
import { SystemsSection } from "./components/SystemsSection";
import { ClosingSection } from "./components/ClosingSection";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { galleryItems, marqueeRows } from "./data/site";
import "./lib/gsap";

function App() {
  const reducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const showLoader = useMemo(() => !reducedMotion, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [reducedMotion]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: reducedMotion ? 1 : 1.15,
      smoothWheel: !reducedMotion,
      syncTouch: false,
      touchMultiplier: 1.1,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };

    frame = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reducedMotion]);

  return (
    <div className="relative min-h-screen overflow-clip bg-[var(--ink)] text-[var(--paper)]">
      <DistortionCanvas reducedMotion={reducedMotion} />
      <CursorAura reducedMotion={reducedMotion} />
      {showLoader ? <Loader active={loading} /> : null}

      <div
        className={[
          "relative z-10 transition-opacity duration-700",
          loading ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <NavBar />

        <main>
          <HeroSection />
          {marqueeRows.map((row, index) => (
            <Marquee
              key={row}
              text={row}
              reverse={index % 2 === 1}
              muted={index === 1}
            />
          ))}
          <WorkGallery items={galleryItems} />
          <ManifestoSection />
          <SystemsSection />
          <ClosingSection />
        </main>

        <footer className="border-t border-white/10 px-6 py-8 md:px-12">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs uppercase tracking-[0.35em] text-white/50 md:flex-row md:items-center md:justify-between">
            <span>Hephaestus Forge</span>
            <span>Built for cinematic product worlds</span>
            <a href="mailto:forge@hephaestus.world" className="transition hover:text-white">
              forge@hephaestus.world
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
