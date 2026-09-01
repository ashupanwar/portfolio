import * as THREE from "three";

/**
 * Every placement value for the scene, in metres, in one place.
 *
 * The source models disagree about units and orientation, so all the fudge
 * factors live here rather than being scattered through the components:
 *   - desk  : authored in metres, +Y up. Used as-is.
 *   - lamp  : authored in CENTIMETRES (28.8 units tall) -> scale 0.01.
 *   - iphone: authored in metres but ~16% oversized vs a real 14 Pro
 *             (83.6 x 170.9 x 13.1mm vs 71.5 x 147.5 x 7.85mm), and its screen
 *             faces +Z, so it needs -90deg about X to lie face-up on the desk.
 */

export const DESK = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
} as const;

/**
 * Height of the desk's work surface, measured from the model rather than
 * guessed: mesh `Object_4` tops out here, and the magazine props rest on it.
 * Everything that sits on the desk is positioned off this.
 */
export const DESK_SURFACE = 0.759;

/**
 * The lamp's own root node already converts its centimetre authoring units, so
 * it arrives ~6.5cm tall -- an extra 0.01 on top shrinks it to a thimble.
 * 0.062 brings it to a realistic ~40cm desk lamp.
 */
export const LAMP = {
  position: [-0.4, DESK_SURFACE, -0.14],
  rotation: [0, 1.15, 0],
  scale: 0.062,
} as const;

/** Half the phone's thickness, so it rests on the surface instead of through it. */
const PHONE_HALF_THICKNESS = 0.0056;

/**
 * Sits just left of the magazine stack, which spans x 0.42..0.72. Rotated 45deg
 * anticlockwise: the z term is the in-plane spin (the -90deg X term is what lays
 * the phone face-up), and the body's rotated footprint reaches ~0.077 either
 * side, so x = 0.32 clears the magazines without touching them.
 */
export const PHONE = {
  position: [0.32, DESK_SURFACE + PHONE_HALF_THICKNESS, 0.06],
  rotation: [-Math.PI / 2, 0, Math.PI / 4],
  scale: 0.86,
} as const;

/** Where the lamp's spot is aimed -- world space, on the desk between lamp and phone. */
export const LAMP_TARGET = [-0.06, DESK_SURFACE, 0.02] as const;

/**
 * The phone's screen is baked into its baseColor texture -- there is no separate
 * mesh to target. We cover it with our own plane, floated a hair proud of the
 * front face so it never z-fights.
 *
 * The glass is the model's thin z = -0.00423 face (z = +0.00882 is the camera
 * bump), and Phone turns the model 180deg to lay it face-up -- so the glass ends
 * up at z = +0.00423 and our plane sits a hair proud of that.
 * Screen active area is ~90% of body width, matching a real 14 Pro.
 */
export const SCREEN = {
  /**
   * Sized to overlap the baked screen slightly rather than match it: the body is
   * 0.0836 x 0.1709, and the glass measures ~93.6% x ~96% of that. Undersizing
   * leaves a rim of the model's own wallpaper showing around our plane, so these
   * run a little proud of the glass while staying inside the bezel.
   */
  width: 0.077,
  height: 0.166,
  z: 0.0045,
  /** Corner radius as a fraction of width. iPhone display corners are much
   *  rounder than a typical UI radius -- too small and the model's lit corners
   *  peek out past ours. */
  radius: 0.17,
} as const;

export const ROOM = {
  width: 6,
  depth: 5,
  height: 2.8,
} as const;

/**
 * Where the two walls meet, in world space. The desk spans x -0.72..0.73 and
 * z -0.29..0.47, so this leaves a small realistic gap behind and beside it
 * rather than clipping the furniture into the plaster. The room extends away
 * from here in +x and +z, so the corner sits behind the desk's left shoulder.
 */
export const CORNER = { x: -0.86, z: -0.4 } as const;

