"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"noise" | "particles" | "spiral" | "logo" | "complete">("noise");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      setTimeout(() => onComplete(), 500);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      targetX: number;
      targetY: number;
      life: number;
      size: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const targetPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const radius = 80 + Math.sin(angle * 3) * 20;
      targetPoints.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.6,
      });
    }

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        targetX: targetPoints[i % targetPoints.length].x,
        targetY: targetPoints[i % targetPoints.length].y,
        life: Math.random(),
        size: Math.random() * 2 + 0.5,
      });
    }

    let time = 0;
    let currentPhase = 0;

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.016;

      if (time < 0.8) {
        currentPhase = 0;
      } else if (time < 1.4) {
        currentPhase = 1;
      } else if (time < 1.8) {
        currentPhase = 2;
      } else if (time < 2.0) {
        currentPhase = 3;
      } else {
        currentPhase = 4;
      }

      const progressValue = Math.min((time / 2.0) * 100, 100);
      setProgress(Math.floor(progressValue));

      particles.forEach((p, i) => {
        if (currentPhase === 0) {
          p.vx += (Math.random() - 0.5) * 0.5;
          p.vy += (Math.random() - 0.5) * 0.5;
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.x += p.vx;
          p.y += p.vy;
        } else if (currentPhase === 1 || currentPhase === 2) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = currentPhase === 1 ? 0.02 : 0.08;
          
          const spiralAngle = time * 2 + i * 0.1;
          const spiralStrength = Math.max(0, 1 - (time - 0.8) * 2);
          
          p.vx = dx * speed + Math.cos(spiralAngle) * spiralStrength * 30;
          p.vy = dy * speed + Math.sin(spiralAngle) * spiralStrength * 30;
          
          p.x += p.vx;
          p.y += p.vy;
        } else if (currentPhase === 3) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          p.x += dx * 0.15;
          p.y += dy * 0.15;
        }

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const alpha = currentPhase === 4 
          ? Math.max(0, 1 - (time - 1.8) * 5) 
          : Math.min(1, p.life + time * 0.5);

        const hue = currentPhase >= 2 ? 35 : 200 + Math.sin(time + i * 0.1) * 60;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
        ctx.fill();

        if (currentPhase >= 2 && Math.random() > 0.95) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha * 0.3})`;
          ctx.stroke();
        }
      });

      if (currentPhase >= 3) {
        const glowIntensity = Math.min((time - 1.4) * 2, 1);
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
        gradient.addColorStop(0, `rgba(245, 158, 11, ${glowIntensity * 0.3})`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - 200, centerY - 200, 400, 400);
      }

      if (time >= 2.0) {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            cancelAnimationFrame(animationId);
            onComplete();
          },
        });
        return;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ mixBlendMode: "screen" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
          Hephaestus Systems
        </div>
        <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="font-mono text-sm text-amber-500">
          {progress}%
        </div>
      </div>
    </div>
  );
}
