import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { STLLoader } from "three-stdlib";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function ZeusModel() {
  const geometry = useLoader(STLLoader, "/zeus_bust.stl");
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Center and scale geometry once
  const processedGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.computeVertexNormals();
    geo.center();
    // Compute bounding box to normalize scale
    geo.computeBoundingBox();
    const bbox = geo.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Scale to fit ~2.6 units tall
    const scaleFactor = 2.6 / maxDim;
    geo.scale(scaleFactor, scaleFactor, scaleFactor);
    geo.center();
    return geo;
  }, [geometry]);

  // Animate: auto-rotation + mouse-reactive tilt on the GROUP
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Smooth mouse tracking
    const pointer = state.pointer;
    mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, pointer.x * 0.2, 0.05);
    mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, pointer.y * 0.1, 0.05);

    // Auto-rotation around Y + mouse tilt
    groupRef.current.rotation.y = Math.PI + t * 0.15 + mouseRef.current.x;
    groupRef.current.rotation.x = mouseRef.current.y * 0.3;

    // Subtle floating bob
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {/* Static X rotation converts STL Z-up to Three.js Y-up */}
      <mesh
        geometry={processedGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#b8a07a"
          metalness={0.3}
          roughness={0.45}
          clearcoat={0.1}
          clearcoatRoughness={0.3}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

function SceneLighting() {
  return (
    <>
      {/* Key light - warm from upper-right */}
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.8}
        color="#ffe6c5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Fill light - cool from left */}
      <directionalLight
        position={[-3, 2, -2]}
        intensity={0.6}
        color="#3ef0d6"
      />
      {/* Rim light - ember glow from behind */}
      <pointLight
        position={[0, 3, -4]}
        intensity={2}
        color="#ff6a2a"
        distance={12}
      />
      {/* Ambient base */}
      <ambientLight intensity={0.15} color="#1a1a2e" />
      {/* Bottom neon glow */}
      <pointLight
        position={[0, -3, 0]}
        intensity={1.5}
        color="#3ef0d6"
        distance={8}
      />
    </>
  );
}

function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
  });
  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#3ef0d6" wireframe emissive="#3ef0d6" emissiveIntensity={0.5} />
    </mesh>
  );
}

export const ZeusBustScene = () => {
  return (
    <div
      className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none"
      style={{ perspective: "1000px" }}
    >
      <div className="w-[320px] h-[420px] md:w-[420px] md:h-[560px] pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0.3, 5.2], fov: 32, near: 0.1, far: 100 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          style={{ background: "transparent" }}
          shadows
          frameloop="always"
        >
          <SceneLighting />
          <Suspense fallback={<LoadingFallback />}>
            <ZeusModel />
            <Environment preset="city" environmentIntensity={0.4} />
          </Suspense>
          <ContactShadows
            position={[0, -1.8, 0]}
            opacity={0.4}
            scale={6}
            blur={2.5}
            far={4}
            color="#3ef0d6"
          />
        </Canvas>
      </div>
    </div>
  );
};
