import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { SplineHero } from "./SplineHero";

const signaturePath =
  "M18.8 76.4C35.4 57.7 41.2 8.2 76 6.7c11.9-.5-7.1 88.6-42.1 96.5C15 107.6 35 34.1 72.5 14.6c18.2-9.5 17.8 18.1 17.8 18.1s6.3-7.6 7.2-4.6c1.3 4.5 4.6 3.2 9.9-.5 3.2-2.3 12.4 2.7 18.6-1.6 1.2-.8 4.7 1.2 4.7 1.2m-18.7 39.3-18.6 60m2.1-51.4c-.6 4.8-2.4 13.7-5.1 22.4-2.7 8.8-4.7 15.7-4.8 21.1m18.6-25.3c0 0-6.2-7.7-16.2-5.8-10 1.9-20.1 12.7-20.1 12.7S51 115 62 120.1c11 5.1 37.3-7.9 37.3-7.9s17-10.5 18.4-10.5c1.4 0-4.3 6-4 7.4.4 1.3 2.7 2.3 7-1.2 1.8-1.4 16.6-1 21.7.9 1.3.5 2.8-.2 4.1-1.1 1.9-1.3 8.6 1.5 8.6 1.5";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<SVGPathElement | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const stage = stageRef.current;
    const detail = detailRef.current;
    const signature = signatureRef.current;

    if (!section || !title || !stage || !detail || !signature) {
      return;
    }

    const ctx = gsap.context(() => {
      const titleWords = Array.from(title.querySelectorAll(".word"));

      gsap.fromTo(
        [...titleWords, ...Array.from(detail.children)],
        { yPercent: 100, rotate: 8, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.08,
          ease: "power3.out",
          delay: 2,
        },
      );

      const length = signature.getTotalLength();
      signature.style.strokeDasharray = `${length}`;
      signature.style.strokeDashoffset = `${length}`;
      gsap.to(signature, {
        strokeDashoffset: 0,
        duration: 1.8,
        delay: 1.6,
        ease: "power2.out",
      });

      gsap.to(title, {
        yPercent: -18,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(stage, {
        yPercent: -8,
        scale: 0.88,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(detail, {
        yPercent: -30,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, section);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[190vh] overflow-clip pt-24">
      <div className="absolute inset-0">
        <img
          src="/reference/home-back.jpg"
          alt="Hephaestus background"
          className="h-full w-full object-cover opacity-18"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,138,61,0.22),transparent_25%),linear-gradient(180deg,rgba(9,9,11,0.18),rgba(9,9,11,0.85)_75%,rgba(9,9,11,1))]" />
      </div>

      <div className="sticky top-0 min-h-screen">
        <div className="section-shell grid min-h-screen items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.45em] text-white/55">
              Award-grade reference rebuild / Hephaestus edition
            </div>

            <svg viewBox="0 0 180 136" className="mb-8 h-28 w-40 opacity-85">
              <path
                ref={signatureRef}
                d={signaturePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                className="text-white/90"
              />
            </svg>

            <h1 ref={titleRef} className="headline-hero text-balance">
              <span className="mask-line block"><span className="word inline-block">Forge</span></span>
              <span className="mask-line block"><span className="word inline-block text-white/65">impossible</span></span>
              <span className="mask-line block"><span className="word inline-block">interfaces.</span></span>
            </h1>

            <div ref={detailRef} className="mt-8 max-w-xl space-y-6">
              <p className="body-copy">
                We are rebuilding this around real award-winning direction: cinematic scroll, spatial depth, editorial pacing,
                and product storytelling that feels expensive the second it loads.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#work"
                  className="rounded-full bg-[var(--paper)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-white"
                >
                  Explore the work
                </a>
                <a
                  href="#systems"
                  className="rounded-full border border-white/14 px-6 py-3 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-[var(--forge)] hover:text-white"
                >
                  Enter systems
                </a>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.32em] text-white/45">
                <span>GSAP scroll language</span>
                <span>Spline hero stage</span>
                <span>Three.js system layer</span>
              </div>
            </div>
          </div>

          <div ref={stageRef} className="relative z-10 h-[62vh] min-h-[30rem]">
            <div className="glass-panel absolute -left-10 top-[10%] hidden w-44 rounded-[1.5rem] p-4 text-[10px] uppercase tracking-[0.3em] text-white/60 md:block">
              <div className="mb-3 text-white">Winter-opener energy</div>
              <div className="space-y-2 text-white/45">
                <p>Depth-shifted hero</p>
                <p>Glow-driven layering</p>
                <p>Progressive reveal</p>
              </div>
            </div>

            <SplineHero />

            <div className="glass-panel absolute -bottom-5 right-4 w-[min(86%,20rem)] rounded-[1.75rem] p-5">
              <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-white/45">Current direction</div>
              <p className="font-display text-2xl leading-tight text-white">
                A luxury product world, not a generic SaaS hero.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
