import { useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { DESIGN, LAYER, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

/** Phone is a light app on a dark system, so it carries its own palette. */
const PAPER = '#ffffff';
const INK = '#1c1c1e';
const MUTED = '#8a8a8e';
const RULE = '#e4e2dc';
/** iOS Phone's tint -- also the dock icon's fallback colour. */
const GREEN = '#34c759';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const RIGHT = DESIGN.width / 2 - PAD;
const TITLE_Y = 306;

const TAB_BAR_Y = -DESIGN.height / 2 + 47;
const DIVIDER_Y = TAB_BAR_Y + 36;

type TabName = 'Favorites' | 'Recents' | 'Contacts' | 'Keypad' | 'Voicemail';

const TABS: { name: TabName; empty: string }[] = [
  { name: 'Favorites', empty: 'No Favorites' },
  { name: 'Recents', empty: 'No Recent Calls' },
  { name: 'Contacts', empty: 'No Contacts' },
  { name: 'Keypad', empty: '' },
  { name: 'Voicemail', empty: 'No Voicemail' },
];

/** Five-point star, drawn as a Shape so it can sit flush with the other flat icons. */
function StarGlyph({ color, filled = true }: { color: string; filled?: boolean }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const spikes = 5;
    const outer = 9;
    const inner = 3.6;
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
      <meshBasicMaterial color={color} transparent opacity={filled ? 1 : 0.4} toneMapped={false} />
    </mesh>
  );
}

/** Clock face: ring plus two hands, for Recents. */
function ClockGlyph({ color }: { color: string }) {
  const hand = useMemo(() => roundedRectGeometry(1.6, 7, 0.8), []);
  return (
    <group>
      <mesh>
        <ringGeometry args={[7.2, 9, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={hand} position={[0, 2, 0]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={hand} position={[1.6, 0.4, 0]} rotation={[0, 0, -Math.PI / 2.4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Head-and-shoulders silhouette, for Contacts. */
function PersonGlyph({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 4, 0]}>
        <circleGeometry args={[4.6, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, -4.5, 0]}>
        <ringGeometry args={[6, 12, 32, 1, Math.PI, Math.PI]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** 3x3 dot grid, for Keypad. */
function KeypadGlyph({ color }: { color: string }) {
  return (
    <group>
      {[-1, 0, 1].map((row) =>
        [-1, 0, 1].map((col) => (
          <mesh key={`${row}-${col}`} position={[col * 6.5, row * 6.5, 0]}>
            <circleGeometry args={[2.1, 16]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Circle with a play triangle, for Voicemail. */
function VoicemailGlyph({ color }: { color: string }) {
  const triangle = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2.6, 3.2);
    shape.lineTo(-2.6, -3.2);
    shape.lineTo(3, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <group>
      <mesh>
        <ringGeometry args={[7.4, 9, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={triangle} position={[0.3, 0, 0]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Handset silhouette, for the call button. */
function HandsetGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-9, 5);
    shape.quadraticCurveTo(-11, 7, -9, 9);
    shape.quadraticCurveTo(-4, 14, 0, 10);
    shape.quadraticCurveTo(2, 8, 0, 6);
    shape.quadraticCurveTo(-2, 4, -4, 2);
    shape.quadraticCurveTo(-6, 0, -8, -4);
    shape.quadraticCurveTo(-10, -6, -8, -8);
    shape.quadraticCurveTo(-6, -10, -4, -8);
    shape.quadraticCurveTo(1, -3, 5, 3);
    shape.quadraticCurveTo(9, 8, 10, 12);
    shape.quadraticCurveTo(12, 14, 9, 15);
    shape.quadraticCurveTo(5, 16, 2, 12);
    shape.quadraticCurveTo(-3, 6, -9, 5);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry} rotation={[0, 0, -Math.PI / 4]} scale={0.72}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

const GLYPHS: Record<TabName, (color: string) => React.ReactNode> = {
  Favorites: (color) => <StarGlyph color={color} />,
  Recents: (color) => <ClockGlyph color={color} />,
  Contacts: (color) => <PersonGlyph color={color} />,
  Keypad: (color) => <KeypadGlyph color={color} />,
  Voicemail: (color) => <VoicemailGlyph color={color} />,
};

function TabBar({ active, onSelect }: { active: TabName; onSelect: (name: TabName) => void }) {
  const hit = useMemo(() => roundedRectGeometry(70, 50, 8), []);
  const columns = [-152, -76, 0, 76, 152];

  return (
    <group>
      <mesh
        geometry={useMemo(() => roundedRectGeometry(DESIGN.width - PAD, 1, 0.5), [])}
        position={[0, DIVIDER_Y, LAYER]}
      >
        <meshBasicMaterial color={RULE} toneMapped={false} />
      </mesh>

      {TABS.map((tab, index) => {
        const isActive = tab.name === active;
        const color = isActive ? GREEN : MUTED;
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

/** "All / Missed" segmented control. Purely cosmetic -- there is nothing to filter yet. */
function Segmented({ value, onChange }: { value: 'All' | 'Missed'; onChange: (v: 'All' | 'Missed') => void }) {
  const track = useMemo(() => roundedRectGeometry(150, 32, 8), []);
  const knob = useMemo(() => roundedRectGeometry(73, 28, 7), []);
  const knobX = value === 'All' ? -37.5 : 37.5;

  return (
    <group position={[0, 265, LAYER]}>
      <mesh geometry={track}>
        <meshBasicMaterial color="#ececea" toneMapped={false} />
      </mesh>
      <mesh geometry={knob} position={[knobX, 0, LAYER]}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>
      {(['All', 'Missed'] as const).map((label, index) => (
        <group key={label} position={[index === 0 ? -37.5 : 37.5, 0, LAYER * 2]}>
          <mesh
            geometry={roundedRectGeometry(73, 28, 7)}
            onClick={(event) => {
              event.stopPropagation();
              onChange(label);
            }}
          >
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <Text
            font={FONT_SEMIBOLD}
            position={[0, 0, LAYER]}
            fontSize={13}
            color={value === label ? INK : MUTED}
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** The list-style tabs (Favorites, Recents, Contacts, Voicemail): a title, and nothing under it. */
function ListTab({ title, message, showSegmented }: { title: string; message: string; showSegmented: boolean }) {
  const [filter, setFilter] = useState<'All' | 'Missed'>('All');

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
        position={[RIGHT, TITLE_Y, LAYER]}
        fontSize={16}
        color={GREEN}
        anchorX="right"
        anchorY="middle"
      >
        Edit
      </Text>

      {showSegmented && <Segmented value={filter} onChange={setFilter} />}

      <Text
        font={FONT}
        position={[0, 70, LAYER]}
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

const KEYS: { label: string; letters: string }[] = [
  { label: '1', letters: '' },
  { label: '2', letters: 'ABC' },
  { label: '3', letters: 'DEF' },
  { label: '4', letters: 'GHI' },
  { label: '5', letters: 'JKL' },
  { label: '6', letters: 'MNO' },
  { label: '7', letters: 'PQRS' },
  { label: '8', letters: 'TUV' },
  { label: '9', letters: 'WXYZ' },
  { label: '*', letters: '' },
  { label: '0', letters: '+' },
  { label: '#', letters: '' },
];

/** Round dial key with the digit over its letters, as on the stock keypad. */
function DialKey({ label, letters, px, py, onPress }: { label: string; letters: string; px: number; py: number; onPress: () => void }) {
  return (
    <group position={[px, py, LAYER]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
      >
        <circleGeometry args={[34, 40]} />
        <meshBasicMaterial color="#f2f2f0" toneMapped={false} />
      </mesh>
      <Text
        font={FONT}
        position={[0, letters ? 5 : 0, LAYER]}
        fontSize={26}
        color={INK}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      {letters && (
        <Text
          font={FONT_SEMIBOLD}
          position={[0, -13, LAYER]}
          fontSize={8.5}
          color={MUTED}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          {letters}
        </Text>
      )}
    </group>
  );
}

/** The Keypad tab: a number readout, the dial pad, and a call button -- all cosmetic. */
function KeypadTab() {
  const [dialed, setDialed] = useState('');
  const columns = [-88, 0, 88];
  const rows = [186, 118, 50, -18];

  return (
    <group>
      <Text
        font={FONT}
        position={[0, 300, LAYER]}
        fontSize={34}
        color={INK}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.02}
      >
        {dialed || ' '}
      </Text>

      {KEYS.map((key, index) => (
        <DialKey
          key={key.label}
          label={key.label}
          letters={key.letters}
          px={columns[index % 3]}
          py={rows[Math.floor(index / 3)]}
          onPress={() => setDialed((d) => (d + key.label).slice(0, 18))}
        />
      ))}

      <group position={[0, -96, LAYER]}>
        <mesh
          onClick={(event) => {
            event.stopPropagation();
            setDialed('');
          }}
        >
          <circleGeometry args={[32, 40]} />
          <meshBasicMaterial color={GREEN} toneMapped={false} />
        </mesh>
        <group position={[0, 0, LAYER]}>
          <HandsetGlyph color={PAPER} />
        </group>
      </group>
    </group>
  );
}

/**
 * The Phone app: iOS's tab layout -- Favorites, Recents, Contacts, Keypad,
 * Voicemail -- carrying no call history, since there is none to show.
 *
 * A light screen on an otherwise dark system, like Notes, and green-tinted
 * rather than yellow to match the real app's own accent.
 */
export function PhoneApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const [tab, setTab] = useState<TabName>('Recents');

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);
  const active = TABS.find((t) => t.name === tab)!;

  return (
    <group>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>

      <group position={[0, 0, LAYER * 7]}>
        <StatusBar color={INK} />
      </group>

      {tab === 'Keypad' ? (
        <KeypadTab />
      ) : (
        <ListTab title={tab} message={active.empty} showSegmented={tab === 'Recents'} />
      )}

      <TabBar active={tab} onSelect={setTab} />

      {/* Doubles as the way back to the home screen: the tab bar is a fixture
          of every root tab, so there is no in-app "Back" the way Notes has
          one. */}
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
