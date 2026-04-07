"use client";

import { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);

    // Gradient orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.3, r: 300, color: "rgba(245, 158, 11, 0.08)", dx: 0.2, dy: 0.1 },
      { x: width * 0.8, y: height * 0.7, r: 400, color: "rgba(59, 130, 246, 0.05)", dx: -0.15, dy: -0.2 },
      { x: width * 0.5, y: height * 0.5, r: 250, color: "rgba(139, 92, 246, 0.06)", dx: 0.1, dy: 0.15 },
    ];

    let frameCount = 0;
    let rafId: number;

    const animate = () => {
      frameCount++;
      // Render at 30fps
      if (frameCount % 2 !== 0) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      ctx.fillStyle = "rgba(10, 10, 10, 0.1)";
      ctx.fillRect(0, 0, width, height);

      orbs.forEach((orb) => {
        // Update position
        orb.x += orb.dx;
        orb.y += orb.dy;

        // Bounce off edges
        if (orb.x < -orb.r || orb.x > width + orb.r) orb.dx *= -1;
        if (orb.y < -orb.r || orb.y > height + orb.r) orb.dy *= -1;

        // Draw gradient orb
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      rafId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "#0a0a0a" }}
    />
  );
}
