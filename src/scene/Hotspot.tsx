import { useEffect, useRef, useState } from 'react';
import { Billboard, Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOT, TV_HOTSPOT } from './layout';
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
  fontSize: 0.03,
} as const;

interface HotspotConfig {
  position: readonly [number, number, number];
  side: 1 | -1;
  label: string;
}

/**
 * A pulsing dot with an angled leader line and label, in the style of a
 * technical annotation. Shared by every marker in the scene -- the phone's
 * and the TV's own -- so they read as one consistent system rather than two
 * different UI languages.
 *
 * The label lives in the scene rather than in a DOM tooltip so it sits in the
 * room's own perspective and lighting, and so it is always readable instead of
 * only on hover. Billboarded, so the line and text stay flat to camera at any
 * angle while the dot itself stays anchored to its spot.
 *
 * `onSelect` is optional: without it the marker is a label only, with no
 * pointer cursor and nothing to click.
 */
function Hotspot({ config, onSelect }: { config: HotspotConfig; onSelect?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const shot = useCamera((state) => state.shot);
  const moving = useCamera((state) => state.moving);

  const ring = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  // Only offered while we are away from the phone, and never mid-flight.
  const active = shot === 'establishing' && !moving;
  const interactive = active && Boolean(onSelect);

  useEffect(() => {
    if (!interactive || !hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [interactive, hovered]);

  // Drop the hover state when the dot goes away, otherwise the cursor can be
  // left stuck as a pointer after the camera moves.
  useEffect(() => {
    if (!active) setHovered(false);
  }, [active]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Slow bob, so it reads as hovering rather than stuck in place.
    if (group.current) group.current.position.y = config.position[1] + Math.sin(t * 1.4) * 0.006;

    // Halo pulses outward and fades -- the standard "look here" cue.
    if (ring.current) {
      const phase = (t * 0.65) % 1;
      ring.current.scale.setScalar(1 + phase * 2.6);
      const material = ring.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * (hovered ? 0.55 : 0.35);
    }
  });

  if (!active) return null;

  const side = config.side;
  const shelfEnd = LEADER.elbow + LEADER.shelf;
  const line = hovered ? 0.95 : 0.7;

  return (
    <group ref={group} position={[config.position[0], config.position[1], config.position[2]]}>
      <Billboard
        // On the group, so the dot, the line and the label are all one target.
        onPointerOver={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          if (!onSelect) return;
          event.stopPropagation();
          onSelect();
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
          {config.label}
        </Text>
      </Billboard>
    </group>
  );
}

/** The marker that invites you into the phone. */
export function PhoneHotspot() {
  const goTo = useCamera((state) => state.goTo);
  return <Hotspot config={HOTSPOT} onSelect={() => goTo('phone')} />;
}

/** The TV's own label -- clicking it squares the camera up to its screen. */
export function TvHotspot() {
  const goTo = useCamera((state) => state.goTo);
  return <Hotspot config={TV_HOTSPOT} onSelect={() => goTo('tv')} />;
}
