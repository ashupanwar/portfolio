import { useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESIGN, LAYER, NOTES, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD, NOTES_YELLOW } from '../typography';

/** Notes is a light app on a dark system, so it carries its own palette. */
const PAPER = '#fbfaf7';
const INK = '#1c1c1e';
const MUTED = '#8a8a8e';
const RULE = '#e4e2dc';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;

const SEARCH_Y = 265;
const SEARCH_HEIGHT = 34;
const ROW_HEIGHT = 62;

/**
 * Row text placement, solved rather than nudged.
 *
 * A row spans +/- ROW_HEIGHT/2 about its origin, with the separator on the
 * bottom boundary. The title's cap extends ~5.5pt above its centre and the
 * snippet's ~4.5pt below its own, so for equal padding P at both ends with a
 * 19pt gap between the two lines:
 *
 *   titleY  =  ROW_HEIGHT/2 - 5.5 - P
 *   snippetY = -ROW_HEIGHT/2 + 4.5 + P
 *
 * which for a 19pt gap gives P = 16.5.
 */
const ROW_PADDING = 16.5;
const TITLE_Y = ROW_HEIGHT / 2 - 5.5 - ROW_PADDING;
const SNIPPET_Y = -ROW_HEIGHT / 2 + 4.5 + ROW_PADDING;

/**
 * First row placed so its top boundary lands on the search field's bottom edge.
 * The first note then gets the same ROW_PADDING above it as every later note
 * gets below its separator, without that padding being written down twice.
 */
const LIST_TOP = SEARCH_Y - SEARCH_HEIGHT / 2 - ROW_HEIGHT / 2;

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
        <BackChevron color={NOTES_YELLOW} />
      </group>
      <Text
        font={FONT}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={NOTES_YELLOW}
        anchorX="left"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

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

function NoteRow({ note, index }: { note: (typeof NOTES)[number]; index: number }) {
  const rule = useMemo(() => roundedRectGeometry(DESIGN.width - PAD, 1, 0.5), []);
  const hit = useMemo(() => roundedRectGeometry(DESIGN.width, ROW_HEIGHT, 0), []);
  const openNote = usePhone((s) => s.openNote);
  const top = LIST_TOP - index * ROW_HEIGHT;

  return (
    <group position={[0, top, LAYER]}>
      {/* Whole row is the target, as in iOS -- not just the title. */}
      <mesh
        geometry={hit}
        position={[0, 0, LAYER * 2]}
        onClick={(event) => {
          event.stopPropagation();
          openNote(index);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, 0]}
        fontSize={15.5}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        {note.title}
      </Text>

      <Text
        font={FONT}
        position={[LEFT, SNIPPET_Y, 0]}
        fontSize={12.5}
        color={MUTED}
        anchorX="left"
        anchorY="middle"
      >
        {`${note.short}   ${note.snippet}`}
      </Text>

      {/* On the row's bottom boundary, so consecutive rows share their edge and
          the padding above and below the text stays equal.
          Stops short of the left edge, as iOS insets its separators. */}
      <mesh geometry={rule} position={[PAD / 2, -ROW_HEIGHT / 2, 0]}>
        <meshBasicMaterial color={RULE} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The opened note: date, title, body. */
function NoteDetail({ note }: { note: (typeof NOTES)[number] }) {
  const closeNote = usePhone((s) => s.closeNote);

  return (
    <group>
      <NavBack label="Notes" onPress={closeNote} />

      <Text
        font={FONT}
        position={[0, 306, LAYER]}
        fontSize={11.5}
        color={MUTED}
        anchorX="center"
        anchorY="middle"
      >
        {note.date}
      </Text>

      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, 272, LAYER]}
        fontSize={23}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        {note.title}
      </Text>

      <Text
        font={FONT}
        position={[LEFT, 240, LAYER]}
        fontSize={13}
        color={INK}
        anchorX="left"
        anchorY="top"
        maxWidth={DESIGN.width - PAD * 2}
        lineHeight={1.55}
      >
        {note.body}
      </Text>
    </group>
  );
}

/**
 * The Notes app: iOS's list view plus a pushed detail view, carrying this
 * portfolio's own content.
 *
 * Deliberately a light screen on an otherwise dark system -- it is the app's
 * identity, and it is also what forced StatusBar to take a colour, since white
 * status text vanishes on paper.
 */
export function NotesApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const note = usePhone((s) => s.note);

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

  /**
   * Keeps the last opened note mounted while the detail slides back out --
   * `note` goes null the instant you tap back, and rendering nothing would
   * make the outgoing screen vanish rather than leave.
   */
  const shown = useRef(0);
  if (note !== null) shown.current = note;

  useFrame(() => {
    push.current += ((note === null ? 0 : 1) - push.current) * 0.16;
    const p = push.current * push.current * (3 - 2 * push.current);

    // Position only, no opacity: PhoneUI's fade writes opacity across this whole
    // subtree every frame, so anything set here would be overwritten. Sliding
    // works regardless, and the screen's clip planes hide whatever leaves.
    //
    // The list travels a full screen width rather than parallaxing part way,
    // because nothing opaque moves across to cover it -- see the note on the
    // shared background below.
    if (listRef.current) listRef.current.position.x = -p * DESIGN.width;
    if (detailRef.current) detailRef.current.position.x = (1 - p) * DESIGN.width;
  });

  return (
    <group>
      {/* The only thing that establishes the screen's rounded corners, and it
          never moves. Both the list and the detail draw onto it. */}
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>

      {/* Chrome both views share, above them in z so the pushed detail slides
          under it rather than over it. */}
      <group position={[0, 0, LAYER * 7]}>
        <StatusBar color={INK} />
      </group>

      <group ref={listRef}>
        {/* Labelled "Back" rather than iOS's "Folders": there is no folder list
            above Notes here, so naming one would promise a screen that does not
            exist. */}
        <NavBack label="Back" onPress={closeApp} />

        <Text
          font={FONT_SEMIBOLD}
          position={[LEFT, 306, LAYER]}
          fontSize={32}
          color={INK}
          anchorX="left"
          anchorY="middle"
        >
          Notes
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

        {NOTES.map((entry, index) => (
          <NoteRow key={entry.title} note={entry} index={index} />
        ))}

        <Text
          font={FONT}
          position={[0, -DESIGN.height / 2 + 46, LAYER]}
          fontSize={12}
          color={MUTED}
          anchorX="center"
          anchorY="middle"
        >
          {`${NOTES.length} Notes`}
        </Text>
        <group position={[DESIGN.width / 2 - PAD - 8, -DESIGN.height / 2 + 46, LAYER]}>
          <ComposeIcon color={NOTES_YELLOW} />
        </group>
      </group>

      {/* Parked off-screen right at rest; slid in by the frame loop.
          Deliberately has NO background of its own: it shares the static paper
          above. A full-bleed rounded rect sliding under the screen's straight
          clip planes exposes a square corner the moment its own rounded corner
          leaves the frame -- the same trap as the lock screen's wallpaper. With
          only text moving, the one thing defining the corners never moves. */}
      <group ref={detailRef} position={[DESIGN.width, 0, LAYER * 3]}>
        <NoteDetail note={NOTES[shown.current]} />
      </group>

      <mesh geometry={indicator} position={[0, -DESIGN.height / 2 + 13, LAYER * 7]}>
        <meshBasicMaterial color={INK} transparent opacity={0.32} toneMapped={false} />
      </mesh>
    </group>
  );
}
