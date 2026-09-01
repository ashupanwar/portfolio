import { useMemo } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { SCREEN } from './layout';

// One-time global setup; the rect-area light renders black without it.
RectAreaLightUniformsLib.init();

function roundedRect(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/**
 * Placeholder for the phone OS: a lit panel standing in for the uikit surface
 * that lands in the next phase. It exists now to prove the two things the real
 * screen depends on -- that our plane sits cleanly over the baked one, and that
 * screen light spills onto the desk as cold fill against the lamp's warmth.
 */
export function Screen({ on = true }: { on?: boolean }) {
  const geometry = useMemo(
    () =>
      new THREE.ShapeGeometry(
        roundedRect(SCREEN.width, SCREEN.height, SCREEN.width * SCREEN.radius),
        16,
      ),
    [],
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={on ? '#16223a' : '#050506'}
          emissive={on ? '#4a7fd4' : '#000000'}
          emissiveIntensity={on ? 1.35 : 0}
          roughness={0.18}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* The money shot: cold screen glow washing the desk against warm lamplight. */}
      {on && (
        <rectAreaLight
          width={SCREEN.width}
          height={SCREEN.height}
          intensity={1.6}
          color="#7fb0ff"
          position={[0, 0, 0.001]}
        />
      )}
    </group>
  );
}
