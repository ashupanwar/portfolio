import { useMemo, useState, type ReactNode } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { DESIGN, LAYER, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

/** Settings is a light app on a dark system, like Notes, Phone and Messages
 *  -- but a *grouped* one: cards of rows on a tinted backdrop, rather than
 *  one flat white page. */
const PAPER = '#ffffff';
const BACKDROP = '#f2f1f6';
const INK = '#1c1c1e';
const MUTED = '#8a8a8e';
const RULE = '#e4e2dc';
/** iOS Settings' own tint, for the back control. */
const BLUE = '#0a84ff';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const RIGHT = DESIGN.width / 2 - PAD;
const NAV_Y = 352;
const TITLE_Y = 306;

const GROUP_WIDTH = DESIGN.width - PAD * 2;
const ROW_HEIGHT = 46;
const PROFILE_HEIGHT = 64;
const GROUP_GAP = 20;

/** Row-internal padding, matching the real app's own inset from a cell's
 *  edge to its icon on the left and its chevron/value on the right --
 *  the same margin on both sides, not just whatever the icon and text
 *  happened to land on. */
const ROW_INSET = 16;
const ICON_SIZE = 28;
const ICON_TEXT_GAP = 12;
const ICON_X = LEFT + ROW_INSET + ICON_SIZE / 2;
const TEXT_LEFT = LEFT + ROW_INSET + ICON_SIZE + ICON_TEXT_GAP;
/** Right-hand inset for a row's trailing content (chevron, value, toggle) --
 *  mirrors `ROW_INSET` so accessories don't crowd or poke past the card's
 *  own edge the way a bare `RIGHT - 3` used to. */
const TRAILING_RIGHT = RIGHT - ROW_INSET;

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
        <BackChevron color={BLUE} />
      </group>
      <Text
        font={FONT}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={BLUE}
        anchorX="left"
        anchorY="middle"
      >
        Back
      </Text>
    </group>
  );
}

