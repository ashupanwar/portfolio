import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Clouds } from '@react-three/drei';
import * as THREE from 'three';
import { WINDOWS } from './layout';

/**
 * How wide the loop is, in metres, before a cloud wraps back to the start.
 * Has to clear not just the window's own opening but the full sweep the
 * look-around drag can turn the camera through -- sized too tight, a wrap
 * happens inside that sweep and reads as a cloud popping into being right in
 * front of the glass instead of entering from off past the frame.
 */
const LOOP_WIDTH = 60;
/** Metres per second the clouds drift. */
const SPEED = 0.9;
const CLOUD_COUNT = 11;
const UP = new THREE.Vector3(0, 1, 0);
/**
 * The wind's angle off world +X, measured in the horizontal (X-Z) plane --
 * a top-down view, not the belt's own screen-facing one. Positive is
 * anticlockwise in that top-down view: +X (0deg) sweeping toward -Z (90deg)
 * the way `applyAxisAngle` turns a vector for a positive angle about +Y.
 */
const WIND_ANGLE = Math.PI / 4;
/**
 * The wind direction every belt's clouds drift along, in world space -- the
 * same vector regardless of which window they're behind. At WIND_ANGLE = 0
 * this would match window1's own rightward-through-the-glass direction
 * exactly; at 45deg it instead cuts across that, partly toward and partly
 * along the glass, which is what actually reads as a diagonal drift rather
 * than a flat pan once it's turned into each belt's own local axes below.
 * Window2's belt sits on a wall turned 90deg from window1's, so getting the
 * same world-space drift out of it means moving along a different pair of
 * ITS OWN local axes -- see `driftAxis`.
 */
const WIND_WORLD = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, WIND_ANGLE);
/** Nearest and farthest a cloud can spawn, in local -Z metres behind the glass. */
const NEAR_Z = -6;
const FAR_Z = -15;
/** How far above or below centre a cloud can spawn, in local +Y metres. */
const HEIGHT_SPREAD = 1.1;

/**
 * A shader-style hash: `sin(i)`'s own period is close enough to 2*pi that a
 * plain `Math.sin(i * k)` over small integer `i` stays lockstepped, sweeping
 * through only a fraction of a full cycle instead of spreading across it --
 * which is exactly what put every cloud on nearly the same line. Multiplying
 * by a large, unrelated constant before taking the fractional part breaks
 * that lockstep and spreads `i`'s across the full [0, 1) range instead.
 */
