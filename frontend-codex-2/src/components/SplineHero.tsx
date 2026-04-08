import { Suspense, lazy, useMemo } from "react";
import { useIdle } from "../hooks/useIdle";

const Spline = lazy(() => import("@splinetool/react-spline"));
const exportedScene = import.meta.env.VITE_SPLINE_SCENE;

export function SplineHero() {
  const isIdle = useIdle(900);
  const fallback = useMemo(
    () => (
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_40%_20%,rgba(255,138,61,0.25),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
        <img
          src="/reference/home-back.jpg"
          alt="Forge atmosphere"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/60" />
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-full border border-white/10 bg-black/30 px-4 py-3 text-[11px] uppercase tracking-[0.35em] text-white/60 backdrop-blur-md">
          <span>Hero stage</span>
          <span>Idle-loaded fallback</span>
        </div>
        <div className="absolute left-[12%] top-[16%] h-20 w-20 rounded-[1.75rem] border border-white/12 bg-white/6 backdrop-blur-xl" />
        <div className="absolute right-[14%] top-[28%] h-32 w-32 rounded-full border border-[var(--forge-soft)] bg-[radial-gradient(circle,rgba(255,138,61,0.22),transparent_68%)] blur-sm" />
        <div className="absolute bottom-[18%] left-[18%] h-28 w-28 rotate-12 rounded-[2rem] border border-white/10 bg-black/25 backdrop-blur-md" />
      </div>
    ),
    [],
  );

  if (!isIdle) {
    return fallback;
  }

  if (!exportedScene) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <div className="h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <Spline scene={exportedScene} />
      </div>
    </Suspense>
  );
}
