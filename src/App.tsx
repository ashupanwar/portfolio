import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from './scene/Experience';
import { BackButton } from './ui/BackButton';
import { FOV, SHOTS } from './scene/layout';
import { useTierSettings } from './store/useQuality';

export default function App() {
  const { dpr, shadows } = useTierSettings();

  return (
    <div className="relative h-full w-full bg-[#08070a]">
      <Canvas
        frameloop="always"
        dpr={dpr as unknown as [number, number]}
        shadows={shadows ? { type: THREE.PCFShadowMap } : false}
        camera={{
          position: [...SHOTS.establishing.position],
          fov: FOV,
          near: 0.01,
          far: 100,
        }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ camera }) => camera.lookAt(...SHOTS.establishing.target)}
      >
        <color attach="background" args={['#08070a']} />
        <Experience />
      </Canvas>

      <BackButton />
    </div>
  );
}
