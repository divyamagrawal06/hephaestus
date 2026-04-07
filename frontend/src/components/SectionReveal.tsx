"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function SectionReveal({
  children,
  className = "",
  delay = 0,
}: SectionRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.fromTo(
            containerRef.current,
            {
              y: 60,
              opacity: 0,
              scale: 0.95,
            },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.8,
              delay,
              ease: "power3.out",
            }
          );
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [delay]);

  return (
    <div ref={containerRef} className={className} style={{ opacity: 0.01 }}>
      {children}
    </div>
  );
}
