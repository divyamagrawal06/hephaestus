import { Suspense, lazy, useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const LazySplineHero = lazy(() =>
  import("./SplineHero").then((mod) => ({ default: mod.SplineHero }))
);

type HeroSectionProps = {
  enableSpline: boolean;
  introReady: boolean;
};

export const HeroSection = ({ enableSpline, introReady }: HeroSectionProps) => {
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const titleTopRef = useRef<HTMLDivElement | null>(null);
  const titleBottomRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<SVGPathElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!introReady || reducedMotion) return;
    const elements = [
      titleTopRef.current,
      titleBottomRef.current,
      detailRef.current,
      actionRef.current,
    ].filter(Boolean) as HTMLElement[];

    elements.forEach((el) => {
      el.style.transform = "translateY(130%) rotate(8deg)";
    });

    import("animejs")
      .then(({ animate, stagger }) => {
        animate(elements, {
          translateY: ["130%", "0%"],
          rotate: ["8deg", "0deg"],
          easing: "cubicBezier(0.165, 0.84, 0.44, 1)",
          duration: 900,
          delay: stagger(90, { start: 300 }),
        });
      })
      .catch(() => undefined);

    if (signatureRef.current) {
      signatureRef.current.style.strokeDashoffset = "420";
      signatureRef.current.style.strokeDasharray = "420";
      signatureRef.current.animate(
        [{ strokeDashoffset: "420" }, { strokeDashoffset: "0" }],
        {
          duration: 1200,
          delay: 500,
          easing: "cubic-bezier(.72,.3,.25,1)",
          fill: "forwards",
        }
      );
    }
  }, [introReady, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    let cleanup: (() => void) | undefined;
    const element = parallaxRef.current;
    if (!element) return;

    import("../lib/gsap")
      .then(({ gsap }) => {
        const ctx = gsap.context(() => {
          gsap.utils
            .toArray<HTMLElement>("[data-parallax]")
            .forEach((layer) => {
              const speed = Number(layer.dataset.parallax) || 0.2;
              gsap.to(layer, {
                yPercent: speed * 60,
                ease: "none",
                scrollTrigger: {
                  trigger: "#hero",
                  start: "top top",
                  end: "bottom top",
                  scrub: true,
                },
              });
            });
        }, element);
        cleanup = () => ctx.revert();
      })
      .catch(() => undefined);

    return () => cleanup?.();
  }, [reducedMotion]);

  return (
    <section
      id="hero"
      className="relative min-h-screen overflow-hidden border-b border-white/10 bg-forge-linear"
    >
      <div className="absolute inset-0 forge-grid opacity-40" />
      <div className="absolute inset-0 bg-forge-radial opacity-80" />

      <div className="absolute inset-0">
        {enableSpline ? (
          <Suspense
            fallback={
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,106,42,0.32),transparent_50%),radial-gradient(circle_at_70%_40%,rgba(62,240,214,0.22),transparent_45%)]" />
            }
          >
            <LazySplineHero />
          </Suspense>
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,106,42,0.32),transparent_50%),radial-gradient(circle_at_70%_40%,rgba(62,240,214,0.22),transparent_45%)]" />
        )}
      </div>

      <div
        ref={parallaxRef}
        className="relative z-10 flex min-h-screen flex-col justify-center px-6 pb-20 pt-28 md:px-16 lg:px-24"
      >
        <div className="max-w-4xl">
          <div className="mb-6 text-xs uppercase tracking-[0.5em] text-white/50">
            Hephaestus forge series
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-white">
            <span className="block overflow-hidden">
              <span ref={titleTopRef} className="inline-block">
                Forge the future
              </span>
            </span>
            <span className="block overflow-hidden">
              <span ref={titleBottomRef} className="inline-block">
                in liquid light.
              </span>
            </span>
          </h1>
          <div ref={detailRef} className="mt-6 max-w-xl text-lg text-white/70">
            A cinematic WebGPU landing experience where molten particles resolve
            into clarity, guided by scroll‑driven depth and living motion.
          </div>
          <div ref={actionRef} className="mt-8 flex flex-wrap gap-4">
            <button className="button-glow rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-forge">
              Enter the Forge
            </button>
            <button className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/80 hover:border-white">
              Watch the Build
            </button>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6">
          <div
            data-parallax="0.1"
            className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.4em] text-white/60"
          >
            <span className="h-2 w-2 rounded-full bg-ember animate-pulse" />
            WebGPU Reveal
          </div>
          <div data-parallax="0.24" className="max-w-xs text-sm text-white/50">
            Scroll to pull the camera back and expose the full system.
          </div>
          <div data-parallax="0.18" className="mt-6">
            <svg viewBox="0 0 320 160" className="h-24 text-white/60">
              <path
                ref={signatureRef}
                d="M20 120 C 60 40, 140 30, 200 90 S 300 140, 310 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
