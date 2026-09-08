import { useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import { roundedRectGeometry } from '../shapes';
import { DESIGN, EXPERIENCE, LAYER, usePhone } from '../usePhone';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

/** Dark on dark, like Music and Skills -- there is no real "Experience" app
 *  to clone, so this borrows the system's own default palette and tints its
 *  accents with the dock icon's own amber. */
const INK = '#ffffff';
const MUTED = '#98989d';
const BACKDROP = '#000000';
const CARD = '#1c1c1e';
const RULE = '#2c2c2e';
const AMBER = '#e8a13a';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;
const TITLE_Y = 306;
const LIST_TOP = TITLE_Y - 56;
const CARD_GAP = 14;
const CARD_W = DESIGN.width - PAD * 2;
const CARD_PAD_X = 16;

const COLLAPSED_H = 74;
const BULLET_FONT = 12;
const BULLET_LINE = 16;
const BULLET_GAP = 8;
/** Roughly how many characters this card's body copy fits per line at its
 *  font size and width -- enough to budget an expanded card's height without
 *  waiting on troika's own async text layout. */
const CHARS_PER_LINE = 48;

function estimateLines(text: string) {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
}

function bulletsHeight(highlights: readonly string[]) {
  const lines = highlights.reduce((sum, text) => sum + estimateLines(text), 0);
  return lines * BULLET_LINE + (highlights.length - 1) * BULLET_GAP;
}

function expandedHeight(highlights: readonly string[]) {
  return COLLAPSED_H + 14 + bulletsHeight(highlights) + 18;
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
        <BackChevron color={AMBER} />
      </group>
      <Text
        font={FONT}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={AMBER}
        anchorX="left"
        anchorY="middle"
      >
        Back
      </Text>
    </group>
  );
}

/** Downward chevron that flips to point up once its card is expanded. */
function ExpandChevron({ open }: { open: boolean }) {
  const bar = useMemo(() => roundedRectGeometry(8, 2, 1), []);
  return (
    <group rotation={[0, 0, open ? Math.PI : 0]}>
      <mesh geometry={bar} position={[-2.4, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <meshBasicMaterial color={MUTED} toneMapped={false} />
      </mesh>
      <mesh geometry={bar} position={[2.4, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <meshBasicMaterial color={MUTED} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** One bulleted highlight: a small dot marker and its wrapped text. */
function Highlight({ text, top }: { text: string; top: number }) {
  const dot = useMemo(() => roundedRectGeometry(3.4, 3.4, 1.7), []);
  return (
    <group position={[0, top, 0]}>
      <mesh geometry={dot} position={[-CARD_W / 2 + CARD_PAD_X + 4, -BULLET_LINE / 2 + 2, 0]}>
        <meshBasicMaterial color={AMBER} toneMapped={false} />
      </mesh>
      <Text
        font={FONT}
        position={[-CARD_W / 2 + CARD_PAD_X + 14, 0, 0]}
        fontSize={BULLET_FONT}
        color={MUTED}
        anchorX="left"
        anchorY="top"
        lineHeight={1.35}
        maxWidth={CARD_W - CARD_PAD_X * 2 - 14}
      >
        {text}
      </Text>
    </group>
  );
}

/**
 * One role: a heading (title, company, dates) always visible, and its
 * highlights revealed below when tapped. Full-width, so the card itself --
 * not a grid cell -- is the unit of the list.
 */
function ExperienceCard({
  role,
  centerY,
  height,
  open,
  onToggle,
}: {
  role: (typeof EXPERIENCE)[number];
  centerY: number;
  height: number;
  open: boolean;
  onToggle: () => void;
}) {
  const card = useMemo(() => roundedRectGeometry(CARD_W, height, 18), [height]);
  const hit = useMemo(() => roundedRectGeometry(CARD_W, height, 18), [height]);
  const divider = useMemo(() => roundedRectGeometry(CARD_W - CARD_PAD_X * 2, 1, 0.5), []);
  const top = height / 2;
  const dividerY = top - COLLAPSED_H + 8;

  let bulletTop = dividerY - 14;
  const bullets = role.highlights.map((text) => {
    const node = { text, top: bulletTop };
    bulletTop -= estimateLines(text) * BULLET_LINE + BULLET_GAP;
    return node;
  });

  return (
    <group position={[0, centerY, LAYER]}>
      <mesh geometry={card}>
        <meshBasicMaterial color={CARD} toneMapped={false} />
      </mesh>

      <mesh
        geometry={hit}
        position={[0, 0, LAYER]}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Text
        font={FONT_SEMIBOLD}
        position={[-CARD_W / 2 + CARD_PAD_X, top - 16, LAYER]}
        fontSize={16}
        color={INK}
        anchorX="left"
        anchorY="top"
        maxWidth={CARD_W - CARD_PAD_X * 2 - 24}
      >
        {role.position}
      </Text>

      <Text
        font={FONT}
        position={[-CARD_W / 2 + CARD_PAD_X, top - 42, LAYER]}
        fontSize={12.5}
        color={MUTED}
        anchorX="left"
        anchorY="top"
        maxWidth={CARD_W - CARD_PAD_X * 2}
      >
        {`${role.company} · ${role.location} · ${role.startDate} – ${role.endDate}`}
      </Text>

      <group position={[CARD_W / 2 - CARD_PAD_X - 4, top - 22, LAYER]}>
        <ExpandChevron open={open} />
      </group>

      {open && (
        <group>
          <mesh geometry={divider} position={[0, dividerY, LAYER]}>
            <meshBasicMaterial color={RULE} toneMapped={false} />
          </mesh>
          {bullets.map((bullet) => (
            <Highlight key={bullet.text} text={bullet.text} top={bullet.top} />
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * The Experience app: a single column of full-width role cards, each
 * expanding in place to show its highlights when tapped.
 */
export function ExperienceApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const [open, setOpen] = useState<boolean[]>(() => EXPERIENCE.map(() => false));

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);

  let cursor = LIST_TOP;
  const positioned = EXPERIENCE.map((role, index) => {
    const height = open[index] ? expandedHeight(role.highlights) : COLLAPSED_H;
    const centerY = cursor - height / 2;
    cursor -= height + CARD_GAP;
    return { role, index, centerY, height };
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

      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, LAYER]}
        fontSize={32}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        Experience
      </Text>

      {positioned.map(({ role, index, centerY, height }) => (
        <ExperienceCard
          key={role.company}
          role={role}
          centerY={centerY}
          height={height}
          open={open[index]}
          onToggle={() =>
            setOpen((prev) => prev.map((value, i) => (i === index ? !value : value)))
          }
        />
      ))}

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
