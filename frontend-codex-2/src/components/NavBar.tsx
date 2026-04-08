const links = [
  { label: "Vision", href: "#hero" },
  { label: "Work", href: "#work" },
  { label: "Systems", href: "#systems" },
  { label: "Contact", href: "#contact" },
];

export function NavBar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 py-4 md:px-8 md:py-6">
      <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl md:px-6">
        <a href="#hero" className="font-display text-sm font-semibold uppercase tracking-[0.45em] mix-blend-screen">
          Hephaestus
        </a>

        <nav className="hidden items-center gap-5 text-[11px] uppercase tracking-[0.35em] text-white/70 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="mailto:forge@hephaestus.world"
          className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.35em] text-white/80 transition hover:border-[var(--forge)] hover:text-white"
        >
          Start a build
        </a>
      </div>
    </header>
  );
}
