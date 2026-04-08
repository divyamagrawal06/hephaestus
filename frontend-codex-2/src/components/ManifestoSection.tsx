import { useLayoutEffect, useMemo, useRef } from "react";
import { gsap } from "../lib/gsap";

const lines = [
  "Every section should feel directed, not assembled.",
  "Every layer should justify the cost of motion.",
  "Every scroll beat should reveal a decision, not filler.",
];

function splitText(text: string) {
  return text.split("").map((char, index) => (
    <span key={`${char}-${index}`} className="char">
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

export function ManifestoSection() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const copyRefs = useRef<HTMLParagraphElement[]>([]);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const paragraphs = useMemo(() => lines.map((line) => splitText(line)), []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    const profile = profileRef.current;

    if (!section || !heading || !profile) {
      return;
    }

    const chars = Array.from(section.querySelectorAll<HTMLElement>(".char"));
    const cards = copyRefs.current.filter(Boolean);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        heading.querySelectorAll(".word"),
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          stagger: 0.08,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
          },
        },
      );

      gsap.fromTo(
        chars,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.012,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 65%",
          },
        },
      );

      gsap.fromTo(
        cards,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.14,
          duration: 0.85,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 60%",
          },
        },
      );

      gsap.fromTo(
        profile,
        { clipPath: "inset(18% 18% 18% 18% round 2rem)", y: 60 },
        {
          clipPath: "inset(0% 0% 0% 0% round 2rem)",
          y: 0,
          duration: 1.3,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-28 md:py-40">
      <div ref={sectionRef} className="section-shell grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-start">
        <div>
          <div className="section-label mb-4">Manifesto</div>
          <div ref={headingRef} className="headline-section">
            <div className="mask-line"><span className="word inline-block">Direction</span></div>
            <div className="mask-line"><span className="word inline-block text-white/60">beats</span></div>
            <div className="mask-line"><span className="word inline-block">decoration.</span></div>
          </div>
          <div className="mt-8 grid gap-4">
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                ref={(node) => {
                  if (node) {
                    copyRefs.current[index] = node;
                  }
                }}
                className="border-l border-white/10 pl-5 text-lg leading-8 text-white/72"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div ref={profileRef} className="grain glass-panel relative overflow-hidden rounded-[2rem] p-4">
            <img
              src="/reference/profile-photo.jpg"
              alt="Portrait reference"
              className="h-[30rem] w-full rounded-[1.5rem] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 max-w-sm">
              <div className="mb-3 text-[10px] uppercase tracking-[0.36em] text-white/50">Reference energy</div>
              <p className="font-display text-3xl leading-tight text-white">
                Dark editorial framing, human scale, and motion that serves the composition.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-panel rounded-[1.5rem] p-6">
              <div className="mb-2 text-[10px] uppercase tracking-[0.35em] text-white/45">What changed</div>
              <p className="text-sm leading-7 text-white/68">
                We are now using a real reference grammar: restrained color, oversized type, strong image-led composition,
                and animation that feels authored.
              </p>
            </div>
            <div className="glass-panel rounded-[1.5rem] p-6">
              <div className="mb-2 text-[10px] uppercase tracking-[0.35em] text-white/45">What comes next</div>
              <p className="text-sm leading-7 text-white/68">
                Once this base is stable, we can slot in the RPG world from the separate reference without polluting the rest
                of the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
