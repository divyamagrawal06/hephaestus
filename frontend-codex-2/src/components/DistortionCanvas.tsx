import { useEffect, useRef } from "react";

type DistortionCanvasProps = {
  reducedMotion: boolean;
};

export function DistortionCanvas({ reducedMotion }: DistortionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame = 0;
    let rafId = 0;
    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
    };

    const trails = Array.from({ length: 16 }, () => ({
      x: pointer.x,
      y: pointer.y,
    }));

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const move = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const render = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      trails.forEach((trail, index) => {
        const factor = 0.18 - index * 0.008;
        trail.x += (pointer.x - trail.x) * factor;
        trail.y += (pointer.y - trail.y) * factor;

        const gradient = context.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, 120 + index * 14);
        gradient.addColorStop(0, `rgba(255, 138, 61, ${0.08 - index * 0.003})`);
        gradient.addColorStop(0.45, `rgba(119, 242, 225, ${0.04 - index * 0.0015})`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(trail.x, trail.y, 120 + index * 14 + Math.sin(frame * 0.02 + index) * 10, 0, Math.PI * 2);
        context.fill();
      });

      frame += 1;
      rafId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return null;
  }

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[1] opacity-70 mix-blend-screen" aria-hidden="true" />;
}
