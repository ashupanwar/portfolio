import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { SCREEN } from '../scene/layout';
import { useCamera } from '../store/useCamera';
import { DESIGN, ICON_SIZE, LAYER, phoneValues, usePhone } from './usePhone';
import { applyScreenMaterial, roundedRectGeometry, screenClipPlanes } from './shapes';
import { DynamicIsland, HomeScreen, LockScreen, TapHint } from './screens';
import { NotesApp } from './apps/NotesApp';

/** How far up you must drag to unlock, as a fraction of screen height. */
const SWIPE_DISTANCE = 0.3;
const SWIPE_COMMIT = 0.38;

/**
 * The app screen's scale at the instant it leaves the icon. At this size its
 * corner radius (0.17 x 390 x 0.169) lands within a point of the icon's own 13pt
 * radius, so the shape reads as the icon growing rather than a rect appearing.
 */
const APP_START_SCALE = ICON_SIZE / DESIGN.width;

const OFF_COLOR = new THREE.Color('#05070c');
const ON_COLOR = new THREE.Color('#0d1424');

/**
 * The phone's UI, laid out in a virtual 390x844pt grid and scaled down onto the
 * screen plane. Working in design points rather than metres keeps the layout
 * readable and means the whole UI rescales if the screen size changes.
 *
 * Built from meshes and troika text rather than DOM: the screen is emissive and
 * must not be lit by the room, and this way it lives in the phone's own
 * perspective with no projection or occlusion mismatch.
 */
