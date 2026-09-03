import { Suspense } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Lamp, Phone, RoomModel } from './Models';
import { CeilingLight } from './CeilingLight';
import { Screen } from './Screen';
import { PhoneHotspot, TvHotspot } from './Hotspot';
import { CameraRig } from './CameraRig';
import { LookAround } from './LookAround';
import { ROOM, SHOTS } from './layout';
import { useTierSettings } from '../store/useQuality';

/** Orbit is a look-dev tool only -- enable with ?debug. Camera choreography replaces it. */
const params = new URLSearchParams(window.location.search);
const DEBUG = params.has('debug');
/** `?noscreen` hides our UI plane to inspect the model's own baked screen. */
const NO_SCREEN = params.has('noscreen');

export function Experience() {
  const { post } = useTierSettings();

  return (
    <>
      {/* The lamp still does the work; this only lifts the shadow side off pure
          black so the room reads as a room. Kept cool and well under the lamp's
          level, so the warm/cold contrast survives. */}
      <ambientLight intensity={0.32} color="#4a5570" />

      {/* Sky/ground split gives the fill some direction -- a flat ambient alone
          reads as fog once it is strong enough to see. */}
      <hemisphereLight args={['#3d4a68', '#241d18', 0.28]} />

      {/* Overhead room light: a wide, soft pool from the ceiling. Deliberately
          not a shadow caster -- a second shadow map costs as much as the lamp's
          and would fight it with a competing set of shadow directions. */}
      <spotLight
        position={[0, ROOM.height - 0.15, 0.35]}
        color="#a8bcdd"
        intensity={5}
        angle={1.0}
        penumbra={1}
        decay={2}
      />

      {/* Wall wash. The ceiling fixtures fire straight down, which barely
          grazes a vertical surface -- without this the corner renders black and
          the room has no visible geometry behind the desk. Aimed at the origin
          (a directional light's default target).

          Deliberately off-axis: a symmetric position lights both walls to the
          same value, and the corner disappears because there is no tonal break
          between them. Favouring +x makes the side wall read brighter than the
          back wall, which is what draws the vertical edge. */}
      <directionalLight position={[4.4, 2.4, 0.9]} intensity={1.25} color="#93a7c9" />

      <Suspense fallback={null}>
        <RoomModel />
        {/* Two fixtures rather than one: a single ceiling source leaves the
            far end of the desk falling off into black, and real rooms of this
            size are lit by more than one lamp. */}
        <CeilingLight x={-0.75} z={0.1} intensity={7} />
        <CeilingLight x={0.6} z={1.3} intensity={6} />
        <Lamp />
        <Phone>{!NO_SCREEN && <Screen />}</Phone>
        <PhoneHotspot />
        <TvHotspot />
      </Suspense>

      {/* Orbit and the rig both write camera.position every frame, so only one
          of them can be live. */}
      <CameraRig enabled={!DEBUG} />
      {!DEBUG && <LookAround />}

      {post && (
        <EffectComposer>
          <Bloom intensity={0.72} luminanceThreshold={0.9} luminanceSmoothing={0.32} mipmapBlur />
          <Vignette offset={0.22} darkness={0.82} />
          <Noise opacity={0.035} />
        </EffectComposer>
      )}

      {DEBUG && <OrbitControls makeDefault target={SHOTS.establishing.target} />}
    </>
  );
}
