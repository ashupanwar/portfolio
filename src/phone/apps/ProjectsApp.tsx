import { Suspense, useMemo, useRef } from 'react';
import { Text, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { DESIGN, LAYER, PROJECTS, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT, FONT_SEMIBOLD } from '../typography';
import { useViewportClipping } from '../useViewportClipping';

/** Dark on dark, like Skills and Experience -- there is no real "Projects"
 *  app to clone, so this borrows the system's own default palette and tints
 *  its accents with the dock icon's own blue. */
const INK = '#ffffff';
const MUTED = '#98989d';
const BACKDROP = '#000000';
const CARD = '#1c1c1e';
const BLUE = '#2f6df6';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;
const TITLE_Y = 306;
const LIST_TOP = TITLE_Y - 40;
/** Where the scrollable list is clipped at the bottom, clear of the home
 *  indicator. */
const LIST_BOTTOM = -DESIGN.height / 2 + 50;
/** Matches the screen's own rounded corners. */
const SCREEN_RADIUS = 0.17 * DESIGN.width;

const CARD_GAP = 16;
const CARD_W = DESIGN.width - PAD * 2;
const CARD_R = 16;
const BANNER_H = CARD_W * 0.52;
const NAME_H = 44;
const CARD_H = BANNER_H + NAME_H;
const ROW = CARD_H + CARD_GAP;
const CONTENT_HEIGHT = PROJECTS.length * ROW - CARD_GAP;
const MAX_SCROLL = Math.max(0, CONTENT_HEIGHT - (LIST_TOP - LIST_BOTTOM));

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

/** Small arrow, hinting that a tap leaves the phone for the real site. */
function ExternalArrow({ color }: { color: string }) {
  const bar = useMemo(() => roundedRectGeometry(9, 1.8, 0.9), []);
  return (
    <group rotation={[0, 0, -Math.PI / 4]}>
      <mesh geometry={bar}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={bar} position={[3.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={bar} position={[0, 3.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A project's screenshot, centre-cropped to the banner's own aspect --
 *  "cover" fit, same trick as the Photos app's grid thumbnails. Cloned
 *  before mutating repeat/offset, since `useTexture` caches by URL. */
function Banner({ src }: { src: string }) {
  const source = useTexture(src);
  const image = source.image as HTMLImageElement;
  const imageAspect = image.width / image.height;
  const bannerAspect = CARD_W / BANNER_H;

  const texture = useMemo(() => {
    const clone = source.clone();
    if (imageAspect > bannerAspect) {
      clone.repeat.set(bannerAspect / imageAspect, 1);
      clone.offset.set((1 - bannerAspect / imageAspect) / 2, 0);
    } else {
      clone.repeat.set(1, imageAspect / bannerAspect);
      clone.offset.set(0, (1 - imageAspect / bannerAspect) / 2);
    }
    clone.wrapS = clone.wrapT = THREE.ClampToEdgeWrapping;
    clone.needsUpdate = true;
    return clone;
  }, [source, imageAspect, bannerAspect]);

  return (
    <mesh>
      <planeGeometry args={[CARD_W, BANNER_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** One card: a screenshot (or a plain accent banner while one isn't added
 *  yet) and the project's name, opening the real site in a new tab on tap.
 *  The two iOS apps carry no `url`, so they're a display only, like a
 *  business card rather than a link. Suppresses its own tap if the pointer
 *  moved first -- otherwise a drag-to-scroll that starts on a card also
 *  fires its click at release. */
function ProjectCard({
  project,
  top,
  dragged,
}: {
  project: (typeof PROJECTS)[number];
  top: number;
  dragged: React.RefObject<boolean>;
}) {
  const card = useMemo(() => roundedRectGeometry(CARD_W, CARD_H, CARD_R), []);
  const banner = useMemo(() => roundedRectGeometry(CARD_W, BANNER_H, CARD_R), []);
  const y = top - CARD_H / 2;

  return (
    <group position={[0, y, LAYER]}>
      <mesh geometry={card}>
        <meshBasicMaterial color={CARD} toneMapped={false} />
      </mesh>

      {project.url && (
        <mesh
          geometry={card}
          position={[0, 0, LAYER]}
          onClick={(event) => {
            event.stopPropagation();
            if (dragged.current) return;
            window.open(project.url!, '_blank', 'noopener,noreferrer');
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <group position={[0, CARD_H / 2 - BANNER_H / 2, LAYER]}>
        {project.image ? (
          <Suspense fallback={null}>
            <Banner src={project.image} />
          </Suspense>
        ) : (
          <mesh geometry={banner}>
            <meshBasicMaterial color={BLUE} toneMapped={false} />
          </mesh>
        )}
        {!project.image && (
          <Text
            font={FONT_SEMIBOLD}
            position={[0, 0, LAYER]}
            fontSize={18}
            color={INK}
            anchorX="center"
            anchorY="middle"
            maxWidth={CARD_W - 40}
          >
            {project.name}
          </Text>
        )}
      </group>

      <Text
        font={FONT_SEMIBOLD}
        position={[-CARD_W / 2 + 16, -CARD_H / 2 + NAME_H / 2, LAYER]}
        fontSize={14.5}
        color={INK}
        anchorX="left"
        anchorY="middle"
        maxWidth={CARD_W - 60}
      >
        {project.name}
      </Text>

      {project.url && (
        <group position={[CARD_W / 2 - 24, -CARD_H / 2 + NAME_H / 2, LAYER]}>
          <ExternalArrow color={MUTED} />
        </group>
      )}
    </group>
  );
}

/**
 * The Projects app: a scrollable column of full-width cards, one per thing
 * built, each opening the real site in a new tab -- except the two iOS
 * apps, which have no public page to send you to.
 *
 * Six cards at this height run well past one screen, so the list drags
 * vertically -- the same "grab and pull" gesture as the lock screen's own
 * swipe, just repurposed for scroll instead of unlock.
 */
export function ProjectsApp() {
  const closeApp = usePhone((s) => s.closeApp);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, SCREEN_RADIUS),
    [],
  );
  const catcher = useMemo(() => roundedRectGeometry(DESIGN.width, DESIGN.height, 0), []);
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);

  const screenRef = useRef<THREE.Group>(null);
  const listRef = useRef<THREE.Group>(null);
  const scroll = useRef(0);
  const drag = useRef({ active: false, startY: 0, startScroll: 0 });
  const dragged = useRef(false);

  useFrame(() => {
    if (listRef.current) listRef.current.position.y += (scroll.current - listRef.current.position.y) * 0.3;
  });

  useViewportClipping(screenRef, listRef, { top: LIST_TOP, bottom: LIST_BOTTOM });

  function localY(event: ThreeEvent<PointerEvent>) {
    return event.object.worldToLocal(event.point.clone()).y;
  }

  let cursor = LIST_TOP;
  const positioned = PROJECTS.map((project) => {
    const top = cursor;
    cursor -= ROW;
    return { project, top };
  });

  return (
    <group ref={screenRef}>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={BACKDROP} toneMapped={false} />
      </mesh>

      <group ref={listRef}>
        {positioned.map(({ project, top }) => (
          <ProjectCard key={project.name} project={project} top={top} dragged={dragged} />
        ))}
      </group>

      {/* Chrome above the scrolling list, on its own layer so it never
          slides with the cards. */}
      <group position={[0, 0, LAYER * 7]}>
        <StatusBar />
      </group>
      <NavBack onPress={closeApp} />
      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, LAYER * 7]}
        fontSize={32}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        Projects
      </Text>

      {/* Invisible drag catcher, above the cards so it intercepts the drag
          start everywhere -- including on top of a card -- and below the
          nav chrome. */}
      <mesh
        geometry={catcher}
        position={[0, 0, LAYER * 6]}
        onPointerDown={(event) => {
          event.stopPropagation();
          drag.current = { active: true, startY: localY(event), startScroll: scroll.current };
          dragged.current = false;
        }}
        onPointerMove={(event) => {
          if (!drag.current.active) return;
          const delta = localY(event) - drag.current.startY;
          if (Math.abs(delta) > 4) dragged.current = true;
          scroll.current = THREE.MathUtils.clamp(drag.current.startScroll + delta, 0, MAX_SCROLL);
        }}
        onPointerUp={() => {
          drag.current.active = false;
        }}
        onPointerLeave={() => {
          drag.current.active = false;
        }}
        onClick={(event) => {
          if (dragged.current) event.stopPropagation();
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

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
