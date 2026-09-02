import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { SCREEN } from './layout';
import { PhoneUI } from '../phone/PhoneUI';
import { usePhone } from '../phone/usePhone';

// One-time global setup; the rect-area light renders black without it.
RectAreaLightUniformsLib.init();

/** Screen light on the desk: near-dark when asleep, cool and bright when awake. */
const OFF_INTENSITY = 0.15;
const ON_INTENSITY = 2.2;

/**
 * The phone's screen: the UI itself plus the light it throws into the room.
 *
 * The light is driven by the phone's state, so waking it visibly lifts the desk
 * around it -- the cold counterpart to the lamp's warm pool.
 */
export function Screen() {
  const state = usePhone((s) => s.state);
  const light = useRef<THREE.RectAreaLight>(null);
  const target = state === 'off' ? OFF_INTENSITY : ON_INTENSITY;

  useFrame(() => {
    if (!light.current) return;
    light.current.intensity += (target - light.current.intensity) * 0.08;
  });

  return (
    <group>
      <PhoneUI />

      <rectAreaLight
        ref={light}
        width={SCREEN.width}
        height={SCREEN.height}
        intensity={OFF_INTENSITY}
        color="#7fb0ff"
        position={[0, 0, 0.001]}
      />
    </group>
  );
}
