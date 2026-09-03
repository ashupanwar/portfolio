import * as THREE from "three";

/**
 * How far a drag can turn the view off the establishing shot's own framing,
 * in radians. Deliberately tight -- this is a peek at the room, not a free
 * orbit, so the desk should never leave frame.
 *
 * The room model is only a corner (two walls, no ceiling), so this is also a
 * hard ceiling on how far the view can turn before it clears a wall's finite
 * edge or looks up past its top into the void above -- checked against every
 * corner of the frustum, at both extremes of drag and across the aspect
 * ratios the establishing shot actually solves for (portrait through
 * ultrawide). Widening this needs re-checking the same way, not just eyeballing
 * the centre of the frame.
 *
 * Yaw is deliberately asymmetric: the desk backs onto the room's open side to
 * its right, so turning that way runs off the back wall's edge much sooner
 * than turning left does, which just keeps revealing more of the long side
 * wall (posters, the TV, the window) with room to spare.
 */
export const LOOK_LIMIT = {
  yawLeft: THREE.MathUtils.degToRad(25),
  yawRight: THREE.MathUtils.degToRad(8),
  pitch: THREE.MathUtils.degToRad(5),
} as const;

/** Pointer pixels per radian of look. Lower is more sensitive. */
const SENSITIVITY = 0.0035;

/**
 * The live look offset CameraRig reads every frame, plain-object for the same
 * reason as `cameraValues`: it must survive this module's owning component
 * remounting (StrictMode, HMR) without snapping back or losing an in-flight
 * drag.
 */
export const lookValues = { yaw: 0, pitch: 0 };

/** Where a drag is steering toward; `lookValues` eases after this each frame. */
const target = { yaw: 0, pitch: 0 };

/** Accumulates a pointer-pixel drag delta into the clamped look target. */
export function dragLook(dxPixels: number, dyPixels: number) {
  target.yaw = THREE.MathUtils.clamp(
    target.yaw - dxPixels * SENSITIVITY,
    -LOOK_LIMIT.yawRight,
    LOOK_LIMIT.yawLeft,
  );
  target.pitch = THREE.MathUtils.clamp(
    target.pitch - dyPixels * SENSITIVITY,
    -LOOK_LIMIT.pitch,
    LOOK_LIMIT.pitch,
  );
}

/**
 * Recentres the look. Hard, not eased: callers that touch this are about to
 * start a shot transition, and are expected to have just folded the current
 * offset into the shot's own base target with `foldLookIntoTarget` -- so by
 * the time this runs, zeroing the offset changes nothing on screen. Easing it
 * back out instead would visibly un-pan the view to the old dead-centre
 * framing right before the real move starts.
 */
export function resetLook() {
  target.yaw = 0;
  target.pitch = 0;
  lookValues.yaw = 0;
  lookValues.pitch = 0;
}

/** Eases `lookValues` toward the drag target. Called once per frame by CameraRig. */
export function updateLook() {
  lookValues.yaw += (target.yaw - lookValues.yaw) * 0.18;
  lookValues.pitch += (target.pitch - lookValues.pitch) * 0.18;
}

/**
 * Where the view is actually resting right now, given the current drag
 * offset -- the same rotation CameraRig applies each frame (yaw about `up`,
 * then pitch about the resulting right vector), folded into a plain target
 * point instead of applied live.
 *
 * A shot transition tweens `tx/ty/tz` from scratch, with no idea a drag
 * offset is sitting on top of them. Calling this before `resetLook` bakes
 * that offset into the starting target first, so clearing the offset for the
 * move ahead doesn't itself read as a snap back to the shot's own centre.
 */
export function foldLookIntoTarget(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  up: readonly [number, number, number],
): [number, number, number] {
  const pos = new THREE.Vector3(...position);
  const upVec = new THREE.Vector3(...up).normalize();
  const dir = new THREE.Vector3(...target).sub(pos);
  const distance = dir.length();
  dir.normalize();
  dir.applyAxisAngle(upVec, lookValues.yaw);
  const right = new THREE.Vector3().crossVectors(dir, upVec).normalize();
  dir.applyAxisAngle(right, lookValues.pitch);
  return pos.addScaledVector(dir, distance).toArray() as [number, number, number];
}
