import { useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { DESIGN, LAYER, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

/** Music is dark by default, like the system around it -- no palette
 *  override needed the way the light apps (Notes, Phone, Messages) carry
 *  one. Tinted with the dock icon's own red rather than iOS's usual blue. */
const INK = '#ffffff';
const MUTED = '#98989d';
const BACKDROP = '#000000';
const RULE = '#2c2c2e';
const PINK = '#fc3c58';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;
const TITLE_Y = 306;

const TAB_BAR_Y = -DESIGN.height / 2 + 47;
const DIVIDER_Y = TAB_BAR_Y + 36;

type TabName = 'Home' | 'New' | 'Radio' | 'Library' | 'Search';

const TABS: { name: TabName; empty: string }[] = [
  { name: 'Home', empty: 'Nothing to play yet' },
  { name: 'New', empty: 'Check back for new releases' },
  { name: 'Radio', empty: 'No Stations' },
  { name: 'Library', empty: 'Your Library Is Empty' },
  { name: 'Search', empty: '' },
];

/** House silhouette, roof and body as one shape, for Home. */
function HouseGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-8.5, -8);
    shape.lineTo(-8.5, 1);
    shape.lineTo(-10.5, 1);
    shape.lineTo(0, 11.5);
    shape.lineTo(10.5, 1);
    shape.lineTo(8.5, 1);
    shape.lineTo(8.5, -8);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** Four-point sparkle, for New. */
function SparkleGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const spikes = 4;
    const outer = 10.5;
    const inner = 3;
    for (let i = 0; i < spikes * 2; i += 1) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** Broadcast dot and two open arcs, for Radio. */
function RadioGlyph({ color }: { color: string }) {
  return (
    <group rotation={[0, 0, -Math.PI / 4]}>
      <mesh>
        <circleGeometry args={[2.1, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[5.2, 6.4, 32, 1, Math.PI * 0.25, Math.PI * 1.5]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[8.4, 9.6, 32, 1, Math.PI * 0.25, Math.PI * 1.5]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Three stacked bars, for Library. */
function LibraryGlyph({ color }: { color: string }) {
  const bar = useMemo(() => roundedRectGeometry(19, 3, 1.5), []);
  return (
    <group>
      {[6.5, 0, -6.5].map((y) => (
        <mesh key={y} geometry={bar} position={[0, y, 0]}>
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Magnifying glass, for Search. */
function SearchGlyph({ color, size = 1 }: { color: string; size?: number }) {
  const handle = useMemo(() => roundedRectGeometry(2.6 * size, 8 * size, 1.3 * size), [size]);
  return (
    <group>
      <mesh>
        <ringGeometry args={[4.8 * size, 6.2 * size, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={handle} position={[4.6 * size, -4.6 * size, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

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

/** Chevron, label and an invisible target sized for a finger -- the way out
 *  of the app from any tab, sitting above every tab's own title. */
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
        <BackChevron color={PINK} />
      </group>
      <Text
        font={FONT}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={PINK}
        anchorX="left"
        anchorY="middle"
      >
        Back
      </Text>
    </group>
  );
}

const GLYPHS: Record<TabName, (color: string) => React.ReactNode> = {
  Home: (color) => <HouseGlyph color={color} />,
  New: (color) => <SparkleGlyph color={color} />,
  Radio: (color) => <RadioGlyph color={color} />,
  Library: (color) => <LibraryGlyph color={color} />,
  Search: (color) => <SearchGlyph color={color} />,
};

function TabBar({ active, onSelect }: { active: TabName; onSelect: (name: TabName) => void }) {
  const hit = useMemo(() => roundedRectGeometry(62, 50, 8), []);
  const divider = useMemo(() => roundedRectGeometry(DESIGN.width - PAD, 1, 0.5), []);
  const columns = [-152, -76, 0, 76, 152];

  return (
    <group>
      <mesh geometry={divider} position={[0, DIVIDER_Y, LAYER]}>
        <meshBasicMaterial color={RULE} toneMapped={false} />
      </mesh>

      {TABS.map((tab, index) => {
        const isActive = tab.name === active;
        const color = isActive ? PINK : MUTED;
        return (
          <group key={tab.name} position={[columns[index], TAB_BAR_Y, LAYER]}>
            <mesh
              geometry={hit}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(tab.name);
              }}
            >
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <group position={[0, 10, LAYER]}>{GLYPHS[tab.name](color)}</group>
            <Text
              font={FONT}
              position={[0, -8, LAYER]}
              fontSize={10}
              color={color}
              anchorX="center"
              anchorY="middle"
            >
              {tab.name}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

/** Home, New, Radio and Library: a title, and nothing under it. */
function ListTab({ title, message }: { title: string; message: string }) {
  return (
    <group>
      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, LAYER]}
        fontSize={32}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        {title}
      </Text>
      <Text
        font={FONT}
        position={[0, 40, LAYER]}
        fontSize={14.5}
        color={MUTED}
        anchorX="center"
        anchorY="middle"
      >
        {message}
      </Text>
    </group>
  );
}

/** The Search tab: a title and an empty search field, nothing typed. */
function SearchTab() {
  const search = useMemo(() => roundedRectGeometry(DESIGN.width - PAD * 2, 36, 10), []);

  return (
    <group>
      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, LAYER]}
        fontSize={32}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        Search
      </Text>

      <group position={[0, 262, LAYER]}>
        <mesh geometry={search}>
          <meshBasicMaterial color="#1c1c1e" toneMapped={false} />
        </mesh>
        <group position={[LEFT + 22, 0, LAYER]}>
          <SearchGlyph color={MUTED} size={0.62} />
        </group>
        <Text
          font={FONT}
          position={[LEFT + 38, 0, LAYER]}
          fontSize={13}
          color={MUTED}
          anchorX="left"
          anchorY="middle"
        >
          Artists, Songs, Lyrics, and More
        </Text>
      </group>
    </group>
  );
}

/**
 * The Music app: iOS's Home / New / Radio / Library / Search tab layout,
 * carrying no catalogue -- every tab reads empty, since there is nothing to
 * play, browse or search.
 *
 * Dark on dark, unlike Notes, Phone and Messages: the real app is dark by
 * default, so this one needs no light-screen palette override, only its own
 * red tint in place of iOS's usual blue.
 */
export function MusicApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const [tab, setTab] = useState<TabName>('Home');

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);
  const active = TABS.find((t) => t.name === tab)!;

  return (
    <group>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={BACKDROP} toneMapped={false} />
      </mesh>

      <group position={[0, 0, LAYER * 7]}>
        <StatusBar />
      </group>

      <NavBack onPress={closeApp} />

      {tab === 'Search' ? <SearchTab /> : <ListTab title={tab} message={active.empty} />}

      <TabBar active={tab} onSelect={setTab} />

      {/* A second way back to the home screen, as on the lock screen's own
          apps: the indicator is always reachable even if a future tab ever
          scrolls the nav bar out of view. */}
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
