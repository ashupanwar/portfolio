import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TV_SCREEN } from './layout';
import { useCamera } from '../store/useCamera';
import { asset } from '../lib/asset';

/**
 * The room's CRT TV: a video plane floated over the model's own baked
 * screen, the same trick Screen.tsx uses for the phone (see SCREEN.z).
 *
 * Only shown once the 'tv' shot has actually arrived -- not mid-flight,
 * so the video doesn't appear (or keep playing) while the camera is still
 * travelling toward or away from it -- and restarting it from the top each
 * time you arrive keeps the moment consistent.
 */
export function TvScreen() {
  const shot = useCamera((s) => s.shot);
  const moving = useCamera((s) => s.moving);
  const showing = shot === 'tv' && !moving;

  const video = useMemo(() => {
    const element = document.createElement('video');
    element.src = asset('/videos/tv-broadcast.mp4');
    element.loop = true;
    element.muted = true;
    element.playsInline = true;
    return element;
  }, []);

  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);

  useEffect(() => {
    if (showing) {
      video.currentTime = 0;
      // A play() left pending races a pause() from a quick zoom back out --
      // benign, but it throws an unhandled rejection if left uncaught.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [showing, video]);

  // Just a pause on unmount -- not a full teardown (removing `src` and
  // reloading). StrictMode double-invokes this cleanup once even on a
  // normal mount, and a full teardown there left the video permanently
  // without a source for the remainder of the session.
  useEffect(() => () => video.pause(), [video]);

  return (
    <mesh
      visible={showing}
      position={TV_SCREEN.position}
      rotation={[0, TV_SCREEN.rotationY, 0]}
    >
      <planeGeometry args={[TV_SCREEN.width, TV_SCREEN.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
