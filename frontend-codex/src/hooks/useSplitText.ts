import type { RefObject } from "react";
import { useEffect } from "react";

type SplitOptions = {
  stagger?: number;
  threshold?: number;
};

export const useSplitText = (
  ref: RefObject<HTMLElement | null>,
  { stagger: staggerDelay = 20, threshold = 0.4 }: SplitOptions = {}
) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const text = element.textContent || "";
    element.setAttribute("aria-label", text);
    element.textContent = "";

    const fragment = document.createDocumentFragment();
    [...text].forEach((char) => {
      const span = document.createElement("span");
      span.className = "split-char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = char === " " ? "\u00A0" : char;
      fragment.appendChild(span);
    });
    element.appendChild(fragment);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      element
        .querySelectorAll<HTMLElement>(".split-char")
        .forEach((span) => {
          span.style.opacity = "1";
          span.style.transform = "translateY(0)";
        });
      return;
    }

    let observer: IntersectionObserver | null = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer?.disconnect();

        import("animejs")
          .then(({ animate, stagger }) => {
            animate(element.querySelectorAll(".split-char"), {
              opacity: [0, 1],
              translateY: [24, 0],
              delay: stagger(staggerDelay),
              duration: 800,
              easing: "cubicBezier(0.165, 0.84, 0.44, 1)",
            });
          })
          .catch(() => undefined);
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer?.disconnect();
  }, [ref, staggerDelay, threshold]);
};
