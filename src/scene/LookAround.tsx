import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCamera } from '../store/useCamera';
import { dragLook } from '../store/useLook';

/**
 * Click-and-drag look-around, offered only while sitting at the establishing
 * shot -- mid-flight or on the phone there is nothing around you to look at.
 *
 * Listens on the canvas element directly rather than through R3F's own event
 * system: this is a 2D drag gesture with no interest in what it is dragging
 * over, and going around the raycaster means it can never be blocked by (or
 * itself block) the Hotspot's own hover/click handling underneath it.
 */
export function LookAround() {
  const gl = useThree((state) => state.gl);
  const shot = useCamera((state) => state.shot);
  const moving = useCamera((state) => state.moving);
  const active = shot === 'establishing' && !moving;

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;
    const el = gl.domElement;

    const onDown = (event: PointerEvent) => {
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
      document.body.style.cursor = 'grabbing';
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      dragLook(event.clientX - last.current.x, event.clientY - last.current.y);
      last.current = { x: event.clientX, y: event.clientY };
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = 'auto';
    };

    el.addEventListener('pointerdown', onDown);
    // Move/up on the window, not the canvas: a real drag routinely carries
    // the pointer outside the canvas bounds, and losing the gesture there
    // would leave it stuck mid-drag until the next unrelated pointerdown.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragging.current = false;
      document.body.style.cursor = 'auto';
    };
  }, [active, gl]);

  return null;
}
