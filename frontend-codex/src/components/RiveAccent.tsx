import { useEffect, useState } from "react";
import { useRive } from "@rive-app/react-canvas";

type RiveAccentProps = {
  src: string;
  className?: string;
};

export const RiveAccent = ({ src, className }: RiveAccentProps) => {
  const [failed, setFailed] = useState(false);
  const { RiveComponent } = useRive({
    src,
    autoplay: true,
  });

  useEffect(() => {
    fetch(src, { method: "HEAD" })
      .then((response) => {
        if (!response.ok) setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [src]);

  if (failed) {
    return (
      <svg
        className={className}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="60" stroke="#ff6a2a" strokeWidth="2" />
        <path
          d="M 50 120 C 80 60, 120 60, 150 120"
          stroke="#3ef0d6"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return <RiveComponent className={className} />;
};
