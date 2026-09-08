import { Suspense, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SVGLoader, type SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js';
import { asset } from '../../lib/asset';
import { DESIGN, LAYER, SKILLS, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';

/** Dark on dark, like Music and Camera -- there is no real "Skills" app to
 *  clone, so this borrows the system's own default palette and tints its
 *  accents with the dock icon's own green. */
const INK = '#ffffff';
const BACKDROP = '#000000';
const CARD = '#1c1c1e';
const GREEN = '#34b56a';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;
const TITLE_Y = 306;

const GRID_GAP = 14;
/** Two columns, fixed -- a third would not fit this screen's width at a
 *  legible card size, so the grid stays 2-wide as the list grows. */
const COLUMNS = 2;
const CARD_W = (DESIGN.width - PAD * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
const CARD_H = 68;
/** Width reserved for the mark, so every card's name starts at the same x
 *  regardless of how wide that skill's own logo happens to be. */
const MARK_BOX = 44;
const MARK_SIZE = 30;
const GRID_TOP = TITLE_Y - 68;
const COLUMN_X = Array.from(
  { length: COLUMNS },
  (_, col) => LEFT + CARD_W / 2 + col * (CARD_W + GRID_GAP),
);

/** Where each skill's own logo lives -- fetched from Simple Icons into
 *  public/icons/skills/. */
const ICON_FILES: Record<string, string> = {
  react: 'react.svg',
  next: 'nextjs.svg',
  typescript: 'typescript.svg',
  javascript: 'javascript.svg',
  three: 'threejs.svg',
  node: 'nodejs.svg',
  tailwind: 'tailwindcss.svg',
  html5: 'html5.svg',
  css3: 'css3.svg',
  git: 'git.svg',
};

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
        <BackChevron color={GREEN} />
      </group>
      <Text
        font={FONT}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={GREEN}
        anchorX="left"
        anchorY="middle"
      >
        Back
      </Text>
    </group>
  );
}

/**
 * A skill's real logo, loaded from its own SVG and rendered as filled vector
 * shapes rather than a raster texture -- consistent with how every other
 * glyph on this phone is drawn, and crisp regardless of camera distance.
 *
 * SVG space is 24x24 with y pointing down; flipping the outer group's y
 * scale and re-centring on the inner one converts that into this scene's
 * centred, y-up convention.
 */
function SvgGlyph({ file, color, size }: { file: string; color: string; size: number }) {
  const svg = useLoader(SVGLoader, asset(`/icons/skills/${file}`)) as SVGResult;
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

/** One card: a skill's real logo, and its full name beside it. Purely a
 *  display grid -- there is nothing behind a tap. */
function SkillCard({ skill, index }: { skill: (typeof SKILLS)[number]; index: number }) {
  const card = useMemo(() => roundedRectGeometry(CARD_W, CARD_H, 16), []);
  const row = Math.floor(index / COLUMNS);
  const col = index % COLUMNS;
  const x = COLUMN_X[col];
  const y = GRID_TOP - row * (CARD_H + GRID_GAP) - CARD_H / 2;

  return (
    <group position={[x, y, LAYER]}>
      <mesh geometry={card}>
        <meshBasicMaterial color={CARD} toneMapped={false} />
      </mesh>

      <group position={[-CARD_W / 2 + 14 + MARK_BOX / 2, 0, LAYER]}>
        <Suspense fallback={null}>
          <SvgGlyph file={ICON_FILES[skill.icon]} color={skill.color} size={MARK_SIZE} />
        </Suspense>
      </group>

      <Text
        font={FONT}
        position={[-CARD_W / 2 + 14 + MARK_BOX + 12, 0, LAYER]}
        fontSize={13.5}
        color={INK}
        anchorX="left"
        anchorY="middle"
        maxWidth={CARD_W - MARK_BOX - 14 - 12 - 10}
      >
        {skill.name}
      </Text>
    </group>
  );
}

/** The Skills app: a 2-column grid of cards, one per technology, with
 *  nothing behind any of them to open -- it is a display case, not a
 *  browser. */
export function SkillsApp() {
  const closeApp = usePhone((s) => s.closeApp);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);

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
        Skills
      </Text>

      {SKILLS.map((skill, index) => (
        <SkillCard key={skill.name} skill={skill} index={index} />
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
