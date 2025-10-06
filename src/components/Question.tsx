"use client";

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center, Environment, OrbitControls, useGLTF } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function Question({ modelPath }: { modelPath: string }) {
  return (
    <div className="w-full max-w-xl h-[28rem] mx-auto">
      <Canvas
        camera={{ position: [3, 20, 25], fov: 50 }}
        dpr={[1, 2]}
        style={{ background: '' }}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[2, 10, 2]} intensity={2} />
        <spotLight position={[-5, -15, -5]} angle={0.4} penumbra={1} intensity={0.8} />
        <Suspense fallback={null}>
          <Center disableY >
            <Model url={modelPath} />
          </Center>
          <OrbitControls autoRotate enableZoom />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}