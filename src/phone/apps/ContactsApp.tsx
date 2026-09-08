import { Suspense, useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SVGLoader, type SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js';
import { CONTACTS, DESIGN, LAYER, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';
import { asset } from '../../lib/asset';

/** Contacts is a light app on a dark system, like Notes, Phone and Messages. */
const PAPER = '#ffffff';
const INK = '#1c1c1e';
const MUTED = '#8a8a8e';
const RULE = '#e4e2dc';
/** iOS Contacts' own tint. */
const BLUE = '#0a84ff';
const GREEN = '#34c759';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;
const TITLE_Y = 306;
const SEARCH_Y = 265;
const SEARCH_HEIGHT = 34;
const SECTION_Y = SEARCH_Y - SEARCH_HEIGHT / 2 - 22;
const ROW_HEIGHT = 52;
const ROW_TOP = SECTION_Y - 34;
const AVATAR = 40;

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
function NavBack({ label, onPress }: { label: string; onPress: () => void }) {
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
        {label}
      </Text>
    </group>
  );
}

/** Magnifying glass, for the search field. */
function SearchGlyph({ color }: { color: string }) {
  const handle = useMemo(() => roundedRectGeometry(1.7, 5.2, 0.85), []);
  return (
    <group>
      <mesh>
        <ringGeometry args={[3.1, 4, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={handle} position={[3, -3, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Circular initials avatar, standing in for a contact photo. */
function Avatar({ initials, size }: { initials: string; size: number }) {
  return (
    <group>
      <mesh>
        <circleGeometry args={[size / 2, 32]} />
        <meshBasicMaterial color="#b6b8bd" toneMapped={false} />
      </mesh>
      <Text
        font={FONT_SEMIBOLD}
        position={[0, 0, LAYER]}
        fontSize={size * 0.34}
        color={PAPER}
        anchorX="center"
        anchorY="middle"
      >
        {initials}
      </Text>
    </group>
  );
}

/** Speech-bubble outline, for the Message action. */
function MessageGlyph({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 9;
    const h = 7;
    const r = 3;
    shape.moveTo(-w + r, h);
    shape.lineTo(w - r, h);
    shape.quadraticCurveTo(w, h, w, h - r);
    shape.lineTo(w, -h + r);
    shape.quadraticCurveTo(w, -h, w - r, -h);
    shape.lineTo(-2, -h);
    shape.lineTo(-5, -h - 4.5);
    shape.lineTo(-5, -h);
    shape.lineTo(-w + r, -h);
    shape.quadraticCurveTo(-w, -h, -w, -h + r);
    shape.lineTo(-w, h - r);
    shape.quadraticCurveTo(-w, h, -w + r, h);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry} scale={0.62}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/**
 * A real icon, loaded from its own SVG (Heroicons' solid set) and rendered
 * as filled vector shapes rather than a raster texture -- consistent with
 * how every other glyph on this phone is drawn, and crisp regardless of
 * camera distance. SVG space is 24x24 with y pointing down; flipping the
 * outer group's y scale and re-centring on the inner one converts that into
 * this scene's centred, y-up convention.
 */
function SvgGlyph({ file, color, size }: { file: string; color: string; size: number }) {
  const svg = useLoader(SVGLoader, asset(`/icons/contacts/${file}`)) as SVGResult;
  const geometries = useMemo(
    () =>
      svg.paths
        .flatMap((path: THREE.ShapePath) => path.toShapes())
        .map((shape: THREE.Shape) => new THREE.ShapeGeometry(shape)),
    [svg],
  );
  const scale = size / 24;

  return (
    <group scale={[scale, -scale, 1]}>
      <group position={[-12, -12, 0]}>
        {geometries.map((geometry, index) => (
          <mesh key={index} geometry={geometry}>
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** The Call action's real handset icon. Sized to match MessageGlyph's own
 *  pre-wrapper scale -- ActionButton applies a shared 1.9x on top of both. */
function CallGlyph({ color }: { color: string }) {
  return <SvgGlyph file="call.svg" color={color} size={12.5} />;
}

/** The Video action's real camera icon, sized the same way. */
function VideoGlyph({ color }: { color: string }) {
  return <SvgGlyph file="video.svg" color={color} size={12.5} />;
}

/** One of the three round action buttons under a contact's name. Cosmetic --
 *  there is nothing behind any of them to actually message, call or ring. */
function ActionButton({
  icon,
  label,
  px,
}: {
  icon: (color: string) => React.ReactNode;
  label: string;
  px: number;
}) {
  return (
    <group position={[px, 0, 0]}>
      <mesh>
        <circleGeometry args={[26, 40]} />
        <meshBasicMaterial color="#e3f7e8" toneMapped={false} />
      </mesh>
      <group position={[0, 0, LAYER]} scale={1.9}>
        <Suspense fallback={null}>{icon(GREEN)}</Suspense>
      </group>
      <Text
        font={FONT}
        position={[0, -40, 0]}
        fontSize={11.5}
        color={MUTED}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

/** The single row in the list -- alphabetised the way iOS does, under its
 *  own section letter, even though there is only ever one entry to sort. */
function ContactRow({ contact, index }: { contact: (typeof CONTACTS)[number]; index: number }) {
  const openContact = usePhone((s) => s.openContact);
  const hit = useMemo(() => roundedRectGeometry(DESIGN.width, ROW_HEIGHT, 0), []);
  const rule = useMemo(() => roundedRectGeometry(DESIGN.width - PAD - AVATAR - 12, 1, 0.5), []);
  const top = ROW_TOP - index * ROW_HEIGHT;
  const textLeft = LEFT + AVATAR + 12;

  return (
    <group position={[0, top, LAYER]}>
      <mesh
        geometry={hit}
        position={[0, 0, LAYER * 2]}
        onClick={(event) => {
          event.stopPropagation();
          openContact(index);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group position={[LEFT + AVATAR / 2, 0, 0]}>
        <Avatar initials={contact.initials} size={AVATAR} />
      </group>

      <Text
        font={FONT}
        position={[textLeft, 0, 0]}
        fontSize={16}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        {contact.name}
      </Text>

      <mesh
        geometry={rule}
        position={[textLeft + (DESIGN.width - PAD - AVATAR - 12) / 2 - PAD, -ROW_HEIGHT / 2, 0]}
      >
        <meshBasicMaterial color={RULE} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The opened card: avatar, name, phone number and the (inert) action row. */
function ContactCard({ contact }: { contact: (typeof CONTACTS)[number] }) {
  const closeContact = usePhone((s) => s.closeContact);
  const AVATAR_Y = 262;
  const NAME_Y = 186;
  const ACTIONS_Y = 122;
  const DIVIDER_Y = 56;
  const NUMBER_LABEL_Y = 32;
  const NUMBER_Y = 10;
  const divider = useMemo(() => roundedRectGeometry(DESIGN.width - PAD * 2, 1, 0.5), []);

  return (
    <group>
      <NavBack label="Contacts" onPress={closeContact} />

      <group position={[0, AVATAR_Y, LAYER]}>
        <Avatar initials={contact.initials} size={96} />
      </group>

      <Text
        font={FONT_SEMIBOLD}
        position={[0, NAME_Y, LAYER]}
        fontSize={24}
        color={INK}
        anchorX="center"
        anchorY="middle"
      >
        {contact.name}
      </Text>

      <group position={[0, ACTIONS_Y, LAYER]}>
        <ActionButton icon={(c) => <MessageGlyph color={c} />} label="message" px={-70} />
        <ActionButton icon={(c) => <CallGlyph color={c} />} label="call" px={0} />
        <ActionButton icon={(c) => <VideoGlyph color={c} />} label="video" px={70} />
      </group>

      <mesh geometry={divider} position={[0, DIVIDER_Y, LAYER]}>
        <meshBasicMaterial color={RULE} toneMapped={false} />
      </mesh>

      <Text
        font={FONT}
        position={[LEFT, NUMBER_LABEL_Y, LAYER]}
        fontSize={12}
        color={MUTED}
        anchorX="left"
        anchorY="middle"
      >
        mobile
      </Text>
      <Text
        font={FONT}
        position={[LEFT, NUMBER_Y, LAYER]}
        fontSize={16.5}
        color={BLUE}
        anchorX="left"
        anchorY="middle"
      >
        {contact.phoneDisplay}
      </Text>
    </group>
  );
}

/**
 * The Contacts app: iOS's own alphabetised list plus a pushed detail card,
 * carrying a single saved contact -- the one behind the phone itself.
 *
 * A light screen on an otherwise dark system, like Notes, Phone and
 * Messages, tinted blue to match those and the real app's own accent.
 */
export function ContactsApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const openIndex = usePhone((s) => s.contact);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const search = useMemo(
    () => roundedRectGeometry(DESIGN.width - PAD * 2, SEARCH_HEIGHT, 10),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);

  const listRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);
  const push = useRef(0);

  /** Keeps the last opened card mounted while the detail slides back out --
   *  see MessagesApp's own Thread for why. */
  const shown = useRef(0);
  if (openIndex !== null) shown.current = openIndex;

  useFrame(() => {
    push.current += ((openIndex === null ? 0 : 1) - push.current) * 0.16;
    const p = push.current * push.current * (3 - 2 * push.current);

    if (listRef.current) listRef.current.position.x = -p * DESIGN.width;
    if (detailRef.current) detailRef.current.position.x = (1 - p) * DESIGN.width;
  });

  return (
    <group>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>

      <group position={[0, 0, LAYER * 7]}>
        <StatusBar color={INK} />
      </group>

      <group ref={listRef}>
        <NavBack label="Back" onPress={closeApp} />

        <Text
          font={FONT_SEMIBOLD}
          position={[LEFT, TITLE_Y, LAYER]}
          fontSize={32}
          color={INK}
          anchorX="left"
          anchorY="middle"
        >
          Contacts
        </Text>

        <group position={[0, SEARCH_Y, LAYER]}>
          <mesh geometry={search}>
            <meshBasicMaterial color="#ededea" toneMapped={false} />
          </mesh>
          <group position={[LEFT + 20, 0, LAYER]}>
            <SearchGlyph color={MUTED} />
          </group>
          <Text
            font={FONT}
            position={[LEFT + 34, 0, LAYER]}
            fontSize={13}
            color={MUTED}
            anchorX="left"
            anchorY="middle"
          >
            Search
          </Text>
        </group>

        <Text
          font={FONT_SEMIBOLD}
          position={[LEFT, SECTION_Y, LAYER]}
          fontSize={13}
          color={MUTED}
          anchorX="left"
          anchorY="middle"
        >
          A
        </Text>

        {CONTACTS.map((contact, index) => (
          <ContactRow key={contact.name} contact={contact} index={index} />
        ))}
      </group>

      {/* Parked off-screen right at rest; slid in by the frame loop, exactly
          as MessagesApp's own Thread is. */}
      <group ref={detailRef} position={[DESIGN.width, 0, LAYER * 3]}>
        <ContactCard contact={CONTACTS[shown.current]} />
      </group>

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
