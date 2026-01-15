import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const positions = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = (Math.random() - 0.5) * 40;
      positions[i3 + 2] = (Math.random() - 0.5) * 40;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * 0.015;
      ref.current.rotation.y -= delta * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#e11d48"
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  );
}

function SubtleParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = (Math.random() - 0.5) * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.01;
      ref.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#94a3b8"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.3}
      />
    </Points>
  );
}

export const Starfield = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1], fov: 60 }}>
        <FloatingParticles />
        <SubtleParticles />
      </Canvas>
    </div>
  );
};
