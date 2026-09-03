import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraValues, setViewportAspect } from '../store/useCamera';
import { lookValues, updateLook } from '../store/useLook';

/**
 * Applies the camera values that `useCamera.goTo` animates, plus the
 * click-and-drag look offset from `useLook` on top.
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

  // Scratch vectors, reused every frame rather than allocated fresh -- this
  // runs in the render loop.
  const dir = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!enabled) return;
    updateLook();

    const v = cameraValues;
    camera.position.set(v.px, v.py, v.pz);
    // Set before lookAt -- lookAt derives the camera's roll from `up`.
    camera.up.set(v.ux, v.uy, v.uz).normalize();

    // The look offset turns the view around the camera's own position rather
    // than around the target -- it is a drag to look around the room from
    // where the shot already stands, not an orbit of the desk.
    dir.current.set(v.tx - v.px, v.ty - v.py, v.tz - v.pz);
    const distance = dir.current.length();
    dir.current.normalize();

    dir.current.applyAxisAngle(camera.up, lookValues.yaw);
    right.current.crossVectors(dir.current, camera.up).normalize();
    dir.current.applyAxisAngle(right.current, lookValues.pitch);

    lookTarget.current.copy(camera.position).addScaledVector(dir.current, distance);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