/**
 * The phone's own "screen up" direction in world space: its local +Y pushed
 * through its rotation. Used as the camera's up vector for the top-down shot,
 * which lands the screen square in frame exactly, with no eyeballed roll angle.
 * It is perpendicular to a straight-down view, so lookAt cannot degenerate.
 */
export const PHONE_UP = new THREE.Vector3(0, 1, 0)
  .applyEuler(
    new THREE.Euler(PHONE.rotation[0], PHONE.rotation[1], PHONE.rotation[2]),
  )
  .toArray();

/** Vertical field of view, in degrees. Must match the <Canvas> camera. */
export const FOV = 34;

/**
 * The establishing shot is defined by an angle and a framing width rather than a
 * fixed position, because "the desk spans the width of the screen" is not a
 * fixed camera position -- fov is vertical, so the horizontal field grows with
 * the viewport's aspect. A hardcoded position that frames the desk correctly on
 * a 16:10 monitor overshoots badly in a portrait window and undershoots on
 * ultrawide. `establishingPosition` solves for the distance instead.
 */
export const ESTABLISHING = {
  target: [-0.05, 0.88, 0.0] as const,
  /** Unit vector from the target back toward the camera; sets the angle. */
  direction: [0.6997, 0.278, 0.658] as const,
  /** World-space width to fit across the frame: the 1.45m desk plus a little air. */
  frameWidth: 1.62,
  /** Guard rails, so an extreme viewport cannot put us inside the desk or out in the room. */
  minDistance: 0.95,
  maxDistance: 3.4,
};

/** Solves for the camera position that fits `frameWidth` across the given aspect. */
export function establishingPosition(aspect: number): [number, number, number] {
  const halfV = THREE.MathUtils.degToRad(FOV) / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);

  const dir = new THREE.Vector3(...ESTABLISHING.direction).normalize();

  // The desk's width runs along world X, but we view it obliquely -- only the
  // component perpendicular to the view axis actually occupies screen width.
  const perpendicular = new THREE.Vector3(1, 0, 0);
  perpendicular.sub(dir.clone().multiplyScalar(perpendicular.dot(dir)));

  const halfExtent = (ESTABLISHING.frameWidth * perpendicular.length()) / 2;
  const distance = THREE.MathUtils.clamp(
    halfExtent / Math.tan(halfH),
    ESTABLISHING.minDistance,
    ESTABLISHING.maxDistance,
  );

  const target = new THREE.Vector3(...ESTABLISHING.target);
  return target.addScaledVector(dir, distance).toArray() as [
    number,
    number,
    number,
  ];
}

/** Camera framings the choreography interpolates between. */
export const SHOTS = {
  /** Placeholder -- the real position is computed per-aspect, see below. */
  establishing: {
    position: [1.26, 1.44, 1.21],
    target: ESTABLISHING.target,
    up: [0, 1, 0],
  },
  /**
   * Straight down over the phone. Distance is derived, not guessed: the body is
   * 0.171 * 0.86 = 0.147m long, so fitting it in a 34deg vertical fov with a
   * margin needs about (0.147 / 2 * 1.3) / tan(17deg) ~= 0.31m.
   */
  phone: {
    position: [PHONE.position[0], PHONE.position[1] + 0.32, PHONE.position[2]],
    target: [PHONE.position[0], PHONE.position[1], PHONE.position[2]],
    up: PHONE_UP,
  },
} as const;

/**
 * The clickable marker that invites you to the phone. Floats just off its corner.
 *
 * `side` is which way the leader line and label extend: -1 for left, 1 for right.
 * The phone now sits near the desk's right end, so a right-hand label would run
 * off the edge of the frame.
 */
export const HOTSPOT = {
  position: [
    PHONE.position[0] - 0.1,
    PHONE.position[1] + 0.075,
    PHONE.position[2] - 0.02,
  ],
  side: -1,
  label: "Ashu's iPhone",
} as const;