export function PhoneUI() {
  const state = usePhone((s) => s.state);
  const app = usePhone((s) => s.app);
  const appOrigin = usePhone((s) => s.appOrigin);
  const wake = usePhone((s) => s.wake);
  const unlock = usePhone((s) => s.unlock);
  const lock = usePhone((s) => s.lock);
  const shot = useCamera((s) => s.shot);

  // Only live once the camera has arrived; otherwise a stray click on the desk
  // from across the room would wake the phone.
  const interactive = shot === 'phone';

  // Leaving the phone puts it back to sleep, so you always return to the same
  // dark screen and tap cue. Keyed on the camera rather than wired into the
  // Back button, so any future way out resets it too.
  useEffect(() => {
    if (shot !== 'phone') lock();
  }, [shot, lock]);

  const scale = SCREEN.width / DESIGN.width;
  const background = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, SCREEN.radius * DESIGN.width),
    [],
  );

  // Clip planes are world-space in three, so keep a local-space master set and
  // re-project it through the UI group's world matrix each frame.
  const basePlanes = useMemo(() => screenClipPlanes(DESIGN.width / 2, DESIGN.height / 2), []);
  const planes = useMemo(() => basePlanes.map((plane) => plane.clone()), [basePlanes]);

  const rootRef = useRef<THREE.Group>(null);
  const hintRef = useRef<THREE.Group>(null);
  const lockRef = useRef<THREE.Group>(null);
  const homeRef = useRef<THREE.Group>(null);
  const appRef = useRef<THREE.Group>(null);
  const fillRef = useRef<THREE.MeshBasicMaterial>(null);

  const drag = useRef({ active: false, startY: 0, progress: 0 });
  const lift = useRef(0);
  const hintFade = useRef(1);
  const appFade = useRef(0);

  /**
   * Writes the current animation values onto the scene.
   *
   * Called from useFrame, and also synchronously on every commit: the lock
   * screen suspends while its wallpaper loads, and on the commit that resolves
   * it the group would otherwise be visible at full opacity until the next
   * frame ran -- a one-frame flash of the lock screen over the sleeping phone.
   */
  const paint = () => {
    const l = lift.current;
    applyScreenMaterial(hintRef.current, hintFade.current, planes);
    // LockScreen reads this and moves its own layers; it needs to treat the
    // photo differently from the type, so it owns that decision.
    phoneValues.lift = l;
    applyScreenMaterial(lockRef.current, state === 'off' ? 0 : 1 - l, planes);
    applyScreenMaterial(homeRef.current, l, planes);
    if (homeRef.current) homeRef.current.scale.setScalar(0.94 + 0.06 * l);

    // The app grows out of its icon: it starts at the icon's centre and size
    // and travels to full screen, rather than scaling about the middle. Eased,
    // because a linear grow reads mechanical.
    const t = appFade.current;
    const eased = t * t * (3 - 2 * t);
    if (appRef.current) {
      appRef.current.scale.setScalar(APP_START_SCALE + (1 - APP_START_SCALE) * eased);
      appRef.current.position.set(
        appOrigin[0] * (1 - eased),
        appOrigin[1] * (1 - eased),
        LAYER * 4,
      );
    }
    // Opacity leads the geometry so the app is solid while it is still small,
    // instead of a ghost hovering over the icon.
    applyScreenMaterial(appRef.current, Math.min(1, t * 2.2), planes);
    if (fillRef.current) {
      fillRef.current.color.lerpColors(OFF_COLOR, ON_COLOR, 1 - hintFade.current);
    }
  };

  useLayoutEffect(paint);

  useFrame(() => {
    if (rootRef.current) {
      rootRef.current.updateWorldMatrix(true, false);
      for (const [index, plane] of planes.entries()) {
        plane.copy(basePlanes[index]).applyMatrix4(rootRef.current.matrixWorld);
      }
    }

    // `lift` is how far the lock screen has travelled: driven by the finger
    // mid-drag, and pinned to 1 once unlocked so it stays gone.
    const target = state === 'home' ? 1 : drag.current.progress;
    lift.current += (target - lift.current) * 0.18;
    hintFade.current += ((state === 'off' ? 1 : 0) - hintFade.current) * 0.15;
    // Slower than the other transitions on purpose: opening an app is the
    // biggest change of context on the phone and reads better unhurried.
    appFade.current += ((app ? 1 : 0) - appFade.current) * 0.075;

    paint();
  });

  /** Pointer y in design points, from a hit on the screen plane. */
  function localY(event: ThreeEvent<PointerEvent>) {
    return event.object.worldToLocal(event.point.clone()).y;
  }

  return (
    <group ref={rootRef} scale={scale}>
      <mesh geometry={background}>
        <meshBasicMaterial ref={fillRef} color={OFF_COLOR} toneMapped={false} />
      </mesh>

      <group ref={hintRef}>
        <TapHint />
      </group>

      <group ref={lockRef}>
        <LockScreen />
      </group>

      <group ref={homeRef}>
        <HomeScreen />
      </group>

      {/* Above the home screen in z, not merely later in the tree: transparent
          objects sort by distance to camera, so at equal z the home icons drew
          straight over an open app's background. */}
      {/* Position and scale are driven entirely by paint(), from the origin the
          tapped icon recorded. */}
      <group ref={appRef}>{app === 'Notes' && <NotesApp />}</group>

      {/* Above every screen and outside the faded groups: it is part of the
          phone, not part of whatever the phone is showing. */}
      <group position={[0, 0, LAYER * 10]}>
        <DynamicIsland />
      </group>

      {/* Invisible gesture catcher. Kept outside the faded groups so it never
          gets switched off with them, and deliberately *below* the UI in z:
          app icons must be hit first so their clicks register. Icons declare no
          pointerdown handler, so drags still fall through to this plane. */}
      <mesh
        geometry={background}
        position={[0, 0, 0.5]}
        onPointerDown={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          drag.current = { active: true, startY: localY(event), progress: 0 };
        }}
        onPointerMove={(event) => {
          if (!drag.current.active || state !== 'locked') return;
          const delta = localY(event) - drag.current.startY;
          drag.current.progress = THREE.MathUtils.clamp(
            delta / (DESIGN.height * SWIPE_DISTANCE),
            0,
            1,
          );
        }}
        onPointerUp={() => {
          if (!drag.current.active) return;
          drag.current.active = false;
          if (state === 'locked' && drag.current.progress > SWIPE_COMMIT) unlock();
          drag.current.progress = 0;
        }}
        onPointerLeave={() => {
          // Dragging off the screen should cancel, not leave it half-lifted.
          drag.current.active = false;
          drag.current.progress = 0;
        }}
        onClick={(event) => {
          if (!interactive || state !== 'off') return;
          event.stopPropagation();
          wake();
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
