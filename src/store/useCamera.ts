import gsap from 'gsap';
import { create } from 'zustand';
import { SHOTS, establishingPosition } from '../scene/layout';
import { foldLookIntoTarget, resetLook } from './useLook';

export type ShotName = keyof typeof SHOTS;

/** Latest viewport aspect, pushed in by CameraRig. */
let aspect = 16 / 10;

/** A shot's framing for the current viewport. Only `establishing` is aspect-driven. */
function resolveShot(name: ShotName) {
  const shot = SHOTS[name];
  return name === 'establishing' ? { ...shot, position: establishingPosition(aspect) } : shot;
}

/**
 * Look-dev affordance: `?shot=phone` starts the camera at that framing instead
 * of the establishing shot, so a destination can be inspected without sitting
 * through the move to it.
 */
function initialShot(): ShotName {
  if (typeof window === 'undefined') return 'establishing';
  const requested = new URLSearchParams(window.location.search).get('shot');
  return requested && requested in SHOTS ? (requested as ShotName) : 'establishing';
}

const start = resolveShot(initialShot());

/**
 * The live camera values, deliberately module-level rather than component state.
 *
 * CameraRig can remount at any time (StrictMode, HMR, a parent re-render), and
 * when the animated values lived in a useRef inside it, every remount reset them
 * to the establishing shot and killed the in-flight tween -- the camera would
 * start moving and then snap back. Keeping them out of the React tree makes the
 * move immune to that: the component becomes a pure applier of this object.
 */
export const cameraValues: {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  ux: number;
  uy: number;
  uz: number;
} = {
  px: start.position[0],
  py: start.position[1],
  pz: start.position[2],
  tx: start.target[0],
  ty: start.target[1],
  tz: start.target[2],
  ux: start.up[0],
  uy: start.up[1],
  uz: start.up[2],
};

let tween: gsap.core.Tween | gsap.core.Timeline | null = null;

/**
 * Re-solves the establishing framing when the viewport changes shape. Applied
 * immediately when we are sitting at that shot, so a window resize reframes the
 * desk rather than leaving it cropped or adrift.
 */
export function setViewportAspect(next: number) {
  if (!Number.isFinite(next) || next <= 0 || Math.abs(next - aspect) < 1e-4) return;
  aspect = next;

  const { shot, moving } = useCamera.getState();
  if (shot !== 'establishing' || moving) return;

  const [px, py, pz] = establishingPosition(aspect);
  cameraValues.px = px;
  cameraValues.py = py;
  cameraValues.pz = pz;
}

interface CameraState {
  shot: ShotName;
  /** True while a move is in flight, so hotspots stop accepting clicks. */
  moving: boolean;
  goTo: (shot: ShotName) => void;
}

export const useCamera = create<CameraState>((set, get) => ({
  shot: initialShot(),
  moving: false,

  goTo: (shot) => {
    if (get().shot === shot) return;
    const next = resolveShot(shot);

    // Interrupting a move is legitimate -- take over from wherever we are.
    tween?.kill();

    // Fold any in-progress look-around drag into the base target before
    // clearing it, so leaving a dragged view starts the move from wherever
    // you were actually looking -- not a snap back to the old shot's own
    // dead-centre framing the instant before the real move begins.
    [cameraValues.tx, cameraValues.ty, cameraValues.tz] = foldLookIntoTarget(
      [cameraValues.px, cameraValues.py, cameraValues.pz],
      [cameraValues.tx, cameraValues.ty, cameraValues.tz],
      [cameraValues.ux, cameraValues.uy, cameraValues.uz],
    );
    resetLook();

    set({ shot, moving: true });

    tween = gsap.to(cameraValues, {
      px: next.position[0],
      py: next.position[1],
      pz: next.position[2],
      tx: next.target[0],
      ty: next.target[1],
      tz: next.target[2],
      ux: next.up[0],
      uy: next.up[1],
      uz: next.up[2],
      duration: 1.6,
      ease: 'power3.inOut',
      onComplete: () => set({ moving: false }),
    });
  },
}));
