import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { LAMP, LAMP_TARGET, PHONE, POSTER, POSTER2, POSTER3, ROOM_MODEL, SCREEN } from './layout';
import { asset } from '../lib/asset';

const DRACO = asset('/draco/');

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

/**
 * Recolours a set of named materials to a flat colour, dropping their
 * baseColorTexture rather than tinting it -- multiplying a baked texture by
 * a colour only scales its existing RGB ratios, so a print or pattern baked
 * into that texture keeps its own hue (and, for the walls, keeps the star
 * decals painted onto it) no matter what colour you multiply by. The normal
 * and metallic-roughness maps are left alone, so surfaces still shade
 * correctly under the room's lighting -- only the colour/pattern layer goes.
 */
function useFlatColor(object: THREE.Object3D, materialNames: Set<string>, color: THREE.Color) {
  useLayoutEffect(() => {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material && materialNames.has(material.name)) {
        material.map = null;
        material.color.copy(color);
        material.needsUpdate = true;
      }
    });
  }, [object, materialNames, color]);
}

const CURTAIN_COLOR = new THREE.Color('#8c8c8c');
const CURTAIN_MATERIALS = new Set(['Curatin01', 'Curatin02']);

/** The wall texture also carries the room's painted-on yellow stars, so
 *  flattening the walls to a colour removes those along with the blue. */
const WALL_COLOR = new THREE.Color('#ffffff');
const WALL_MATERIALS = new Set(['Wall.001', 'Wall.002']);

export function RoomModel() {
  const { scene } = useGLTF(asset('/models/room.glb'), DRACO);
  const model = useMemo(() => scene.clone(true), [scene]);
  useShadows(model);
  useReportBounds(model, 'room');
  useFlatColor(model, CURTAIN_MATERIALS, CURTAIN_COLOR);
  useFlatColor(model, WALL_MATERIALS, WALL_COLOR);

  return (
    <primitive
      object={model}
      position={ROOM_MODEL.position}
      rotation={ROOM_MODEL.rotation}
      scale={ROOM_MODEL.scale}
    />
  );
}

interface PosterLayout {
  position: readonly [number, number, number];
  rotationY: number;
  width: number;
  height: number;
}

/** A pinned photo on the wall, floated a hair proud of it -- same trick as
 *  the phone and TV screens, since a coplanar plane z-fights the wall
 *  behind it. */
function PosterImage({ src, layout }: { src: string; layout: PosterLayout }) {
  const texture = useTexture(asset(src));
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh position={layout.position} rotation={[0, layout.rotationY, 0]} castShadow>
      <planeGeometry args={[layout.width, layout.height]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}

export function Poster() {
  return (
    <>
      <PosterImage src="/posters/nit-hamirpur.webp" layout={POSTER} />
      <PosterImage src="/posters/ronaldo.webp" layout={POSTER2} />
      <PosterImage src="/posters/worldmap.webp" layout={POSTER3} />
    </>
  );
}

export function Lamp() {
  const { scene } = useGLTF(asset('/models/lamp.glb'), DRACO);
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
  const { scene } = useGLTF(asset('/models/iphone.glb'), DRACO);
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

useGLTF.preload(asset('/models/room.glb'), DRACO);
useGLTF.preload(asset('/models/lamp.glb'), DRACO);
useGLTF.preload(asset('/models/iphone.glb'), DRACO);
