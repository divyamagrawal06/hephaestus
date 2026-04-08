import { useEffect, useState } from "react";
import type { RefObject } from "react";

export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  options?: IntersectionObserverInit,
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    observer.observe(node);

    return () => observer.disconnect();
  }, [ref, options]);

  return inView;
}
