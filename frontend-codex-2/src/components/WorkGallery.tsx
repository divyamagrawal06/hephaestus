import { useLayoutEffect, useRef } from "react";
import type { GalleryItem } from "../data/site";
import { gsap, ScrollTrigger } from "../lib/gsap";

type WorkGalleryProps = {
  items: GalleryItem[];
};

export function WorkGallery({ items }: WorkGalleryProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;

    if (!section || !track) {
      return;
    }

    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-card]"));

    const ctx = gsap.context(() => {
      const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);

      gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance() + window.innerHeight}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { yPercent: index % 2 === 0 ? 12 : -12, rotate: index % 2 === 0 ? -4 : 4 },
          {
            yPercent: index % 2 === 0 ? -10 : 10,
            rotate: index % 2 === 0 ? 4 : -4,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    }, section);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="work" className="relative h-[320vh] bg-[#0b0b0f]">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="section-shell flex items-end justify-between pb-8 pt-28">
          <div className="max-w-2xl">
            <div className="section-label mb-4">Selected worlds</div>
            <h2 className="headline-section text-balance">
              A horizontal gallery with some actual tension in it.
            </h2>
          </div>
          <p className="hidden max-w-md text-sm leading-7 text-white/50 md:block">
            This section leans directly into the Musab reference grammar: large image-led cards, dark editorial space, and
            motion that feels pulled by the camera rather than shoved by the UI.
          </p>
        </div>

        <div ref={trackRef} className="flex h-full items-center gap-8 px-[max(1.25rem,4vw)] pb-14 will-change-transform">
          {items.map((item) => (
            <article
              key={item.id}
              data-card
              className="group relative flex h-[66vh] min-h-[30rem] w-[min(72vw,34rem)] shrink-0 flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 bg-white/5"
            >
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/85" />
              <div
                className="absolute left-6 top-6 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-black"
                style={{ backgroundColor: item.accent }}
              >
                {item.year}
              </div>
              <div className="relative z-10 p-6 md:p-8">
                <div className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/55">{item.subtitle}</div>
                <h3 className="font-display text-4xl leading-none text-white md:text-5xl">{item.title}</h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-white/65">{item.summary}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {item.bullets.map((bullet) => (
                    <span
                      key={bullet}
                      className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-[10px] uppercase tracking-[0.28em] text-white/58 backdrop-blur-sm"
                    >
                      {bullet}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
