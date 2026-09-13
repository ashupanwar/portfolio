import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESIGN } from './usePhone';

/**
 * Clips a scrolling subtree to a viewport band of the screen, rather than
 * letting it run to the screen's edge the way the rest of a screen does.
 *
 * A list needs one because the screen's own clip region is four straight
 * planes (see `applyScreenMaterial`) with no knowledge of the rounded
 * corners, and a full-width card is far wider than the screen's outline
 * has narrowed to by its top or bottom edge -- so a card carried that far
 * shows a square sliver out past the phone's own curve, over the bezel.
 * Covering it is not an option (the area outside the curve is the phone
 * body, not screen), so the list is cut off at `top`/`bottom` instead,
 * heights where the outline is still comfortably wider than a card.
 *
 * The planes are authored in the UI's own design space and re-projected
 * through `screen`'s world matrix each frame -- three clips in world space,
 * and the whole app is scaled and moved while it opens. Taking the matrix
 * from the screen rather than from `list` is the point: the list is the
 * thing that scrolls, so a window derived from it would slide along with
 * the content and never cut anything.
 */
export function useViewportClipping(
  screen: React.RefObject<THREE.Group | null>,
  list: React.RefObject<THREE.Group | null>,
  { top, bottom }: { top: number; bottom: number },
) {
  const basePlanes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), top),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottom),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), DESIGN.width / 2),
      new THREE.Plane(new THREE.Vector3(1, 0, 0), DESIGN.width / 2),
    ],
    [top, bottom],
  );
  const planes = useMemo(() => basePlanes.map((plane) => plane.clone()), [basePlanes]);

  useFrame(() => {
    const frame = screen.current;
    const group = list.current;
    if (!frame || !group) return;

    frame.updateWorldMatrix(true, false);
    for (const [index, plane] of planes.entries()) {
      plane.copy(basePlanes[index]).applyMatrix4(frame.matrixWorld);
    }

    // Re-checked every frame rather than once on mount: content keeps
    // arriving after the list first renders (textures resolve through
    // Suspense, cards expand). `ownClipping` is what keeps PhoneUI's own
    // pass from putting the full-screen region back (see
    // `applyScreenMaterial`).
    group.traverse((child) => {
      const material = (child as THREE.Mesh).material as THREE.Material | THREE.Material[];
      if (!material) return;
      for (const m of Array.isArray(material) ? material : [material]) {
        if (m.clippingPlanes === planes) continue;
        m.userData.ownClipping = true;
        m.clippingPlanes = planes;
        m.needsUpdate = true;
      }
    });
  });
}
