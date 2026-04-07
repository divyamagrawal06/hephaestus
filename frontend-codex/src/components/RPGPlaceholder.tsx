export const RPGPlaceholder = () => {
  return (
    <section className="relative bg-graphite px-6 py-24 md:px-16 lg:px-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,106,42,0.2),transparent_50%)]" />
      <div className="relative z-10">
        <div className="text-xs uppercase tracking-[0.5em] text-white/50">
          RPG World (Deferred)
        </div>
        <h3 className="mt-4 font-display text-3xl md:text-5xl text-white">
          World layer awaiting sprites and zones.
        </h3>
        <p className="mt-4 max-w-2xl text-lg text-white/70">
          This section is intentionally stubbed for later RPGJS integration,
          spatial UX patterns, and AI-generated sprite sheets from the
          gather-clone reference.
        </p>
      </div>
    </section>
  );
};
