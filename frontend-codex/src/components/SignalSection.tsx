import { useRef } from "react";
import { useSplitText } from "../hooks/useSplitText";

export const SignalSection = () => {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useSplitText(headingRef, { stagger: 25, threshold: 0.35 });

  return (
    <section className="relative overflow-hidden bg-obsidian px-6 py-24 md:px-16 lg:px-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(62,240,214,0.18),transparent_55%)]" />
      <div className="relative z-10">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.5em] text-white/50">
            From noise to signal
          </div>
          <h2
            ref={headingRef}
            className="mt-4 font-display text-4xl md:text-6xl text-white"
          >
            Particles learn the shape of certainty.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Living particle veils morph across sections. Text dissolves into
            light, then reassembles as proof and intent.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            "Shader-driven text dissolves",
            "Realtime confidence signals",
            "WebGPU → WebGL → CSS fallbacks",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70"
            >
              <span className="block text-xs uppercase tracking-[0.4em] text-white/40">
                Forge Layer
              </span>
              <span className="mt-3 block text-base text-white">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
