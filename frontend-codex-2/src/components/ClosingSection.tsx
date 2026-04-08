import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";

function AccentFallback() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <div className="absolute h-28 w-28 rounded-full border border-[var(--forge-soft)]" />
      <div className="absolute h-20 w-20 rounded-full border border-white/20" />
      <div className="h-4 w-4 rounded-full bg-[var(--forge)] shadow-[0_0_25px_rgba(255,138,61,0.6)]" />
    </div>
  );
}

export function ClosingSection() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll("[data-rise]"),
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.95,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: root,
            start: "top 72%",
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="contact" className="relative overflow-hidden py-28 md:py-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,138,61,0.18),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
      <div className="section-shell">
        <div className="glass-panel grain relative overflow-hidden rounded-[2.5rem] px-6 py-12 md:px-12 md:py-16">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
          <div className="relative z-10 grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-end">
            <div>
              <div data-rise className="section-label mb-4">Closing frame</div>
              <h2 data-rise className="headline-section max-w-4xl text-balance">
                Beautiful enough to sell the vision.
                <br />
                Structured enough to keep building on top of it.
              </h2>
              <p data-rise className="body-copy mt-6 max-w-2xl">
                We now have the correct kind of foundation: visually authored, reference-driven, and organized around sections
                that can actually absorb the next waves of work.
              </p>
            </div>

            <div className="grid gap-5 md:justify-items-end">
              <div data-rise>
                <AccentFallback />
              </div>
              <a
                data-rise
                href="mailto:forge@hephaestus.world"
                className="inline-flex rounded-full bg-[var(--paper)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-white"
              >
                Start the next pass
              </a>
              <div data-rise className="text-right text-[11px] uppercase tracking-[0.3em] text-white/45">
                RPG world / advanced shaders / true loader sim next
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
