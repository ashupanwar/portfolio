import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ROOM } from './layout';

// Safe to call repeatedly; Screen.tsx initialises it too.
RectAreaLightUniformsLib.init();

/**
 * A ceiling fixture giving the room its soft ambient fill.
 *
 * This is a *visible* source rather than another invisible light: the room
 * already had light arriving from above with nothing on screen to explain it,
 * which reads as a rendering artifact rather than a lit room. A shallow
 * emissive disc plus a broad rect-area light gives soft, near-shadowless fill
 * -- the diffuse counterpart to the desk lamp's hard directional pool.
 */
export function CeilingLight({
  x = 0,
  z = 0.15,
  intensity = 5.5,
  size = 0.52,
}: {
  x?: number;
  z?: number;
  intensity?: number;
  size?: number;
}) {
  const y = ROOM.height - 0.06;

  return (
    <group position={[x, y, z]}>
      {/* The fixture itself. toneMapped={false} keeps it reading as a source
          rather than as a grey disc, and gives the bloom pass something to grab. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size / 2, 48]} />
        <meshStandardMaterial
          color="#dfe8ff"
          emissive="#cfe0ff"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>

      {/* Shallow housing, so it is a fixture and not a floating disc. */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[size / 2 + 0.01, size / 2 + 0.01, 0.06, 48, 1, true]} />
        <meshStandardMaterial color="#20242c" roughness={0.7} metalness={0.2} side={2} />
      </mesh>

      {/* Broad and soft: area lights fall off gently and cast no shadows, which
          is exactly what ambient fill wants. */}
      <rectAreaLight
        width={size}
        height={size}
        intensity={intensity}
        color="#b9cdf0"
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}