/** Small chevron pointing right, the disclosure indicator on a settings row. */
function ChevronRight({ color }: { color: string }) {
  const bar = useMemo(() => roundedRectGeometry(7, 1.8, 0.9), []);
  return (
    <group>
      <mesh geometry={bar} position={[0, 2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={bar} position={[0, -2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Simplified paper-plane silhouette, for Airplane Mode. */
function PlaneGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-8, 0);
    shape.lineTo(7, 4.4);
    shape.lineTo(1, 0);
    shape.lineTo(7, -4.4);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry} rotation={[0, 0, Math.PI * 0.1]}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** Dot and two rising arcs, the classic Wi-Fi glyph. */
function WifiGlyph({ color }: { color: string }) {
  return (
    <group position={[0, -3, 0]}>
      <mesh>
        <circleGeometry args={[2, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[5, 6.2, 32, 1, Math.PI * 0.24, Math.PI * 0.52]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[8, 9.2, 32, 1, Math.PI * 0.24, Math.PI * 0.52]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Vertical bar with crossing diagonals top and bottom, standing in for the
 *  Bluetooth rune -- not exact, but reads as "connected lines" at this size. */
function BluetoothGlyph({ color }: { color: string }) {
  const vBar = useMemo(() => roundedRectGeometry(2, 16, 1), []);
  const dBar = useMemo(() => roundedRectGeometry(2, 9, 1), []);
  return (
    <group>
      <mesh geometry={vBar}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {[4, -4].map((y) =>
        [1, -1].map((sign) => (
          <mesh key={`${y}-${sign}`} geometry={dBar} position={[0, y, 0]} rotation={[0, 0, sign * (Math.PI / 4)]}>
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Four ascending bars, for Cellular. */
function CellularGlyph({ color }: { color: string }) {
  const heights = [4, 7.3, 10.6, 14];
  return (
    <group>
      {heights.map((h, i) => (
        <mesh key={h} position={[-6 + i * 4, -7 + h / 2, 0]}>
          <planeGeometry args={[2.4, h]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Bell dome and clapper, for Notifications. */
function BellGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-6, -3);
    shape.quadraticCurveTo(-6, 6.5, 0, 8.5);
    shape.quadraticCurveTo(6, 6.5, 6, -3);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, -6, 0]}>
        <circleGeometry args={[1.7, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Ring with radiating teeth, for General. */
function GearGlyph({ color }: { color: string }) {
  const tooth = useMemo(() => roundedRectGeometry(2.6, 5, 1), []);
  const teeth = 8;
  return (
    <group>
      <mesh>
        <ringGeometry args={[3.6, 6.6, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {Array.from({ length: teeth }, (_, i) => {
        const angle = (i / teeth) * Math.PI * 2;
        return (
          <mesh
            key={i}
            geometry={tooth}
            position={[Math.cos(angle) * 7.4, Math.sin(angle) * 7.4, 0]}
            rotation={[0, 0, angle + Math.PI / 2]}
          >
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Disc with short rays, for Display & Brightness. */
function SunGlyph({ color }: { color: string }) {
  const ray = useMemo(() => roundedRectGeometry(1.6, 3.2, 0.8), []);
  const rays = 8;
  return (
    <group>
      <mesh>
        <circleGeometry args={[3.6, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {Array.from({ length: rays }, (_, i) => {
        const angle = (i / rays) * Math.PI * 2;
        return (
          <mesh
            key={i}
            geometry={ray}
            position={[Math.cos(angle) * 6.6, Math.sin(angle) * 6.6, 0]}
            rotation={[0, 0, angle + Math.PI / 2]}
          >
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Crescent, via a circle with a smaller offset circle punched out as a
 *  hole -- the overlap removed is what leaves the crescent behind. */
function MoonGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const outer = new THREE.Shape();
    outer.absarc(0, 0, 8, 0, Math.PI * 2, false);
    const inner = new THREE.Path();
    inner.absarc(3.6, -0.8, 7, 0, Math.PI * 2, true);
    outer.holes.push(inner);
    return new THREE.ShapeGeometry(outer);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** iOS-style toggle switch: a pill track and a sliding knob. */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  const track = useMemo(() => roundedRectGeometry(44, 24, 12), []);

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
    >
      <mesh geometry={track}>
        <meshBasicMaterial color={on ? '#34c759' : '#e5e5ea'} toneMapped={false} />
      </mesh>
      <mesh position={[on ? 10 : -10, 0, LAYER]}>
        <circleGeometry args={[10, 32]} />
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface Row {
  icon: (color: string) => ReactNode;
  iconBg: string;
  label: string;
  /** Trailing status text, e.g. a network name -- mutually exclusive with `toggle`. */
  value?: string;
  toggle?: boolean;
}

/** One row's own height contribution -- every row is the same height here,
 *  but keeping this as a function (not the bare constant) is what lets the
 *  group-position maths below read as "the height of this group" rather
 *  than a row count that happens to get multiplied by something. */
function groupHeight(rows: Row[]) {
  return rows.length * ROW_HEIGHT;
}

function SettingsRowView({
  row,
  top,
  showDivider,
  toggleOn,
  onToggleChange,
}: {
  row: Row;
  top: number;
  showDivider: boolean;
  /** Only meaningful when `row.toggle` is set -- there is exactly one
   *  toggle row across every group, so one pair of props covers it rather
   *  than threading a whole state map through for a single switch. */
  toggleOn: boolean;
  onToggleChange: () => void;
}) {
  // Runs from the row's own text inset to its trailing inset, so it frames
  // the same padded content area as everything else in the row.
  const dividerWidth = TRAILING_RIGHT - TEXT_LEFT;
  const divider = useMemo(() => roundedRectGeometry(dividerWidth, 1, 0.5), [dividerWidth]);
  const iconBadge = useMemo(() => roundedRectGeometry(28, 28, 8), []);

  return (
    <group position={[0, top - ROW_HEIGHT / 2, 0]}>
      <mesh geometry={iconBadge} position={[ICON_X, 0, LAYER]}>
        <meshBasicMaterial color={row.iconBg} toneMapped={false} />
      </mesh>
      <group position={[ICON_X, 0, LAYER * 2]}>{row.icon(PAPER)}</group>

      <Text
        font={FONT}
        position={[TEXT_LEFT, 0, LAYER]}
        fontSize={15.5}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        {row.label}
      </Text>

      {row.toggle ? (
        // Toggle track is 44 wide -- offset by its own half-width so its
        // trailing edge, not its centre, lands on the row's right inset.
        <group position={[TRAILING_RIGHT - 22, 0, LAYER]}>
          <Toggle on={toggleOn} onChange={onToggleChange} />
        </group>
      ) : (
        <>
          {row.value && (
            <Text
              font={FONT}
              position={[TRAILING_RIGHT - 20, 0, LAYER]}
              fontSize={14}
              color={MUTED}
              anchorX="right"
              anchorY="middle"
            >
              {row.value}
            </Text>
          )}
          <group position={[TRAILING_RIGHT - 4, 0, LAYER]}>
            <ChevronRight color="#c7c7cc" />
          </group>
        </>
      )}

      {showDivider && (
        <mesh geometry={divider} position={[TEXT_LEFT + dividerWidth / 2, -ROW_HEIGHT / 2, LAYER]}>
          <meshBasicMaterial color={RULE} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** A white rounded-rect card of rows, iOS's own "grouped" table style. */
function SettingsGroup({
  rows,
  top,
  toggleOn,
  onToggleChange,
}: {
  rows: Row[];
  top: number;
  toggleOn: boolean;
  onToggleChange: () => void;
}) {
  const height = groupHeight(rows);
  const card = useMemo(() => roundedRectGeometry(GROUP_WIDTH, height, 14), [height]);

  return (
    <group>
      <mesh geometry={card} position={[0, top - height / 2, 0]}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>
      {rows.map((row, index) => (
        <SettingsRowView
          key={row.label}
          row={row}
          top={top - index * ROW_HEIGHT}
          showDivider={index < rows.length - 1}
          toggleOn={toggleOn}
          onToggleChange={onToggleChange}
        />
      ))}
    </group>
  );
}

const CONNECTIVITY: Row[] = [
  { icon: (c) => <PlaneGlyph color={c} />, iconBg: '#ff9500', label: 'Airplane Mode', toggle: true },
  { icon: (c) => <WifiGlyph color={c} />, iconBg: '#007aff', label: 'Wi-Fi', value: 'Jio WiFi' },
  { icon: (c) => <BluetoothGlyph color={c} />, iconBg: '#007aff', label: 'Bluetooth', value: 'On' },
  { icon: (c) => <CellularGlyph color={c} />, iconBg: '#34c759', label: 'Cellular' },
];

const SYSTEM: Row[] = [
  { icon: (c) => <BellGlyph color={c} />, iconBg: '#ff3b30', label: 'Notifications' },
  { icon: (c) => <MoonGlyph color={c} />, iconBg: '#5856d6', label: 'Focus' },
];

const DEVICE: Row[] = [
  { icon: (c) => <GearGlyph color={c} />, iconBg: '#8e8e93', label: 'General' },
  { icon: (c) => <SunGlyph color={c} />, iconBg: '#1c9bf0', label: 'Display & Brightness' },
];

/** The profile card at the top -- avatar, name and a subtitle, in the shape
 *  of the real app's own Apple ID row. Tapping it does nothing; there is no
 *  account behind it, only the shape of one. */
function ProfileRow({ top }: { top: number }) {
  const card = useMemo(() => roundedRectGeometry(GROUP_WIDTH, PROFILE_HEIGHT, 14), []);
  const avatarX = LEFT + ROW_INSET + 24;

  return (
    <group>
      <mesh geometry={card} position={[0, top - PROFILE_HEIGHT / 2, 0]}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>

      <group position={[avatarX, top - PROFILE_HEIGHT / 2, LAYER]}>
        <mesh>
          <circleGeometry args={[24, 32]} />
          <meshBasicMaterial color="#b6b8bd" toneMapped={false} />
        </mesh>
        <Text
          font={FONT_SEMIBOLD}
          position={[0, 0, LAYER]}
          fontSize={16}
          color={PAPER}
          anchorX="center"
          anchorY="middle"
        >
          AP
        </Text>
      </group>

      <Text
        font={FONT_SEMIBOLD}
        position={[avatarX + 38, top - PROFILE_HEIGHT / 2 + 10, LAYER]}
        fontSize={17}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        Ashu Panwar
      </Text>
      <Text
        font={FONT}
        position={[avatarX + 38, top - PROFILE_HEIGHT / 2 - 11, LAYER]}
        fontSize={12.5}
        color={MUTED}
        anchorX="left"
        anchorY="middle"
      >
        Apple ID, iCloud & more
      </Text>

      <group position={[TRAILING_RIGHT - 4, top - PROFILE_HEIGHT / 2, LAYER]}>
        <ChevronRight color="#c7c7cc" />
      </group>
    </group>
  );
}

/**
 * The Settings app: iOS's own grouped-table layout -- a profile card, then
 * Connectivity, System and Device sections -- carrying nothing behind any
 * of it. Every toggle, chevron and row reads and (where it can) responds
 * like the real thing; none of them lead anywhere, since there is nowhere
 * for them to go.
 */
export function SettingsApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const [airplaneMode, setAirplaneMode] = useState(false);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);

  const profileTop = TITLE_Y - 46;
  const connectivityTop = profileTop - PROFILE_HEIGHT - GROUP_GAP;
  const systemTop = connectivityTop - groupHeight(CONNECTIVITY) - GROUP_GAP;
  const deviceTop = systemTop - groupHeight(SYSTEM) - GROUP_GAP;

  return (
    <group>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={BACKDROP} toneMapped={false} />
      </mesh>

      <group position={[0, 0, LAYER * 7]}>
        <StatusBar color={INK} />
      </group>

      <NavBack onPress={closeApp} />

      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, LAYER]}
        fontSize={32}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        Settings
      </Text>

      <ProfileRow top={profileTop} />
      <SettingsGroup
        rows={CONNECTIVITY}
        top={connectivityTop}
        toggleOn={airplaneMode}
        onToggleChange={() => setAirplaneMode((on) => !on)}
      />
      <SettingsGroup rows={SYSTEM} top={systemTop} toggleOn={false} onToggleChange={() => {}} />
      <SettingsGroup rows={DEVICE} top={deviceTop} toggleOn={false} onToggleChange={() => {}} />

      <mesh
        geometry={indicator}
        position={[0, -DESIGN.height / 2 + 13, LAYER * 7]}
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
