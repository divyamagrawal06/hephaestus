export const ProofSection = () => {
  return (
    <section
      id="proof"
      className="relative bg-obsidian px-6 py-24 md:px-16 lg:px-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,106,42,0.18),transparent_50%)]" />
      <div className="relative z-10">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.5em] text-white/50">
            Proof layer
          </div>
          <h3 className="mt-4 font-display text-3xl md:text-5xl text-white">
            Decision clarity at cinematic speed.
          </h3>
          <p className="mt-4 text-lg text-white/70">
            Confidence and uncertainty are surfaced on every surface — from
            particles to metrics — so every action feels intentional.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Fleet Risk Snapshot",
              value: "0.92",
              label: "confidence",
            },
            {
              title: "Incident Drilldown",
              value: "12s",
              label: "time to root-cause",
            },
            {
              title: "Outcome Simulator",
              value: "38%",
              label: "downtime avoided",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <div className="text-xs uppercase tracking-[0.4em] text-white/50">
                {card.title}
              </div>
              <div className="mt-6 text-4xl font-display text-white">
                {card.value}
              </div>
              <div className="mt-2 text-sm text-white/60">{card.label}</div>
              <div className="mt-6 h-1 w-full rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-ember via-auric to-neon" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
