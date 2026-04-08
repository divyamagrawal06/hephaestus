import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useIdle } from "../hooks/useIdle";
import { useReducedMotion } from "../hooks/useReducedMotion";

function ForgeObjects() {
  const group = useRef<THREE.Group | null>(null);
  const core = useRef<THREE.Mesh | null>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.18;
      group.current.rotation.x = Math.sin(t * 0.28) * 0.08;
    }
    if (core.current) {
      core.current.position.y = Math.sin(t * 1.4) * 0.15;
      core.current.rotation.x = t * 0.25;
      core.current.rotation.z = t * 0.14;
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.8} floatIntensity={0.9}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshPhysicalMaterial
            color="#ffcf9f"
            roughness={0.1}
            metalness={0.55}
            transmission={0.32}
            thickness={1.5}
            emissive="#ff8a3d"
            emissiveIntensity={0.2}
          />
        </mesh>
      </Float>

      {[-1, 1].map((side, index) => (
        <Float key={side} speed={1 + index * 0.25} rotationIntensity={1.2} floatIntensity={1.5}>
          <mesh position={[side * 2.2, side * 0.5, -0.6]} rotation={[0.4, 0.6, side * 0.8]}>
            <boxGeometry args={[0.8, 3.6, 0.15]} />
            <meshStandardMaterial color={side > 0 ? "#78f0de" : "#f4ede3"} metalness={0.72} roughness={0.18} />
          </mesh>
        </Float>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
        <circleGeometry args={[6, 48]} />
        <meshBasicMaterial color="#ff8a3d" transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

function SystemsCanvas() {
  return (
    <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#0d0d12"]} />
      <fog attach="fog" args={["#0d0d12", 6, 12]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 3]} intensity={1.8} color="#ffb26b" />
      <directionalLight position={[-4, -1, 2]} intensity={1.1} color="#78f0de" />
      <PerspectiveCamera makeDefault position={[0, 0.4, 6.4]} fov={38} />
      <Suspense fallback={null}>
        <ForgeObjects />
      </Suspense>
    </Canvas>
  );
}

export function SystemsSection() {
  const isIdle = useIdle(1200);
  const reducedMotion = useReducedMotion();

  const fallback = useMemo(
    () => (
      <div className="glass-panel relative flex h-[34rem] items-center justify-center overflow-hidden rounded-[2rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,138,61,0.22),transparent_35%),radial-gradient(circle_at_60%_45%,rgba(119,242,225,0.12),transparent_30%)]" />
        <div className="relative text-center">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/45">Systems preview</div>
          <div className="font-display text-5xl text-white/90">Forge Core</div>
        </div>
      </div>
    ),
    [],
  );

  return (
    <section id="systems" className="relative py-28 md:py-40">
      <div className="section-shell grid gap-10 md:grid-cols-[0.86fr_1.14fr] md:items-center">
        <div>
          <div className="section-label mb-4">Systems stage</div>
          <h2 className="headline-section text-balance">
            The page needs a machine room, not just another content block.
          </h2>
          <p className="body-copy mt-6 max-w-xl">
            This 3D stage is where we can keep layering live particles, shader transitions, and the future RPG bridge without
            compromising the editorial spine of the page.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Three.js + React Three Fiber for the ambient object system",
              "Idle-loaded so the hero stays fast",
              "Reduced-motion path swaps to a static art direction",
            ].map((line) => (
              <div key={line} className="rounded-full border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.26em] text-white/58">
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {!isIdle || reducedMotion ? (
            fallback
          ) : (
            <div className="glass-panel h-[34rem] overflow-hidden rounded-[2rem]">
              <SystemsCanvas />
            </div>
          )}
          <div className="pointer-events-none absolute -left-4 bottom-6 w-52 rounded-[1.5rem] border border-white/10 bg-black/40 p-4 backdrop-blur-lg md:-left-10">
            <div className="mb-2 text-[10px] uppercase tracking-[0.34em] text-white/45">Ready for next pass</div>
            <p className="text-sm leading-6 text-white/62">
              This is the hook point for the particle dissolve layer, deeper shader transitions, and the eventual world bridge.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
