import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { DESK, LAMP, LAMP_TARGET, PHONE, SCREEN } from './layout';

const DRACO = '/draco/';

/** Turns on shadows for every mesh in a loaded model. */
function useShadows(object: THREE.Object3D, cast = true, receive = true) {
  useLayoutEffect(() => {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = cast;
        child.receiveShadow = receive;
      }
    });
  }, [object, cast, receive]);
}

/**
 * Logs a model's world-space bounds once. Placement in layout.ts is derived
 * from these numbers, so keep it around -- swapping a model makes them stale.
 */
function useReportBounds(object: THREE.Object3D | null, label: string, children = false) {
  useEffect(() => {
    if (!object || !import.meta.env.DEV) return;

    // Without this the matrices are still identity and every number is wrong.
    object.updateWorldMatrix(true, true);

    const fmt = (v: THREE.Vector3) => [v.x, v.y, v.z].map((n) => n.toFixed(3)).join(', ');
    const box = new THREE.Box3().setFromObject(object);
    console.log(
      `[bounds] ${label}  min(${fmt(box.min)})  max(${fmt(box.max)})  ` +
        `size(${fmt(box.getSize(new THREE.Vector3()))})`,
    );

    if (!children) return;
    // Per-mesh tops, to find which one is the actual work surface.
    object.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const b = new THREE.Box3().setFromObject(child);
      console.log(
        `[bounds]   ${label}/${child.name}  topY=${b.max.y.toFixed(3)}  ` +
          `center(${fmt(b.getCenter(new THREE.Vector3()))})  ` +
          `size(${fmt(b.getSize(new THREE.Vector3()))})`,
      );
    });
  }, [object, label, children]);
}

export function Desk() {
  const { scene } = useGLTF('/models/desk.glb', DRACO);
  const model = useMemo(() => scene.clone(true), [scene]);
  useShadows(model);
  useReportBounds(model, 'desk');

  return <primitive object={model} position={DESK.position} scale={DESK.scale} />;
}

export function Lamp() {
  const { scene } = useGLTF('/models/lamp.glb', DRACO);
  const model = useMemo(() => scene.clone(true), [scene]);
  const spotTarget = useRef<THREE.Object3D>(null);
  useShadows(model);
  useReportBounds(model, 'lamp');

  // The model is rigged (Base -> Stem1 -> Stem2 -> LightCone) with a `Spot`
  // empty parented inside the cone. Anchoring the light there means posing the
  // arm later moves the light with it, for free.
  const spotAnchor = useMemo(() => model.getObjectByName('Spot') ?? null, [model]);

  // Warm bounce off the inside of the shade, so the lamp reads as the source.
  useLayoutEffect(() => {
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material?.name === 'ConeINSIDE') {
        material.emissive = new THREE.Color('#ffbb66');
        material.emissiveIntensity = 2.2;
        material.toneMapped = false;
      }
    });
  }, [model]);

  return (
    <>
      {/* Deliberately outside the lamp group: the group carries a 0.062 scale,
          and a target inside it would have its offset scaled down with it. */}
      <object3D ref={spotTarget} position={LAMP_TARGET as unknown as [number, number, number]} />

      <group position={LAMP.position} rotation={LAMP.rotation} scale={LAMP.scale}>
        <primitive object={model} />
        {spotAnchor && <SpotFromAnchor anchor={spotAnchor} target={spotTarget} />}
      </group>
    </>
  );
}

function SpotFromAnchor({
  anchor,
  target,
}: {
  anchor: THREE.Object3D;
  target: React.RefObject<THREE.Object3D | null>;
}) {
  const light = useRef<THREE.SpotLight>(null);

  useLayoutEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, [target]);

  // Portalled *into* the anchor rather than positioned from it: `anchor.position`
  // is local to LampCone several levels down the rig, so applying it at the
  // lamp's root buries the light in the base. Portalling makes it a real child,
  // which is also what makes it inherit the arm's pose when we animate it.
  return createPortal(
    <>
      <spotLight
        ref={light}
        color="#ffc287"
        intensity={2.4}
        distance={0}
        angle={0.7}
        penumbra={0.85}
        decay={2}
        castShadow
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-mapSize={[2048, 2048]}
        // The default near plane is 0.5, but the lamp head sits only ~0.4m above
        // the desk -- the whole lit area would fall in front of it and resolve
        // as fully shadowed, killing the light pool entirely.
        shadow-camera-near={0.02}
        shadow-camera-far={4}
      />

      {/* Stand-in for the bulb. Without it the lamp lights the desk but stays
          a black silhouette itself, since its own spot points away from it. */}
      <pointLight color="#ffab5e" intensity={0.05} decay={2} />
    </>,
    anchor,
  );
}

export function Phone({ children }: { children?: React.ReactNode }) {
  const { scene } = useGLTF('/models/iphone.glb', DRACO);
  const model = useMemo(() => scene.clone(true), [scene]);
  useShadows(model);
  useReportBounds(model, 'iphone');

  return (
    <group position={PHONE.position} rotation={PHONE.rotation} scale={PHONE.scale}>
      {/* The model ships screen-down: its glass is the thin -Z face (z=-0.0042)
          and the camera bump is +Z (z=+0.0088), the opposite of what the group
          rotation assumes. Turning it 180deg about its own long axis lays it
          face-up. A yaw, not a mirror, so the geometry stays right-handed --
          flipping the screen plane instead would mirror the UI. */}
      <primitive object={model} rotation={[0, Math.PI, 0]} />

      {/* Our screen, floated proud of the baked one it replaces. */}
      <group position={[0, 0, SCREEN.z]}>{children}</group>
    </group>
  );
}

useGLTF.preload('/models/desk.glb', DRACO);
useGLTF.preload('/models/lamp.glb', DRACO);
useGLTF.preload('/models/iphone.glb', DRACO);
