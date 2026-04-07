type MarqueeRailProps = {
  items: string[];
};

export const MarqueeRail = ({ items }: MarqueeRailProps) => {
  const content = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/10 py-4">
      <div className="forge-rail w-[200%] animate-marquee">
        {content.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
};
