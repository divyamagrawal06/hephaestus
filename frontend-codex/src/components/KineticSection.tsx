import { useEffect, useRef } from "react";
import { useSplitText } from "../hooks/useSplitText";
import { useReducedMotion } from "../hooks/useReducedMotion";

export const KineticSection = () => {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const reducedMotion = useReducedMotion();

  useSplitText(headingRef, { stagger: 28, threshold: 0.4 });

  useEffect(() => {
    if (reducedMotion) return;
    let cleanup: (() => void) | undefined;

    import("../lib/gsap")
      .then(({ gsap }) => {
        const orb = document.querySelector("#forge-orb");
        if (!orb) return;
        const ctx = gsap.context(() => {
          gsap.to(orb, {
            motionPath: {
              path: "#forge-path",
              align: "#forge-path",
              autoRotate: false,
            },
            ease: "none",
            scrollTrigger: {
              trigger: "#kinetic",
              start: "top 70%",
              end: "bottom top",
              scrub: true,
            },
          });
        });
        cleanup = () => ctx.revert();
      })
      .catch(() => undefined);

    return () => cleanup?.();
  }, [reducedMotion]);

  return (
    <section
      id="kinetic"
      className="relative overflow-hidden bg-graphite px-6 py-24 md:px-16 lg:px-24"
    >
      <div className="absolute inset-0 bg-forge-radial opacity-80" />
      <div className="relative z-10">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.5em] text-white/50">
            Kinetic typography
          </div>
          <h2
            ref={headingRef}
            className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl text-white"
          >
            ENGINEERED MOMENTUM
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Motion path choreography compresses, tracks, and releases typography
            as you scroll. Every character is paced to the camera pullback.
          </p>
        </div>
        <div className="mt-16">
          <svg viewBox="0 0 1000 240" className="h-48 w-full text-white/30">
            <path
              id="forge-path"
              d="M 20 200 C 200 30, 420 30, 600 160 S 980 240, 980 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle id="forge-orb" r="10" fill="#ff6a2a" />
          </svg>
        </div>
      </div>
    </section>
  );
};
