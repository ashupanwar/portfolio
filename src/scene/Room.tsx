import { CORNER, ROOM } from './layout';

/**
 * Two walls meeting in a corner, with the desk tucked into it, plus the floor.
 *
 * Deliberately plain: nothing here should read as a surface in its own right --
 * it exists to catch the lamp's falloff, give the ceiling fixtures something to
 * bounce off, and give the darkness somewhere to sit.
 */
export function Room() {
  // The room extends away from the corner in +x and +z.
  const midX = CORNER.x + ROOM.width / 2;
  const midZ = CORNER.z + ROOM.depth / 2;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[midX, 0, midZ]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#2b2622" roughness={0.94} metalness={0} />
      </mesh>

      {/* Back wall, facing +z into the room. */}
      <mesh position={[midX, ROOM.height / 2, CORNER.z]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color="#4d453d" roughness={0.98} metalness={0} />
      </mesh>

      {/* Side wall, facing +x into the room. */}
      <mesh
        position={[CORNER.x, ROOM.height / 2, midZ]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color="#463e37" roughness={0.98} metalness={0} />
      </mesh>

      {/* Skirting along both walls -- a single dark line where wall meets floor
          is what stops the corner reading as two floating planes. */}
      <mesh position={[midX, 0.045, CORNER.z + 0.012]}>
        <boxGeometry args={[ROOM.width, 0.09, 0.024]} />
        <meshStandardMaterial color="#241f1c" roughness={0.85} />
      </mesh>
      <mesh position={[CORNER.x + 0.012, 0.045, midZ]}>
        <boxGeometry args={[0.024, 0.09, ROOM.depth]} />
        <meshStandardMaterial color="#241f1c" roughness={0.85} />
      </mesh>
    </group>
  );
}
