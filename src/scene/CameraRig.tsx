import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { cameraValues, setViewportAspect } from '../store/useCamera';

/**
 * Applies the camera values that `useCamera.goTo` animates.
 *
 * Intentionally stateless: it owns nothing and can remount freely without
 * disturbing a move in progress. GSAP tweens plain scalars and this applies
 * them, rather than tweening the camera's transform directly -- lookAt()
 * rewrites rotation every frame, so animating rotation would fight itself.
 */
export function CameraRig({ enabled = true }: { enabled?: boolean }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  // The establishing shot's distance is solved from the aspect, so it has to be
  // re-solved whenever the viewport changes shape.
  useEffect(() => {
    setViewportAspect(size.width / size.height);
  }, [size.width, size.height]);

  useFrame(() => {
    if (!enabled) return;
    const v = cameraValues;
    camera.position.set(v.px, v.py, v.pz);
    // Set before lookAt -- lookAt derives the camera's roll from `up`.
    camera.up.set(v.ux, v.uy, v.uz).normalize();
    camera.lookAt(v.tx, v.ty, v.tz);
  });

  return null;
}
