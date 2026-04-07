import type { RefObject } from "react";
import { useEffect, useState } from "react";

export const useInView = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  rootMargin = "0px 0px -10% 0px"
) => {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
};
