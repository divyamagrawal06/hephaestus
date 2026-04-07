"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export default function CursorGlow() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Detect touch device
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (isTouch) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("hoverable")
      ) {
        gsap.to(cursor, {
          scale: 2,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleMouseOut = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseout", handleMouseOut, { passive: true });

    // Smooth follow animation
    let rafId: number;
    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;

      if (cursor) {
        cursor.style.transform = `translate(${cursorX - 150}px, ${cursorY - 150}px)`;
      }

      rafId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(rafId);
    };
  }, [isTouch]);

  if (isTouch) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-[300px] h-[300px] pointer-events-none z-50 mix-blend-screen"
      style={{
        background:
          "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 40%, transparent 70%)",
        willChange: "transform",
      }}
    />
  );
}
