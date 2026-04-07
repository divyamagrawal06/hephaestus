"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronDown } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  isLoaded: boolean;
}

export default function HeroSection({ isLoaded }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const chars = headlineRef.current?.querySelectorAll(".char");
      if (chars) {
        gsap.fromTo(
          chars,
          { y: 100, opacity: 0, rotateX: -90 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.8,
            stagger: 0.03,
            ease: "back.out(1.7)",
            delay: 0.3,
          },
        );
      }

      gsap.fromTo(
        subheadRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.8, ease: "power3.out" },
      );

      gsap.fromTo(
        ctaRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 1.0, ease: "power3.out" },
      );

      // Parallax layers
      gsap.to(".hero-parallax-bg", {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(".hero-parallax-fg", {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Fade out content on scroll
      gsap.to([headlineRef.current, subheadRef.current, ctaRef.current], {
        opacity: 0,
        y: -50,
        stagger: 0.1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "30% top",
          end: "80% top",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isLoaded]);

  const splitText = (text: string) => {
    return text.split("").map((char, i) => (
      <span
        key={i}
        className="char inline-block"
        style={{ display: char === " " ? "inline" : "inline-block" }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[200vh] w-full overflow-hidden"
    >
      <div className="sticky top-0 h-screen w-full">
        {/* Background gradient */}
        <div className="hero-parallax-bg absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-50" />
        </div>

        {/* 3D Scene - Spline disabled due to React 19 incompatibility */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(245,158,11,0.15)_0%,_transparent_50%)]" />
          </div>
        </div>

        {/* Vignette overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />

        {/* Bottom gradient fade */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/80" />

        {/* Content */}
        <div className="hero-parallax-fg absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
          <h1
            ref={headlineRef}
            className="text-center text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight perspective-1000"
          >
            <span className="block text-gradient">
              {splitText("See failure")}
            </span>
            <span className="block text-white mt-2">
              {splitText("before it happens")}
            </span>
          </h1>

          <p
            ref={subheadRef}
            className="mt-8 max-w-2xl text-center text-lg md:text-xl text-neutral-400"
          >
            AI-powered predictive maintenance for industrial fleets. Anticipate
            equipment failures weeks in advance.
          </p>

          <div
            ref={ctaRef}
            className="mt-10 flex flex-col sm:flex-row gap-4 pointer-events-auto"
          >
            <a
              href="#fleet"
              className="group px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-full transition-all duration-300 glow-amber flex items-center gap-2"
            >
              Explore Platform
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </a>
            <a
              href="#demo"
              className="px-8 py-4 border border-neutral-700 hover:border-neutral-500 text-white font-semibold rounded-full transition-all duration-300 hover:bg-neutral-800/50"
            >
              Watch Demo
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <div className="w-6 h-10 border-2 border-neutral-600 rounded-full flex items-start justify-center p-1 animate-bounce">
            <div className="w-1.5 h-3 bg-amber-500 rounded-full" />
          </div>
          <span className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            Scroll
          </span>
        </div>
      </div>
    </section>
  );
}
