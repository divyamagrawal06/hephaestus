import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";

type LoaderProps = {
  active: boolean;
};

export function Loader({ active }: LoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wordRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const word = wordRef.current;
    const progress = progressRef.current;
    const canvas = canvasRef.current;

    if (!word || !progress || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let animationFrame = 0;
    let rafId = 0;
    let progressValue = 0;
    let settled = false;
    const particles = Array.from({ length: 180 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 180,
      radius: 120 + Math.random() * 240,
      speed: 0.004 + Math.random() * 0.012,
      size: 1 + Math.random() * 2.2,
      drift: Math.random() * 0.6,
    }));

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const timeline = gsap.timeline();
    timeline
      .fromTo(
        word,
        { opacity: 0, yPercent: 35, letterSpacing: "0.9em" },
        { opacity: 1, yPercent: 0, letterSpacing: "0.28em", duration: 1.4, ease: "power3.out" },
      )
      .fromTo(
        progress,
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 1.9,
          ease: "power2.inOut",
          onUpdate: () => {
            progressValue = timeline.progress();
          },
          onComplete: () => {
            settled = true;
          },
        },
        0.12,
      );

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.5;

      particles.forEach((particle, index) => {
        particle.angle += particle.speed;
        const convergence = settled ? 0.22 : 1 - progressValue * 0.86;
        const x =
          centerX +
          Math.cos(particle.angle + index * 0.02) * particle.radius * convergence +
          Math.sin(animationFrame * 0.003 + particle.drift) * 18;
        const y =
          centerY +
          Math.sin(particle.angle * 1.4 + index * 0.01) * particle.radius * convergence * 0.5 +
          Math.cos(animationFrame * 0.002 + particle.drift) * 22;

        ctx.beginPath();
        ctx.fillStyle = index % 7 === 0 ? "rgba(119, 242, 225, 0.85)" : "rgba(255, 138, 61, 0.82)";
        ctx.shadowBlur = 14;
        ctx.shadowColor = ctx.fillStyle;
        ctx.arc(x, y, particle.size + progressValue * 1.3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      animationFrame += 1;
      if (active) {
        rafId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      timeline.kill();
      cancelAnimationFrame(rafId);
    };
  }, [active]);

  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-[60] overflow-hidden bg-[#070709] transition-opacity duration-700",
        active ? "opacity-100" : "opacity-0",
      ].join(" ")}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-80" />
      <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <div className="rounded-full border border-[var(--forge-soft)] px-4 py-1 text-[10px] uppercase tracking-[0.45em] text-white/50">
          Loader sequence / forge ignition
        </div>
        <div
          ref={wordRef}
          className="font-display text-center text-[14vw] font-semibold uppercase leading-none text-[#f6e7cf] md:text-[8vw]"
        >
          Hephaestus
        </div>
        <div className="h-px w-[min(72vw,26rem)] overflow-hidden bg-white/10">
          <div ref={progressRef} className="h-full w-full origin-left bg-gradient-to-r from-[var(--aqua)] via-white to-[var(--forge)]" />
        </div>
      </div>
    </div>
  );
}
