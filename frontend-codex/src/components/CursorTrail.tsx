import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

type TrailPoint = {
  x: number;
  y: number;
  alpha: number;
  size: number;
};

export const CursorTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points: TrailPoint[] = [];
    let animationId = 0;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (event: PointerEvent) => {
      points.push({
        x: event.clientX * window.devicePixelRatio,
        y: event.clientY * window.devicePixelRatio,
        alpha: 0.55,
        size: 24 + Math.random() * 22,
      });
    };
    window.addEventListener("pointermove", onMove);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
      for (let i = points.length - 1; i >= 0; i -= 1) {
        const p = points[i];
        p.alpha *= 0.92;
        p.size *= 0.98;
        if (p.alpha < 0.03) {
          points.splice(i, 1);
          continue;
        }
        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size
        );
        gradient.addColorStop(0, `rgba(62, 240, 214, ${p.alpha})`);
        gradient.addColorStop(1, "rgba(62, 240, 214, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      animationId = window.requestAnimationFrame(tick);
    };
    animationId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(animationId);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return <canvas ref={canvasRef} className="cursor-canvas" />;
};
