import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { Environment } from "@react-three/drei";
import { useInView } from "../hooks/useInView";
import { useIdle } from "../hooks/useIdle";
import { useReducedMotion } from "../hooks/useReducedMotion";
import * as THREE from "three";

const CARD_TITLES = [
  "Adaptive Systems",
  "Risk Intelligence",
  "Realtime Fidelity",
  "Decision Forge",
  "Autonomous Labs",
  "Predictive Control",
];

const CarouselScene = () => {
  const groupRef = useRef<THREE.Group | null>(null);
  const reducedMotion = useReducedMotion();
  const cards = useMemo(() => CARD_TITLES, []);

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.08;
    groupRef.current.children.forEach((child, index) => {
      child.position.y = Math.sin(t + index) * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {cards.map((title, index) => {
        const angle = (index / cards.length) * Math.PI * 2;
        const radius = 3.2;
        return (
          <mesh
            key={title}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            rotation={[0, -angle + Math.PI, 0]}
          >
            <planeGeometry args={[2.2, 1.2, 1, 1]} />
            <meshPhysicalMaterial
              color="#1a1f2b"
              metalness={0.4}
              roughness={0.2}
              transmission={0.6}
              thickness={0.8}
              emissive="#ff6a2a"
              emissiveIntensity={0.12}
            />
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[2.05, 1.0]} />
              <meshBasicMaterial color="#0b0b11" opacity={0.6} transparent />
            </mesh>
          </mesh>
        );
      })}
    </group>
  );
};

export const CarouselSection = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, "0px 0px -20% 0px");
  const [ready, setReady] = useState(false);

  useIdle(() => setReady(true), 1600);

  return (
    <section
      ref={sectionRef}
      className="relative border-y border-white/10 bg-black px-6 py-24 md:px-16 lg:px-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(62,240,214,0.18),transparent_55%)]" />
      <div className="relative z-10">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.5em] text-white/50">
            Feature Drift
          </div>
          <h3 className="mt-4 font-display text-3xl md:text-5xl text-white">
            A living carousel of forge‑ready systems.
          </h3>
          <p className="mt-4 text-lg text-white/70">
            Each panel is a portal into a system module. Hover and scroll to
            reveal layered detail.
          </p>
        </div>

        <div className="mt-12 h-[420px] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b0b11] via-[#10111d] to-[#0b0b11]">
          {ready && inView ? (
            <Canvas camera={{ position: [0, 0.8, 6], fov: 45 }} dpr={[1, 1.5]}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} />
              <Suspense fallback={null}>
                <Environment preset="city" />
                <CarouselScene />
              </Suspense>
            </Canvas>
          ) : (
            <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.4em] text-white/40">
              Loading carousel
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
