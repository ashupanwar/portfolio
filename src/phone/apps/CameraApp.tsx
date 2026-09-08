import { useMemo, useRef, useState } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESIGN, LAYER, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

const INK = '#ffffff';
const MUTED = '#98989d';
const BACKDROP = '#000000';
/** iOS Camera's own tint, for the back control and the active shooting mode
 *  -- there is nothing else in this app to carry it. */
const YELLOW = '#f7d02c';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const RIGHT = DESIGN.width / 2 - PAD;
const NAV_Y = 352;
const MODE_Y = -DESIGN.height / 2 + 168;
const SHUTTER_Y = -DESIGN.height / 2 + 92;

type Mode = 'VIDEO' | 'PHOTO' | 'PORTRAIT';
const MODES: Mode[] = ['VIDEO', 'PHOTO', 'PORTRAIT'];

/** Chevron pointing left, for the nav bar's back control. */
function BackChevron({ color }: { color: string }) {
  const bar = useMemo(() => roundedRectGeometry(11, 2.6, 1.3), []);
  return (
    <group>
      <mesh geometry={bar} position={[0, 3, 0]} rotation={[0, 0, Math.PI / 4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={bar} position={[0, -3, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Chevron, label and an invisible target sized for a finger. */
function NavBack({ onPress }: { onPress: () => void }) {
  const target = useMemo(() => roundedRectGeometry(110, 44, 8), []);

  return (
    <group position={[0, NAV_Y, LAYER]}>
      <mesh
        geometry={target}
        position={[LEFT + 45, 0, LAYER]}
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group position={[LEFT + 5, 0, LAYER * 2]}>
        <BackChevron color={YELLOW} />
      </group>
      <Text
        font={FONT}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={YELLOW}
        anchorX="left"
        anchorY="middle"
      >
        Back
      </Text>
    </group>
  );
}

/** Lightning bolt, for the flash toggle. */
function BoltGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(1.2, 9);
    shape.lineTo(-5.2, -0.8);
    shape.lineTo(-1, -0.8);
    shape.lineTo(-1.6, -9);
    shape.lineTo(5.2, 0.6);
    shape.lineTo(1, 0.6);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/**
 * Small triangle sitting on the ring at `positionAngle`, pointing in the
 * tangent direction `pointAngle` -- the arrowhead on FlipCameraGlyph's arc.
 */
function ArrowHead({
  color,
  positionAngle,
  pointAngle,
}: {
  color: string;
  positionAngle: number;
  pointAngle: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(3.6, 0);
    shape.lineTo(-2.6, 3.2);
    shape.lineTo(-2.6, -3.2);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  const radius = 8.2;
  return (
    <mesh
      geometry={geometry}
      position={[Math.cos(positionAngle) * radius, Math.sin(positionAngle) * radius, 0]}
      rotation={[0, 0, pointAngle]}
    >
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** A three-quarter ring with a single arrowhead at its leading edge -- the
 *  standard "circular refresh" shape, standing in for flip-camera. */
function FlipCameraGlyph({ color }: { color: string }) {
  const start = -Math.PI * 0.15;
  const length = Math.PI * 1.5;
  const end = start + length;
  return (
    <group>
      <mesh>
        <ringGeometry args={[7, 8.4, 32, 1, start, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Tangent to the arc's own direction of travel at its open end, so
          the head reads as continuing the curve rather than sitting on it
          at an angle. */}
      <ArrowHead color={color} positionAngle={end} pointAngle={end + Math.PI / 2} />
    </group>
  );
}

/** The shooting-mode strip above the shutter: swipeable in the real app,
 *  tappable here, cosmetic either way -- there is no sensor listening. */
function ModeStrip({ mode, onSelect }: { mode: Mode; onSelect: (mode: Mode) => void }) {
  const columns = [-72, 0, 72];
  const hit = useMemo(() => roundedRectGeometry(70, 30, 6), []);

  return (
    <group position={[0, MODE_Y, LAYER]}>
      {MODES.map((name, index) => {
        const active = name === mode;
        return (
          <group key={name} position={[columns[index], 0, 0]}>
            <mesh
              geometry={hit}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(name);
              }}
            >
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Text
              font={active ? FONT_SEMIBOLD : FONT}
              fontSize={12.5}
              color={active ? YELLOW : MUTED}
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.02}
            >
              {name}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

/**
 * The shutter row: an empty gallery thumbnail, the shutter itself, and the
 * flip-camera control. Pressing the shutter still flashes the screen white
 * and back -- the one piece of feedback that costs nothing to keep even
 * with no sensor and no roll behind it.
 */
function ShutterRow({ onCapture }: { onCapture: () => void }) {
  const thumbnail = useMemo(() => roundedRectGeometry(46, 46, 10), []);
  const flipHit = useMemo(() => roundedRectGeometry(56, 56, 28), []);

  return (
    <group position={[0, SHUTTER_Y, LAYER]}>
      <mesh geometry={thumbnail} position={[LEFT + 23 + 12, 0, 0]}>
        <meshBasicMaterial color="#1c1c1e" toneMapped={false} />
      </mesh>

      <group
        onClick={(event) => {
          event.stopPropagation();
          onCapture();
        }}
      >
        <mesh>
          <ringGeometry args={[33, 38, 48]} />
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[30, 48]} />
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
      </group>

      <group position={[RIGHT - 40, 0, 0]}>
        <mesh geometry={flipHit}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <FlipCameraGlyph color={INK} />
      </group>
    </group>
  );
}

/**
 * The Camera app: iOS's own photo-mode layout -- flash toggle, mode strip,
 * shutter and flip control -- over a plain black viewfinder, since there is
 * no lens behind it and nothing in the room to frame. Every control reads
 * and responds like the real thing; none of them produce a photo.
 */
export function CameraApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const [mode, setMode] = useState<Mode>('PHOTO');
  const [flashOn, setFlashOn] = useState(false);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);
  const flashHit = useMemo(() => roundedRectGeometry(44, 44, 10), []);

  const flashRef = useRef<THREE.MeshBasicMaterial>(null);
  const flash = useRef(0);

  useFrame(() => {
    // Snaps up, then decays -- a shutter flash reads as a hit, not a fade in.
    flash.current += (0 - flash.current) * 0.12;
    if (flashRef.current) flashRef.current.opacity = flash.current;
  });

  return (
    <group>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={BACKDROP} toneMapped={false} />
      </mesh>

      <group position={[0, 0, LAYER * 7]}>
        <StatusBar />
      </group>

      <NavBack onPress={closeApp} />

      <group position={[RIGHT - 24, NAV_Y, LAYER]}>
        <mesh
          geometry={flashHit}
          onClick={(event) => {
            event.stopPropagation();
            setFlashOn((on) => !on);
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <BoltGlyph color={flashOn ? YELLOW : INK} />
      </group>

      <ModeStrip mode={mode} onSelect={setMode} />
      <ShutterRow onCapture={() => (flash.current = 0.9)} />

      {/* The capture flash, full-bleed and above everything else this app
          draws -- otherwise the mode strip and shutter row would still show
          through it. */}
      <mesh geometry={screenGeometry} position={[0, 0, LAYER * 8]}>
        <meshBasicMaterial ref={flashRef} color={INK} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* A second way back to the home screen, as on the other apps. */}
      <mesh
        geometry={indicator}
        position={[0, -DESIGN.height / 2 + 13, LAYER * 9]}
        onClick={(event) => {
          event.stopPropagation();
          closeApp();
        }}
      >
        <meshBasicMaterial color={INK} transparent opacity={0.32} toneMapped={false} />
      </mesh>
    </group>
  );
}
