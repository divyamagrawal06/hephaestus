import { useEffect, useState } from "react";
import { ForgeLoader } from "./components/ForgeLoader";
import { CursorTrail } from "./components/CursorTrail";
import { ParticleVeil } from "./components/ParticleVeil";
import { DistortionOverlay } from "./components/DistortionOverlay";
import { HeroSection } from "./components/HeroSection";
import { MarqueeRail } from "./components/MarqueeRail";
import { SignalSection } from "./components/SignalSection";
import { SectionDivider } from "./components/SectionDivider";
import { KineticSection } from "./components/KineticSection";
import { CarouselSection } from "./components/CarouselSection";
import { ProofSection } from "./components/ProofSection";
import { CTASection } from "./components/CTASection";
import { RPGPlaceholder } from "./components/RPGPlaceholder";
import { useIdle } from "./hooks/useIdle";
import { useReducedMotion } from "./hooks/useReducedMotion";

const marqueeItems = [
  "Hephaestus",
  "Forge",
  "WebGPU",
  "Liquid Motion",
  "Scroll Cinema",
  "Signal",
  "Systems",
  "Momentum",
];

function App() {
  const [loading, setLoading] = useState(true);
  const [idleReady, setIdleReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const enableRPG = false;

  useIdle(() => setIdleReady(true), 1400);

  useEffect(() => {
    if (reducedMotion) return;
    let lenisInstance: any;
    let rafId = 0;
    import("lenis")
      .then((module) => {
        const Lenis = module.default;
        lenisInstance = new Lenis({
          smoothWheel: true,
          lerp: 0.08,
        });

        lenisInstance.on("scroll", () => {
          import("./lib/gsap")
            .then(({ ScrollTrigger }) => ScrollTrigger.update())
            .catch(() => undefined);
        });

        const raf = (time: number) => {
          lenisInstance?.raf(time);
          rafId = window.requestAnimationFrame(raf);
        };
        rafId = window.requestAnimationFrame(raf);
      })
      .catch(() => undefined);

    return () => {
      if (lenisInstance) lenisInstance.destroy();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  return (
    <div className="grain-overlay relative min-h-screen bg-obsidian text-white">
      {loading && <ForgeLoader onFinish={() => setLoading(false)} />}

      {!reducedMotion && <CursorTrail />}
      {!reducedMotion && idleReady && <ParticleVeil />}
      {!reducedMotion && idleReady && <DistortionOverlay />}

      <header className="fixed left-0 right-0 top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-16">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.4em] text-white/70">
            <span className="h-2 w-2 rounded-full bg-ember" />
            Hephaestus
          </div>
          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.4em] text-white/60 md:flex">
            <a href="#hero">Hero</a>
            <a href="#kinetic">Motion</a>
            <a href="#proof">Proof</a>
          </nav>
          <button className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 hover:border-white">
            Request access
          </button>
        </div>
      </header>

      <main className="relative z-10">
        <HeroSection enableSpline={!loading && idleReady && !reducedMotion} introReady={!loading} />
        <MarqueeRail items={marqueeItems} />
        <SignalSection />
        <SectionDivider />
        <KineticSection />
        <MarqueeRail items={[...marqueeItems].reverse()} />
        <CarouselSection />
        {enableRPG && <RPGPlaceholder />}
        <ProofSection />
        <CTASection />
      </main>

      <footer className="border-t border-white/10 bg-black px-6 py-8 text-xs uppercase tracking-[0.4em] text-white/40 md:px-16">
        Hephaestus Forge © 2026 — Built for real-time decision craft
      </footer>
    </div>
  );
}

export default App;
