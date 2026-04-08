import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";

type CursorAuraProps = {
  reducedMotion: boolean;
};

export function CursorAura({ reducedMotion }: CursorAuraProps) {
  const auraRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const aura = auraRef.current;
    const dot = dotRef.current;
    if (!aura || !dot) {
      return;
    }

    const move = (event: PointerEvent) => {
      gsap.to(aura, {
        x: event.clientX - 90,
        y: event.clientY - 90,
        duration: 0.55,
        ease: "power3.out",
      });
      gsap.to(dot, {
        x: event.clientX - 4,
        y: event.clientY - 4,
        duration: 0.2,
        ease: "power2.out",
      });
    };

    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [reducedMotion]);

  if (reducedMotion) {
    return null;
  }

  return (
    <>
      <div
        ref={auraRef}
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.28),rgba(119,242,225,0.12),transparent_72%)] mix-blend-screen blur-2xl md:block"
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-2 w-2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.85)] md:block"
      />
    </>
  );
}
