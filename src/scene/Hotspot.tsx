import { useEffect, useRef, useState } from 'react';
import { Billboard, Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOT } from './layout';
import { useCamera } from '../store/useCamera';

/** Leader-line geometry, in metres, measured out from the dot. */
const LEADER = {
  /** Gap so the line starts clear of the dot rather than growing out of it. */
  start: 0.012,
  /** Where the 45deg diagonal ends and the horizontal rest begins. */
  elbow: 0.055,
  /** Length of the horizontal run the label sits on. */
  shelf: 0.085,
  labelGap: 0.008,
  fontSize: 0.022,
} as const;

/**
 * The marker that invites you into the phone: a pulsing dot with an angled
 * leader line and label, in the style of a technical annotation.
 *
 * The label lives in the scene rather than in a DOM tooltip so it sits in the
 * room's own perspective and lighting, and so it is always readable instead of
 * only on hover. Billboarded, so the line and text stay flat to camera at any
 * angle while the dot itself stays anchored to its spot on the desk.
 */
export function Hotspot() {
  const [hovered, setHovered] = useState(false);
  const shot = useCamera((state) => state.shot);
  const moving = useCamera((state) => state.moving);
  const goTo = useCamera((state) => state.goTo);

  const ring = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  // Only offered while we are away from the phone, and never mid-flight.
  const active = shot === 'establishing' && !moving;

  useEffect(() => {
    if (!active || !hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [active, hovered]);

  // Drop the hover state when the dot goes away, otherwise the cursor can be
  // left stuck as a pointer after the camera moves.
  useEffect(() => {
    if (!active) setHovered(false);
  }, [active]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Slow bob, so it reads as hovering rather than stuck to the desk.
    if (group.current) group.current.position.y = HOTSPOT.position[1] + Math.sin(t * 1.4) * 0.006;

    // Halo pulses outward and fades -- the standard "look here" cue.
    if (ring.current) {
      const phase = (t * 0.65) % 1;
      ring.current.scale.setScalar(1 + phase * 2.6);
      const material = ring.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * (hovered ? 0.55 : 0.35);
    }
  });

  if (!active) return null;

  const side = HOTSPOT.side;
  const shelfEnd = LEADER.elbow + LEADER.shelf;
  const line = hovered ? 0.95 : 0.7;

  return (
    <group ref={group} position={[HOTSPOT.position[0], HOTSPOT.position[1], HOTSPOT.position[2]]}>
      <Billboard
        // On the group, so the dot, the line and the label are all one target.
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          goTo('phone');
        }}
      >
        {/* Generous invisible disc so the dot is easy to hit without having to
            make the visible dot clumsily large. */}
        <mesh>
          <circleGeometry args={[0.028, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh>
          <circleGeometry args={[0.007, 24]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>

        <mesh ref={ring}>
          <ringGeometry args={[0.0085, 0.0105, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} toneMapped={false} />
        </mesh>

        {/* Diagonal out of the dot, then a horizontal shelf for the label to
            sit on -- the elbow is what makes it read as an annotation rather
            than a stray line. */}
        <Line
          points={[
            [LEADER.start * side, LEADER.start, 0],
            [LEADER.elbow * side, LEADER.elbow, 0],
            [shelfEnd * side, LEADER.elbow, 0],
          ]}
          color="#ffffff"
          lineWidth={1.5}
          transparent
          opacity={line}
          toneMapped={false}
        />

        <Text
          // Sits on the shelf's own y with a middle anchor, so the line meets
          // the label at its vertical centre instead of running under it.
          position={[(shelfEnd + LEADER.labelGap) * side, LEADER.elbow, 0]}
          fontSize={LEADER.fontSize}
          color="#ffffff"
          anchorX={side < 0 ? 'right' : 'left'}
          anchorY="middle"
          letterSpacing={0.02}
          // The label crosses both the lit pool and the dark desk, so it needs
          // its own contrast rather than relying on whatever is behind it.
          outlineWidth={0.0012}
          outlineColor="#000000"
          outlineOpacity={0.55}
          material-toneMapped={false}
          material-transparent
          material-opacity={hovered ? 1 : 0.88}
        >
          {HOTSPOT.label}
        </Text>
      </Billboard>
    </group>
  );
}