function hash(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A patch of sky glimpsed through one of the room's windows: a flat blue
 * backdrop with a handful of clouds drifting along the wind, each wrapping
 * back to the loop's far edge once it clears the other -- an infinite scroll
 * built from a few puffs rather than an actually-endless field.
 *
 * Positioned and oriented per window by the caller (`WINDOWS` in layout.ts).
 * Within its own local space every belt uses the same convention as a
 * camera: local -Z is "outside" (away from the room). Movement, though,
 * follows one shared world-space wind (`WIND_WORLD`) rather than each
 * belt's own local +X, so every cloud drifts the same real-world direction
 * no matter which window it's behind -- see `driftAxis`.
 * Both the sky and the clouds are unlit (`MeshBasicMaterial`), so they read
 * as a bright, sunny day regardless of how dim the room's own interior
 * lighting is at that wall -- see the comment by the clouds' own colour for
 * why they aren't pure white, though.
 */
function CloudBelt({ position, rotationY }: { position: readonly [number, number, number]; rotationY: number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const cloudsRef = useRef<THREE.Group>(null);

  // The room's corkboard (and everything pinned to it) is alpha-blended, not
  // opaque -- and two blended objects with depthWrite off don't reliably
  // depth-test against each other; which one wins is decided by draw order,
  // not true distance. The clouds live in a single instanced mesh spanning
  // several metres of depth, so three.js's own per-object distance sort for
  // it is unreliable and can place it after the board even for instances
  // that are actually farther away, painting straight over it. Forcing a low
  // renderOrder makes the clouds draw before every other blended object in
  // the room, so anything blended in front of the glass -- the board
  // included -- always composites correctly on top of them.
  useLayoutEffect(() => {
    cloudsRef.current?.traverse((child) => {
      if (child instanceof THREE.Mesh) child.renderOrder = -10;
    });
  }, []);

  // How much local X and local Z change per metre travelled along the shared
  // world wind: rotating WIND_WORLD by this belt's own yaw, backwards, into
  // its local space. For window1 (no yaw) that's WIND_WORLD's own x/z,
  // unchanged. For window2 (yawed 90deg) it's the same vector turned an
  // extra 90deg into ITS local frame. Harmless either way: window2 sits just
  // past the look-around's own reach and is never actually seen in play.
  const driftAxis = useMemo(() => {
    const local = WIND_WORLD.clone().applyAxisAngle(UP, -rotationY);
    return { x: local.x, z: local.z };
  }, [rotationY]);

  const puffs = useMemo(
    () =>
      Array.from({ length: CLOUD_COUNT }, (_, i) => {
        // 0 at the nearest depth, 1 at the farthest -- drives both the actual
        // z placement and how big/opaque the puff reads, so a near cloud isn't
        // just closer but visibly bigger and bolder, the way real depth reads.
        const depthT = (i * 0.6180339887) % 1;
        return {
          seed: i * 37.1 + 1,
          // Position along the wind path, not a literal local axis -- driftAxis
          // turns it into actual local x/z each frame.
          drift: (i / CLOUD_COUNT) * LOOP_WIDTH - LOOP_WIDTH / 2,
          y: (hash(i) * 2 - 1) * HEIGHT_SPREAD,
          depthZ: NEAR_Z + depthT * (FAR_Z - NEAR_Z),
          // A near cloud reads as bigger and more solid; a far one smaller and
          // hazier -- the usual depth cues, on top of perspective alone.
          scale: 1.15 - depthT * 0.65,
          opacity: 0.9 - depthT * 0.35,
        };
      }),
    [],
  );

  const driftRef = useRef(puffs.map((puff) => puff.drift));

  useFrame((_state, delta) => {
    for (let i = 0; i < refs.current.length; i++) {
      const group = refs.current[i];
      if (!group) continue;

      let drift = driftRef.current[i] + SPEED * delta;
      // Wrap at the loop's edge rather than resetting to a fixed start point,
      // so a cloud mid-wrap never visibly jumps -- it just keeps going, LOOP_WIDTH
      // metres back.
      if (drift > LOOP_WIDTH / 2) drift -= LOOP_WIDTH;
      driftRef.current[i] = drift;

      group.position.x = drift * driftAxis.x;
      group.position.z = puffs[i].depthZ + drift * driftAxis.z;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -18]}>
        <planeGeometry args={[LOOP_WIDTH * 2.2, 11]} />
        <meshBasicMaterial color="#7ec8f5" />
      </mesh>

      {/*
        The scene's Bloom is a screen-space effect: it has no notion of
        depth, so a bright patch of window bleeds its glow onto whatever
        sits next to it in the 2D frame -- the corkboard -- even though the
        board is actually in front of the glass and rightfully occludes it.
        A dozen overlapping translucent white puffs converge toward solid
        white as they stack (each layer blends toward its own colour
        regardless of its own alpha), so pure white clouds cross the bloom
        threshold no matter how their opacity is tuned. Toning the colour
        itself down to a pale blue-grey caps how bright a fully-stacked
        cloud can ever get, which is what actually keeps it under threshold.
      */}
      <Clouds ref={cloudsRef} material={THREE.MeshBasicMaterial} limit={CLOUD_COUNT * 14}>
        {puffs.map((puff, i) => (
          <Cloud
            key={puff.seed}
            ref={(group) => {
              refs.current[i] = group;
            }}
            position={[puff.drift * driftAxis.x, puff.y, puff.depthZ + puff.drift * driftAxis.z]}
            seed={puff.seed}
            segments={14}
            bounds={[0.75 * puff.scale, 0.28 * puff.scale, 0.3 * puff.scale]}
            volume={0.55 * puff.scale}
            color="#c9d9e6"
            opacity={puff.opacity}
            fade={8}
          />
        ))}
      </Clouds>
    </group>
  );
}

/** The sky glimpsed through both of the room's windows. */
export function SkyWindows() {
  return (
    <>
      {WINDOWS.map((window, i) => (
        <CloudBelt key={i} position={window.position} rotationY={window.rotationY} />
      ))}
    </>
  );
}
