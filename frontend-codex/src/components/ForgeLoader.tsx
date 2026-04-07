import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

type LoaderMode = "webgpu" | "webgl" | "css";

type ForgeLoaderProps = {
  onFinish: () => void;
};

const detectMode = (): LoaderMode => {
  if ("gpu" in navigator) return "webgpu";
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (gl) return "webgl";
  return "css";
};

export const ForgeLoader = ({ onFinish }: ForgeLoaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<LoaderMode>("css");
  const [progress, setProgress] = useState(0);

  const label = useMemo(() => {
    if (mode === "webgpu") return "WebGPU";
    if (mode === "webgl") return "WebGL";
    return "CSS";
  }, [mode]);

  useEffect(() => {
    setMode(detectMode());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion || mode === "css") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let running = true;
    let animationId = 0;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    const buildTargets = () => {
      const size = Math.min(220, window.innerWidth * 0.22);
      offscreen.width = window.innerWidth * window.devicePixelRatio;
      offscreen.height = window.innerHeight * window.devicePixelRatio;
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.fillStyle = "#fff";
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.font = `700 ${size}px Unbounded, sans-serif`;
      offCtx.fillText("HEPHAESTUS", offscreen.width / 2, offscreen.height / 2);

      const imageData = offCtx.getImageData(
        0,
        0,
        offscreen.width,
        offscreen.height
      );
      const targets: { x: number; y: number }[] = [];
      for (let y = 0; y < imageData.height; y += 7) {
        for (let x = 0; x < imageData.width; x += 7) {
          const idx = (y * imageData.width + x) * 4;
          if (imageData.data[idx + 3] > 140) {
            targets.push({ x, y });
          }
        }
      }
      return targets;
    };

    let targets = buildTargets();
    const points = targets.map((target) => ({
      x: Math.random() * offscreen.width,
      y: Math.random() * offscreen.height,
      vx: 0,
      vy: 0,
      tx: target.x,
      ty: target.y,
    }));

    const animate = () => {
      if (!running) return;
      frame += 1;
      const t = Math.min(frame / 90, 1);
      setProgress(t);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.fillStyle = "rgba(10, 10, 15, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      points.forEach((p, index) => {
        const swirl = Math.sin((frame + index) * 0.02) * (1 - t) * 24;
        const dx = p.tx - p.x + swirl;
        const dy = p.ty - p.y - swirl;
        p.vx += dx * (0.0006 + t * 0.002);
        p.vy += dy * (0.0006 + t * 0.002);
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 106, 42, ${0.35 + t * 0.5})`;
        ctx.arc(
          p.x / window.devicePixelRatio,
          p.y / window.devicePixelRatio,
          1.2 + Math.sin(frame * 0.01) * 0.6,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      ctx.restore();
      animationId = window.requestAnimationFrame(animate);
    };

    animationId = window.requestAnimationFrame(animate);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
    };
  }, [mode, reducedMotion]);

  useEffect(() => {
    const timer = window.setTimeout(() => onFinish(), 1700);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-obsidian text-white">
      {!reducedMotion && mode !== "css" && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="text-xs uppercase tracking-[0.5em] text-white/50">
          {label} forge
        </div>
        <div className="text-4xl md:text-6xl font-display text-gradient glow-text">
          Hephaestus
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-white/60">
          <span className="h-[1px] w-12 bg-white/40" />
          Reality forming
          <span className="h-[1px] w-12 bg-white/40" />
        </div>
        <div className="h-[2px] w-64 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-ember via-auric to-neon"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border border-white/20" />
          <div className="absolute inset-2 rounded-full border border-ember/70 animate-pulse" />
          <div className="absolute left-1/2 top-0 h-3 w-[1px] -translate-x-1/2 bg-white/70" />
        </div>
      </div>
    </div>
  );
};
