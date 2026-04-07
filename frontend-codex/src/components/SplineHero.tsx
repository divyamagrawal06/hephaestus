import { useEffect, useRef, useState } from "react";
import Spline from "@splinetool/react-spline";
import { useReducedMotion } from "../hooks/useReducedMotion";

const SCENE_URL =
  "https://app.spline.design/file/6bb58e3d-6f46-415a-85a9-9788abf1f309";

export const SplineHero = () => {
  const splineRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!loaded || reducedMotion) return;
    let cleanup: (() => void) | undefined;

    import("../lib/gsap")
      .then(({ gsap }) => {
        if (!splineRef.current) return;

        const camera = {
          x: 0,
          y: 0,
          z: 6,
          lx: 0,
          ly: 0,
          lz: 0,
        };

        const updateCamera = () => {
          const spline = splineRef.current;
          if (!spline) return;
          if (typeof spline.setCameraLookAt === "function") {
            spline.setCameraLookAt(
              camera.x,
              camera.y,
              camera.z,
              camera.lx,
              camera.ly,
              camera.lz
            );
          } else if (typeof spline.setCameraPosition === "function") {
            spline.setCameraPosition(camera.x, camera.y, camera.z);
          }
        };

        const ctx = gsap.context(() => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: "#hero",
              start: "top top",
              end: "bottom+=120% top",
              scrub: true,
            },
          });

          tl.to(camera, {
            z: 12,
            y: 1.4,
            lx: 0.5,
            lz: 0.2,
            ease: "none",
            onUpdate: updateCamera,
          });
        });

        cleanup = () => ctx.revert();
      })
      .catch(() => undefined);

    return () => cleanup?.();
  }, [loaded, reducedMotion]);

  return (
    <Spline
      scene={SCENE_URL}
      onLoad={(spline) => {
        splineRef.current = spline;
        setLoaded(true);
      }}
      className="h-full w-full"
    />
  );
};
