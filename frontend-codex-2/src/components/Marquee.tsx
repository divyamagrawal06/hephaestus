type MarqueeProps = {
  text: string;
  reverse?: boolean;
  muted?: boolean;
};

export function Marquee({ text, reverse = false, muted = false }: MarqueeProps) {
  const content = `${text}  •  ${text}  •  ${text}  •  `;

  return (
    <section className="overflow-hidden border-y border-white/8 py-4">
      <div
        className={[
          "flex whitespace-nowrap text-[12px] uppercase tracking-[0.42em]",
          muted ? "text-white/28" : "text-white/44",
          reverse ? "animate-[marquee-reverse_26s_linear_infinite]" : "animate-[marquee_26s_linear_infinite]",
        ].join(" ")}
      >
        <span className="pr-8">{content}</span>
        <span className="pr-8">{content}</span>
      </div>
    </section>
  );
}
