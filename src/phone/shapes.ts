import * as THREE from 'three';

/**
 * Rounded rectangle centred on the origin, for screen fills and app icons.
 *
 * Corners use quadratic curves rather than arcs -- close enough at these sizes
 * and cheaper to tessellate, which matters when every app icon is one of these.
 */
export function roundedRectShape(width: number, height: number, radius: number) {
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

export function roundedRectGeometry(width: number, height: number, radius: number) {
  const geometry = new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 8);

  // ShapeGeometry derives UVs straight from vertex positions, so they come out
  // in the shape's own units (here roughly -195..195) rather than 0..1, and any
  // texture would tile wildly. Remap them across the rect.
  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    uv[i * 2] = (position.getX(i) + width / 2) / width;
    uv[i * 2 + 1] = (position.getY(i) + height / 2) / height;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  return geometry;
}

/**
 * Clip planes bounding a rectangle, in the local space of whatever they are
 * later transformed by. Each plane keeps the half-space containing the origin.
 */
export function screenClipPlanes(halfWidth: number, halfHeight: number) {
  return [
    new THREE.Plane(new THREE.Vector3(0, -1, 0), halfHeight),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), halfHeight),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), halfWidth),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfWidth),
  ];
}

/**
 * Fades an entire subtree and clips it to the screen.
 *
 * The phone's screens are built from many small meshes and text runs, so there
 * is no single material to animate or clip. Also toggles `visible`, so a fully
 * faded screen stops being raycast as well as stops being drawn.
 *
 * Clipping is what stops a sliding screen spilling past the glass: the lock
 * screen travels upward on unlock, and without it its status bar and clock are
 * drawn floating above the phone, out in the room.
 */
export function applyScreenMaterial(
  object: THREE.Object3D | null,
  opacity: number,
  clippingPlanes: THREE.Plane[],
) {
  if (!object) return;

  // `visible` is a hint, not the mechanism. Opacity is written even while
  // hidden: the group can be re-shown by something else -- a Suspense re-commit
  // when the wallpaper finishes loading remounts the subtree with visible=true
  // and opacity 1 -- and if we had skipped the write, a supposedly hidden screen
  // reappears fully opaque.
  object.visible = opacity > 0.01;

  object.traverse((child) => {
    const material = (child as THREE.Mesh).material as THREE.Material | THREE.Material[];
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      // Remember what the material was authored at, before we ever write to it.
      // Without this, fading a group flattens every element to the same value:
      // deliberately invisible hit targets turn solid (a white slab appeared
      // behind the Notes back button), and designed translucency -- the home
      // indicator, the lock screen's action buttons -- snaps to fully opaque.
      if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;

      m.transparent = true;
      m.opacity = m.userData.baseOpacity * opacity;
      // Assigning planes swaps the shader's clipping defines, so only do it
      // once per material rather than every frame.
      if (m.clippingPlanes !== clippingPlanes) {
        m.clippingPlanes = clippingPlanes;
        m.needsUpdate = true;
      }
    }
  });
}
