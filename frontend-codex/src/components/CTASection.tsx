import { RiveAccent } from "./RiveAccent";

export const CTASection = () => {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-black px-6 py-24 md:px-16 lg:px-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(242,201,108,0.18),transparent_60%)]" />
      <div className="relative z-10 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.5em] text-white/50">
            Build your world
          </div>
          <h3 className="mt-4 font-display text-4xl md:text-6xl text-white">
            The forge is ready. Shape what comes next.
          </h3>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            Step into a living interface that treats performance, fidelity, and
            narrative as equal forces.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="button-glow rounded-full bg-ember px-8 py-3 text-sm font-semibold text-white shadow-forge">
              Start the build
            </button>
            <button className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold text-white/80 hover:border-white">
              Download the brief
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <RiveAccent
            src="/rive/forge-accent.riv"
            className="h-56 w-56 opacity-90"
          />
        </div>
      </div>
    </section>
  );
};
