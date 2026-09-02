import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCREEN } from '../scene/layout';
import {
  APPS,
  DESIGN,
  DOCK,
  LAYER,
  ICON_SIZE,
  LIFT_TRAVEL,
  phoneValues,
  usePhone,
  type AppIcon,
  ICON_URLS,
} from './usePhone';
import { roundedRectGeometry } from './shapes';

import { FONT, FONT_SEMIBOLD, WHITE } from './typography';
/** iOS tints lock-screen type toward the wallpaper; this photo pulls it cold. */
const GLASS = '#dceafc';

/**
 * Positions measured off the reference screenshot as fractions of its frame,
 * then mapped into the 390x844 design grid. Keeping the fractions visible makes
 * it obvious where these came from and how to re-derive them.
 */
const y = (fraction: number) => DESIGN.height / 2 - fraction * DESIGN.height;
const x = (fraction: number) => fraction * DESIGN.width - DESIGN.width / 2;

/**
 * Right edge of the status-bar icon cluster, matching the reference screenshot
 * (its battery ends at 0.910 of the frame width). Lower this to inset further.
 */
const STATUS_RIGHT = x(0.91);
/** Baseline height of the swipe prompt, just clear of the home indicator. */
const SWIPE_HINT_Y = -DESIGN.height / 2 + 48;
/** How far the battery's terminal nub extends past its group origin. */
const BATTERY_NUB = 17.6;

const LOCK = {
  statusY: y(0.035),
  dateY: y(0.105),
  timeY: y(0.176),
  actionY: y(0.911),
  actionR: 23,
  actionX: 0.179,
} as const;

/** Live clock, ticking on the minute like the real thing. */
function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(
    () => ({
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false }),
      weekday: now.toLocaleDateString([], { weekday: 'long' }).toUpperCase(),
      day: String(now.getDate()),
      date: now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }),
    }),
    [now],
  );
}

/**
 * Thin bar at the bottom edge, the iOS home indicator. Sits 13pt up from the
 * screen edge, matching the device -- the earlier 24pt left it floating well
 * clear of the bottom.
 */
const HOME_INDICATOR_INSET = 13;

function HomeIndicator() {
  const geometry = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);
  return (
    <mesh geometry={geometry} position={[0, -DESIGN.height / 2 + HOME_INDICATOR_INSET, LAYER]}>
      <meshBasicMaterial color={WHITE} transparent opacity={0.85} toneMapped={false} />
    </mesh>
  );
}

