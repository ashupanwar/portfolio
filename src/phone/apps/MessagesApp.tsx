import { useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONVERSATIONS, DESIGN, LAYER, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

/** Messages is a light app on a dark system, so it carries its own palette. */
const PAPER = '#ffffff';
const INK = '#1c1c1e';
const MUTED = '#8a8a8e';
const RULE = '#e4e2dc';
/** iOS Messages' tint. */
const BLUE = '#0a84ff';
/** Received-bubble fill, as in iMessage. */
const BUBBLE = '#e9e9eb';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const RIGHT = DESIGN.width / 2 - PAD;
const NAV_Y = 352;
const TITLE_Y = 306;
const SEARCH_Y = 265;
const SEARCH_HEIGHT = 34;
const ROW_HEIGHT = 74;
const LIST_TOP = SEARCH_Y - SEARCH_HEIGHT / 2 - ROW_HEIGHT / 2 - 10;
const AVATAR = 52;
const SEND_BUTTON = 32;
const SEND_GAP = 10;

/** Square with a pencil across it, the compose control. */
function ComposeIcon({ color }: { color: string }) {
  const frame = useMemo(() => roundedRectGeometry(16, 16, 3.5), []);
  const pencil = useMemo(() => roundedRectGeometry(3.4, 15, 1.4), []);
  return (
    <group>
      <mesh geometry={frame}>
        <meshBasicMaterial color={color} transparent opacity={0.45} toneMapped={false} />
      </mesh>
      <mesh geometry={pencil} position={[3, 3, LAYER]} rotation={[0, 0, -Math.PI / 4]}>
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

/** Circular initials avatar, standing in for a contact photo. */
function Avatar({ initials, size = AVATAR }: { initials: string; size?: number }) {
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
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {initials}
      </Text>
    </group>
  );
}

function ConversationRow({
  conversation,
  index,
}: {
  conversation: (typeof CONVERSATIONS)[number];
  index: number;
}) {
  const rule = useMemo(() => roundedRectGeometry(DESIGN.width - PAD - AVATAR - 12, 1, 0.5), []);
  const hit = useMemo(() => roundedRectGeometry(DESIGN.width, ROW_HEIGHT, 0), []);
  const openThread = usePhone((s) => s.openThread);
  const top = LIST_TOP - index * ROW_HEIGHT;
  const textLeft = LEFT + AVATAR + 12;
  const last = conversation.messages[conversation.messages.length - 1];

  return (
    <group position={[0, top, LAYER]}>
      <mesh
        geometry={hit}
        position={[0, 0, LAYER * 2]}
        onClick={(event) => {
          event.stopPropagation();
          openThread(index);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group position={[LEFT + AVATAR / 2, 0, 0]}>
        <Avatar initials={conversation.initials} />
      </group>

      <Text
        font={FONT_SEMIBOLD}
        position={[textLeft, 13, 0]}
        fontSize={15.5}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        {conversation.name}
      </Text>

      <Text
        font={FONT}
        position={[textLeft, -11, 0]}
        fontSize={13}
        color={MUTED}
        anchorX="left"
        anchorY="middle"
      >
        {last}
      </Text>

      <Text
        font={FONT}
        position={[RIGHT, 13, 0]}
        fontSize={12.5}
        color={MUTED}
        anchorX="right"
        anchorY="middle"
      >
        {conversation.time}
      </Text>

      <mesh geometry={rule} position={[textLeft + (DESIGN.width - PAD - AVATAR - 12) / 2 - PAD, -ROW_HEIGHT / 2, 0]}>
        <meshBasicMaterial color={RULE} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A single received bubble, sized to roughly hug its text. */
function Bubble({ text, top }: { text: string; top: number }) {
  const width = THREE.MathUtils.clamp(text.length * 7.6 + 34, 70, 270);
  const geometry = useMemo(() => roundedRectGeometry(width, 38, 19), [width]);

  return (
    <group position={[LEFT + width / 2, top, LAYER]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={BUBBLE} toneMapped={false} />
      </mesh>
      <Text
        font={FONT}
        position={[0, 0, LAYER]}
        fontSize={14.5}
        color={INK}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}

/** The opened thread: contact header and its message bubbles. */
function Thread({ conversation }: { conversation: (typeof CONVERSATIONS)[number] }) {
  const closeThread = usePhone((s) => s.closeThread);
  const BUBBLE_GAP = 46;
  const TIMESTAMP_Y = 332;
  const AVATAR_Y = 296;
  const NAME_Y = 268;
  const firstBubbleY = 228;

  /** Upward-pointing arrow, the send glyph. Symmetric about the origin so it
   *  drops straight into the button circle with no manual centring. */
  const sendArrow = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 6);
    shape.lineTo(-5, -1);
    shape.lineTo(-1.8, -1);
    shape.lineTo(-1.8, -6);
    shape.lineTo(1.8, -6);
    shape.lineTo(1.8, -1);
    shape.lineTo(5, -1);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group>
      <NavBack label="Messages" onPress={closeThread} />

      <Text
        font={FONT}
        position={[0, TIMESTAMP_Y, LAYER]}
        fontSize={11}
        color={MUTED}
        anchorX="center"
        anchorY="middle"
      >
        {`Today ${conversation.time}`}
      </Text>

      <group position={[0, AVATAR_Y, LAYER]}>
        <Avatar initials={conversation.initials} size={40} />
      </group>
      <Text
        font={FONT}
        position={[0, NAME_Y, LAYER]}
        fontSize={12}
        color={MUTED}
        anchorX="center"
        anchorY="middle"
      >
        {conversation.name}
      </Text>

      {conversation.messages.map((text, index) => (
        <Bubble key={index} text={text} top={firstBubbleY - index * BUBBLE_GAP} />
      ))}

      {/* Static iMessage-style composer, non-interactive. Sits well clear of
          the home indicator rather than crowding it. */}
      <group position={[0, -DESIGN.height / 2 + 54, LAYER]}>
        <mesh
          geometry={useMemo(
            () => roundedRectGeometry(RIGHT - LEFT - SEND_BUTTON - SEND_GAP, 36, 18),
            [],
          )}
          position={[LEFT + (RIGHT - LEFT - SEND_BUTTON - SEND_GAP) / 2, 0, 0]}
        >
          <meshBasicMaterial color="#f0f0f2" toneMapped={false} />
        </mesh>
        <Text
          font={FONT}
          position={[LEFT + 16, 0, LAYER]}
          fontSize={13}
          color={MUTED}
          anchorX="left"
          anchorY="middle"
        >
          iMessage
        </Text>

        <group position={[RIGHT - SEND_BUTTON / 2, 0, LAYER]}>
          <mesh>
            <circleGeometry args={[SEND_BUTTON / 2, 32]} />
            <meshBasicMaterial color={BLUE} toneMapped={false} />
          </mesh>
          <mesh geometry={sendArrow} position={[0, 0, LAYER]}>
            <meshBasicMaterial color={PAPER} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * The Messages app: iOS's conversation list plus a pushed thread view,
 * carrying a single conversation.
 *
 * A light screen on an otherwise dark system, like Notes and Phone, tinted
 * blue rather than yellow or green to match the real app's own accent.
 */
export function MessagesApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const thread = usePhone((s) => s.thread);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const search = useMemo(
    () => roundedRectGeometry(DESIGN.width - PAD * 2, SEARCH_HEIGHT, 10),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);
  const composeHit = useMemo(() => roundedRectGeometry(44, 44, 8), []);

  const listRef = useRef<THREE.Group>(null);
  const detailRef = useRef<THREE.Group>(null);
  const push = useRef(0);

  /**
   * Keeps the last opened thread mounted while the detail slides back out --
   * `thread` goes null the instant you tap back, and rendering nothing would
   * make the outgoing screen vanish rather than leave.
   */
  const shown = useRef(0);
  if (thread !== null) shown.current = thread;

  useFrame(() => {
    push.current += ((thread === null ? 0 : 1) - push.current) * 0.16;
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

        <group position={[RIGHT - 15, NAV_Y, LAYER]}>
          <mesh geometry={composeHit}>
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <ComposeIcon color={BLUE} />
        </group>

        <Text
          font={FONT_SEMIBOLD}
          position={[LEFT, TITLE_Y, LAYER]}
          fontSize={32}
          color={INK}
          anchorX="left"
          anchorY="middle"
        >
          Messages
        </Text>

        <group position={[0, SEARCH_Y, LAYER]}>
          <mesh geometry={search}>
            <meshBasicMaterial color="#ededea" toneMapped={false} />
          </mesh>
          <Text
            font={FONT}
            position={[LEFT + 12, 0, LAYER]}
            fontSize={13}
            color={MUTED}
            anchorX="left"
            anchorY="middle"
          >
            Search
          </Text>
        </group>

        {CONVERSATIONS.map((conversation, index) => (
          <ConversationRow key={conversation.name} conversation={conversation} index={index} />
        ))}
      </group>

      {/* Parked off-screen right at rest; slid in by the frame loop. No
          background of its own -- shares the static paper mesh above, so its
          own rounded corners never have to travel under the screen's clip
          planes. */}
      <group ref={detailRef} position={[DESIGN.width, 0, LAYER * 3]}>
        <Thread conversation={CONVERSATIONS[shown.current]} />
      </group>

      <mesh geometry={indicator} position={[0, -DESIGN.height / 2 + 13, LAYER * 7]}>
        <meshBasicMaterial color={INK} transparent opacity={0.32} toneMapped={false} />
      </mesh>
    </group>
  );
}