/** Ascending cellular bars. */
function SignalBars({ color = WHITE }: { color?: string }) {
  const bar = useMemo(() => roundedRectGeometry(3, 1, 0.5), []);
  return (
    <group>
      {[4, 6.5, 9, 11.5].map((height, index) => (
        <mesh
          key={height}
          geometry={bar}
          position={[index * 4.5, height / 2 - 5.5, 0]}
          scale={[1, height, 1]}
        >
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Wi-Fi glyph: a dot under two concentric arcs. */
function WifiGlyph({ color = WHITE }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, -4.5, 0]}>
        <circleGeometry args={[1.7, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {[
        [4.2, 5.6],
        [8, 9.4],
      ].map(([inner, outer]) => (
        <mesh key={inner} position={[0, -4.5, 0]}>
          <ringGeometry args={[inner, outer, 24, 1, Math.PI / 4, Math.PI / 2]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Battery({ level, color = WHITE }: { level: number; color?: string }) {
  const pill = useMemo(() => roundedRectGeometry(27, 13, 4), []);
  return (
    <group>
      <mesh geometry={pill}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Terminal nub on the right. */}
      <mesh position={[16, 0, 0]}>
        <circleGeometry args={[1.6, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <Text
        font={FONT_SEMIBOLD}
        position={[0, 0, LAYER]}
        fontSize={10}
        color="#0a0a0a"
        anchorX="center"
        anchorY="middle"
      >
        {String(level)}
      </Text>
    </group>
  );
}

export function StatusBar({
  carrier = 'Jio WiFi',
  color = WHITE,
}: {
  carrier?: string;
  /** App screens with light backgrounds need dark status-bar contents. */
  color?: string;
}) {
  return (
    <group position={[0, LOCK.statusY, LAYER]}>
      <Text
        font={FONT}
        position={[x(0.117), 0, 0]}
        fontSize={14.5}
        color={color}
        anchorX="left"
        anchorY="middle"
      >
        {carrier}
      </Text>

      {/* The cluster is anchored off the battery's right edge rather than
          positioned individually, so the inset from the screen edge is a single
          number. The battery's terminal nub sticks out ~17.6 past its own
          origin, which is what BATTERY_NUB accounts for. */}
      <group position={[STATUS_RIGHT - BATTERY_NUB, 0, 0]}>
        <Battery level={74} color={color} />
      </group>
      <group position={[STATUS_RIGHT - BATTERY_NUB - 27, 0, 0]}>
        <WifiGlyph color={color} />
      </group>
      <group position={[STATUS_RIGHT - BATTERY_NUB - 56, 0, 0]}>
        <SignalBars color={color} />
      </group>
    </group>
  );
}

/**
 * The 14 Pro's Dynamic Island.
 *
 * Hardware rather than UI, so it lives above every screen and never fades with
 * them -- a real island is just as black while the phone is asleep. Sized to
 * Apple's ~125x37pt pill, 11pt down from the top edge, which is why the status
 * bar's contents sit either side of it rather than under it.
 */
export function DynamicIsland() {
  const pill = useMemo(() => roundedRectGeometry(125, 37, 18.5), []);

  return (
    <group position={[0, DESIGN.height / 2 - 11 - 18.5, 0]}>
      <mesh geometry={pill}>
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      {/* Front camera: only just readable against the pill, as on the device. */}
      <mesh position={[36, 0, 0.4]}>
        <circleGeometry args={[6.5, 24]} />
        <meshBasicMaterial color="#0a0d13" toneMapped={false} />
      </mesh>
      <mesh position={[36, 0, 0.8]}>
        <circleGeometry args={[3.2, 20]} />
        <meshBasicMaterial color="#131a27" toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * The "tap to wake" cue on the dark screen.
 *
 * A ring that expands and fades out of a solid dot, repeating -- the standard
 * shorthand for a tap. Deliberately the only lit thing on the screen, so it
 * reads as an invitation rather than as UI.
 */
export function TapHint() {
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const dot = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    for (const [index, ref] of [ring, ring2].entries()) {
      if (!ref.current) continue;
      // Two rings half a cycle apart, so the pulse never fully stops.
      const phase = (t * 0.7 + index * 0.5) % 1;
      ref.current.scale.setScalar(0.5 + phase * 1.6);
      const material = ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * 0.5;
    }

    if (dot.current) dot.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
  });

  return (
    <group position={[0, 0, LAYER * 2]}>
      <mesh ref={dot}>
        <circleGeometry args={[26, 32]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.9} toneMapped={false} />
      </mesh>

      <mesh ref={ring}>
        <ringGeometry args={[30, 33, 48]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh ref={ring2}>
        <ringGeometry args={[30, 33, 48]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      <Text
        font={FONT}
        position={[0, -90, 0]}
        fontSize={22}
        color={WHITE}
        anchorX="center"
        anchorY="middle"
      >
        Tap to wake
      </Text>
    </group>
  );
}

/**
 * Floating "Swipe to unlock" prompt above the home indicator.
 *
 * Sits centred between the two action buttons; the buttons are far enough out
 * horizontally (x +/-125, radius 23) that the label's ~100pt width never meets
 * them, which is what buys the vertical room down here. Drifts upward and back
 * to suggest the gesture rather than just naming it.
 */
function SwipeHint() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = SWIPE_HINT_Y + Math.sin(state.clock.elapsedTime * 1.9) * 4;
    }
  });

  return (
    <group ref={group} position={[0, SWIPE_HINT_Y, 0]}>
      <Text
        font={FONT}
        position={[0, 0, LAYER]}
        fontSize={15}
        color="#e6ecf6"
        anchorX="center"
        anchorY="middle"
      >
        Swipe to unlock
      </Text>
    </group>
  );
}

/** Torch glyph: a tapered head over a handle. */
function TorchGlyph() {
  const head = useMemo(() => roundedRectGeometry(9, 5, 1.5), []);
  const body = useMemo(() => roundedRectGeometry(7, 12, 1.5), []);
  return (
    <group>
      <mesh geometry={head} position={[0, 7, 0]}>
        <meshBasicMaterial color={WHITE} toneMapped={false} />
      </mesh>
      <mesh geometry={body} position={[0, -1, 0]}>
        <meshBasicMaterial color={WHITE} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Camera glyph: body, lens and viewfinder bump. */
function CameraGlyph() {
  const body = useMemo(() => roundedRectGeometry(20, 14, 3), []);
  const bump = useMemo(() => roundedRectGeometry(7, 3, 1), []);
  return (
    <group>
      <mesh geometry={bump} position={[-3, 8, 0]}>
        <meshBasicMaterial color={WHITE} toneMapped={false} />
      </mesh>
      <mesh geometry={body}>
        <meshBasicMaterial color={WHITE} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, LAYER]}>
        <circleGeometry args={[4.4, 20]} />
        <meshBasicMaterial color="#1c1c1e" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Translucent round button, as on the iOS lock screen. */
function ActionButton({ px, children }: { px: number; children: React.ReactNode }) {
  return (
    <group position={[px, LOCK.actionY, LAYER]}>
      <mesh>
        <circleGeometry args={[LOCK.actionR, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} toneMapped={false} />
      </mesh>
      <group position={[0, 0, LAYER]}>{children}</group>
    </group>
  );
}

/**
 * The whole lock screen travels on unlock, but by two different means.
 *
 * Everything drawn on top -- clock, chrome -- simply translates. The wallpaper
 * and its subject cutout instead scroll their *texture*, leaving their meshes
 * exactly where they are. That distinction is what preserves the screen's
 * rounded corners: the clip region is four straight planes, so the moment a
 * full-bleed mesh slides out from under them, the planes' square corner becomes
 * the visible top edge. Scrolling UVs keeps the rounded geometry as the edge at
 * every point of the animation.
 */
export function LockScreen() {
  const { time, date } = useClock();

  const screen = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, SCREEN.radius * DESIGN.width),
    [],
  );

  const content = useRef<THREE.Group>(null);
  const chrome = useRef<THREE.Group>(null);

  const [wallpaper, subject] = useTexture(['/wallpaper.webp', '/wallpaper-fg.webp']);
  useMemo(() => {
    subject.colorSpace = THREE.SRGBColorSpace;
    subject.anisotropy = 8;
    // Without this the photo renders washed out -- three treats textures as
    // linear unless told they are sRGB.
    wallpaper.colorSpace = THREE.SRGBColorSpace;
    wallpaper.anisotropy = 8;
  }, [wallpaper, subject]);

  useFrame(() => {
    const travel = phoneValues.lift * DESIGN.height * LIFT_TRAVEL;
    if (content.current) content.current.position.y = travel;
    if (chrome.current) chrome.current.position.y = travel;

    // The textures are (1 + LIFT_TRAVEL) taller than the screen, the extra strip
    // being transparent. We sample a screen-sized window of that image and walk
    // it downward, which reads as the photo riding up while its mesh -- and so
    // its rounded corners -- never move. At full lift the window sits entirely
    // on the clear padding, letting the home screen through.
    const window = 1 / (1 + LIFT_TRAVEL);
    const offset = (1 - phoneValues.lift) * (1 - window);

    for (const texture of [wallpaper, subject]) {
      texture.repeat.y = window;
      texture.offset.y = offset;
    }
  });

  return (
    <group>
      <mesh geometry={screen}>
        <meshBasicMaterial map={wallpaper} toneMapped={false} />
      </mesh>

      <group ref={content}>
        <Text
          font={FONT}
          position={[0, LOCK.dateY, LAYER]}
          fontSize={23}
          color={GLASS}
          anchorX="center"
          anchorY="middle"
        >
          {date}
        </Text>

        <Text
          font={FONT_SEMIBOLD}
          position={[0, LOCK.timeY, LAYER]}
          fontSize={92}
          color={GLASS}
          anchorX="center"
          anchorY="middle"
          letterSpacing={-0.01}
        >
          {time}
        </Text>
      </group>

      {/* The subject again, this time cut out and drawn over the clock, which
          is how iOS gets the type to sit behind his head. Carries the same
          pixels as the layer beneath, so its soft mask edges composite back
          onto themselves invisibly -- the only place the layers differ is
          wherever the clock is sandwiched between them. */}
      <mesh geometry={screen} position={[0, 0, LAYER * 3]}>
        <meshBasicMaterial map={subject} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Chrome, in front of the cutout. Transparent objects are sorted by
          distance to camera, so this group's z is what keeps the buttons and
          status bar from being swallowed by the subject layer. */}
      <group ref={chrome} position={[0, 0, LAYER * 4]}>
        <StatusBar />
        <ActionButton px={x(LOCK.actionX)}>
          <TorchGlyph />
        </ActionButton>
        <ActionButton px={x(1 - LOCK.actionX)}>
          <CameraGlyph />
        </ActionButton>
        <SwipeHint />
        <HomeIndicator />
      </group>
    </group>
  );
}

/**
 * Home screen, following the reference layout: two 2x2 widgets, a 4x2 app grid,
 * a search pill and a floating dock, over the lock-screen photo blurred back.
 *
 * Metrics are iOS's: 24pt side margins, 155pt widgets with a 32pt gutter, 58pt
 * icons on an 87pt column pitch.
 */
const HOME = {
  margin: 24,
  widget: 155,
  widgetTop: y(0.097),
  icon: ICON_SIZE,
  columns: [-131, -44, 44, 131],
  rows: [108, 12],
  // Spans the screen bar an 18pt margin either side. At this width the dock's
  // four icons land on the same column centres as the grid above, which is how
  // iOS lines them up.
  dock: { width: 354, height: 90, y: -348, radius: 32 },
} as const;

const INK = '#1c1c1e';

/** Card behind each widget. */
function WidgetCard({ px, children }: { px: number; children: React.ReactNode }) {
  const card = useMemo(() => roundedRectGeometry(HOME.widget, HOME.widget, 22), []);
  const centreY = HOME.widgetTop - HOME.widget / 2;

  return (
    <group position={[px, centreY, LAYER]}>
      <mesh geometry={card}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.94} toneMapped={false} />
      </mesh>
      <group position={[0, 0, LAYER]}>{children}</group>
    </group>
  );
}

function WidgetLabel({ px, children }: { px: number; children: string }) {
  return (
    <Text
      font={FONT}
      position={[px, HOME.widgetTop - HOME.widget - 14, LAYER]}
      fontSize={12}
      color={WHITE}
      anchorX="center"
      anchorY="middle"
    >
      {children}
    </Text>
  );
}

/** Sun behind a cloud, for the weather card. */
function WeatherGlyph() {
  const puff = useMemo(() => roundedRectGeometry(20, 8, 4), []);
  return (
    <group>
      <mesh position={[4, 4, 0]}>
        <circleGeometry args={[6, 20]} />
        <meshBasicMaterial color="#f5b731" toneMapped={false} />
      </mesh>
      <mesh position={[-2, 2, 0.2]}>
        <circleGeometry args={[6.5, 20]} />
        <meshBasicMaterial color="#b7c1cc" toneMapped={false} />
      </mesh>
      <mesh geometry={puff} position={[0, -2, 0.2]}>
        <meshBasicMaterial color="#b7c1cc" toneMapped={false} />
      </mesh>
    </group>
  );
}

function WeatherWidget({ px }: { px: number }) {
  const half = HOME.widget / 2;
  return (
    <WidgetCard px={px}>
      <Text font={FONT_SEMIBOLD} position={[-half + 16, half - 22, 0]} fontSize={15} color={INK} anchorX="left" anchorY="middle">
        New Delhi
      </Text>
      <Text font={FONT} position={[-half + 14, half - 58, 0]} fontSize={42} color={INK} anchorX="left" anchorY="middle">
        31°
      </Text>
      <group position={[-half + 26, -half + 52, 0]}>
        <WeatherGlyph />
      </group>
      <Text font={FONT} position={[-half + 16, -half + 32, 0]} fontSize={12.5} color={INK} anchorX="left" anchorY="middle">
        Partly Cloudy
      </Text>
      <Text font={FONT} position={[-half + 16, -half + 15, 0]} fontSize={12.5} color={INK} anchorX="left" anchorY="middle">
        H:34° L:26°
      </Text>
    </WidgetCard>
  );
}

function CalendarWidget({ px, weekday, day }: { px: number; weekday: string; day: string }) {
  const half = HOME.widget / 2;
  return (
    <WidgetCard px={px}>
      <Text font={FONT_SEMIBOLD} position={[-half + 16, half - 22, 0]} fontSize={12} color="#e2554f" anchorX="left" anchorY="middle" letterSpacing={0.06}>
        {weekday}
      </Text>
      <Text font={FONT_SEMIBOLD} position={[-half + 14, half - 62, 0]} fontSize={46} color={INK} anchorX="left" anchorY="middle">
        {day}
      </Text>
    </WidgetCard>
  );
}

function AppIconTile({
  app,
  px,
  py,
  label = true,
  texture,
  onSelect,
}: {
  app: AppIcon;
  px: number;
  py: number;
  label?: boolean;
  texture?: THREE.Texture;
  onSelect?: () => void;
}) {
  const tile = useMemo(() => roundedRectGeometry(HOME.icon, HOME.icon, 13), []);

  return (
    <group position={[px, py, LAYER]}>
      {/* Artwork carries its own field and rounded corners; the rounded
          geometry still trims any that arrived as a hard square. An app with no
          artwork falls back to a plain coloured tile. */}
      <mesh
        geometry={tile}
        onClick={
          onSelect &&
          ((event) => {
            event.stopPropagation();
            onSelect();
          })
        }
      >
        {texture ? (
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        ) : (
          <meshBasicMaterial color={app.color} toneMapped={false} />
        )}
      </mesh>
      {label && (
        <Text font={FONT} position={[0, -HOME.icon / 2 - 13, LAYER]} fontSize={12} color={WHITE} anchorX="center" anchorY="middle">
          {app.name}
        </Text>
      )}
    </group>
  );
}

/** What tapping each app does. Apps with no entry are inert for now. */
function APP_ACTIONS(
  name: string,
  origin: [number, number],
  actions: { relock: () => void; openApp: (name: string, origin: [number, number]) => void },
) {
  if (name === 'Lock') return actions.relock;
  if (name === 'Notes') return () => actions.openApp('Notes', origin);
  return undefined;
}

export function HomeScreen() {
  const { weekday, day } = useClock();
  const relock = usePhone((s) => s.relock);
  const openApp = usePhone((s) => s.openApp);
  const openedApp = usePhone((s) => s.app);

  const screen = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, SCREEN.radius * DESIGN.width),
    [],
  );
  const dock = useMemo(
    () => roundedRectGeometry(HOME.dock.width, HOME.dock.height, HOME.dock.radius),
    [],
  );
  const search = useMemo(() => roundedRectGeometry(96, 26, 13), []);

  const blurred = useTexture('/wallpaper-blur.webp');
  const frostPlate = useTexture('/wallpaper-frost.webp');
  const iconTextures = useTexture(ICON_URLS);
  useMemo(() => {
    blurred.colorSpace = THREE.SRGBColorSpace;
    for (const texture of iconTextures) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    }
    frostPlate.colorSpace = THREE.SRGBColorSpace;
  }, [blurred, frostPlate, iconTextures]);

  /**
   * The dock samples only the slice of the frost plate that sits behind it, so
   * the glass shows the wallpaper continuing underneath rather than a repeat of
   * the whole image. Cloned because offset and repeat are per-texture state and
   * the plate is shared.
   */
  const frost = useMemo(() => {
    const texture = frostPlate.clone();
    texture.needsUpdate = true;
    texture.repeat.set(HOME.dock.width / DESIGN.width, HOME.dock.height / DESIGN.height);
    texture.offset.set(
      (DESIGN.width / 2 - HOME.dock.width / 2) / DESIGN.width,
      (HOME.dock.y - HOME.dock.height / 2 + DESIGN.height / 2) / DESIGN.height,
    );
    return texture;
  }, [frostPlate]);

  /** Artwork by path, so a tile can look up its own without prop-drilling. */
  const byUrl = useMemo(
    () => new Map(ICON_URLS.map((url, index) => [url, iconTextures[index]])),
    [iconTextures],
  );

  const widgetX = -DESIGN.width / 2 + HOME.margin + HOME.widget / 2;

  return (
    <group>
      <mesh geometry={screen}>
        <meshBasicMaterial map={blurred} toneMapped={false} />
      </mesh>

      <StatusBar />

      <WeatherWidget px={widgetX} />
      <CalendarWidget px={-widgetX} weekday={weekday} day={day} />
      <WidgetLabel px={widgetX}>Weather</WidgetLabel>
      <WidgetLabel px={-widgetX}>Calendar</WidgetLabel>

      {APPS.slice(0, 8).map((app, index) => {
        const px = HOME.columns[index % 4];
        const py = HOME.rows[Math.floor(index / 4)];
        return (
        <AppIconTile
          key={app.name}
          app={app}
          px={px}
          py={py}
          texture={app.icon ? byUrl.get(app.icon) : undefined}
          // Icons stay raycastable under an open app, so their handlers have to
          // come off or a tap inside Notes would reach the icon behind it.
          onSelect={
            openedApp ? undefined : APP_ACTIONS(app.name, [px, py], { relock, openApp })
          }
        />
        );
      })}

      {/* Search pill */}
      <group position={[0, -262, LAYER]}>
        <mesh geometry={search}>
          <meshBasicMaterial color="#000000" transparent opacity={0.22} toneMapped={false} />
        </mesh>
        <Text font={FONT} position={[0, 0, LAYER]} fontSize={12} color={WHITE} anchorX="center" anchorY="middle">
          Search
        </Text>
      </group>

      {/* Dock */}
      <group position={[0, HOME.dock.y, LAYER]}>
        {/* Just the glass now: the wallpaper sampled through a heavy blur, with
            no white film or rim over it. Definition comes from the blur being
            softer than the backdrop, not from tinting the panel. */}
        <mesh geometry={dock}>
          <meshBasicMaterial map={frost} toneMapped={false} />
        </mesh>
        {DOCK.map((app, index) => (
          <AppIconTile
            key={app.name}
            app={app}
            px={HOME.columns[index]}
            py={0}
            label={false}
            texture={app.icon ? byUrl.get(app.icon) : undefined}
          />
        ))}
      </group>

      <HomeIndicator />
    </group>
  );
}
