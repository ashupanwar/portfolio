import { Suspense, useMemo } from 'react';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { DESIGN, LAYER, PHOTOS, usePhone } from '../usePhone';
import { roundedRectGeometry } from '../shapes';
import { StatusBar } from '../screens';
import { FONT_SEMIBOLD } from '../typography';

/** Photos is a light app on a dark system, like Notes, Phone and Contacts. */
const PAPER = '#ffffff';
const INK = '#1c1c1e';
const BACKDROP = '#000000';

const PAD = 20;
const LEFT = -DESIGN.width / 2 + PAD;
const NAV_Y = 352;
const TITLE_Y = 306;

/** Edge-to-edge grid, the way iOS's own Photos tab lays out -- no outer
 *  margin, a hairline gap between cells. */
const COLUMNS = 3;
const GRID_GAP = 1.5;
const CELL = (DESIGN.width - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
const GRID_TOP = TITLE_Y - 56;

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
function NavBack({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
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
        <BackChevron color={color} />
      </group>
      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT + 16, 0, LAYER * 2]}
        fontSize={15}
        color={color}
        anchorX="left"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

/** One grid tile: the photo, centre-cropped to a square -- the same "cover"
 *  fit a CSS thumbnail grid would use, done here via the texture's own UVs
 *  rather than clipping geometry.
 *
 * `useTexture` caches by URL, so the same Texture object also backs the
 * full-screen Viewer -- mutating its repeat/offset in place would crop the
 * viewer's image too. Cloning here keeps the crop local to this tile. */
function Thumbnail({ photo, index }: { photo: (typeof PHOTOS)[number]; index: number }) {
  const openPhoto = usePhone((s) => s.openPhoto);
  const source = useTexture(photo.src);
  const hit = useMemo(() => roundedRectGeometry(CELL, CELL, 0), []);

  const image = source.image as HTMLImageElement;
  const aspect = image.width / image.height;
  const texture = useMemo(() => {
    const clone = source.clone();
    // Cover-fit: crop the longer axis so a square window of the image fills
    // the square tile with nothing showing outside it.
    if (aspect > 1) {
      clone.repeat.set(1 / aspect, 1);
      clone.offset.set((1 - 1 / aspect) / 2, 0);
    } else {
      clone.repeat.set(1, aspect);
      clone.offset.set(0, (1 - aspect) / 2);
    }
    clone.wrapS = clone.wrapT = THREE.ClampToEdgeWrapping;
    clone.needsUpdate = true;
    return clone;
  }, [source, aspect]);

  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const x = -DESIGN.width / 2 + CELL / 2 + col * (CELL + GRID_GAP);
  const y = GRID_TOP - CELL / 2 - row * (CELL + GRID_GAP);

  return (
    <mesh
      geometry={hit}
      position={[x, y, LAYER]}
      onClick={(event) => {
        event.stopPropagation();
        openPhoto(index);
      }}
    >
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** The full-screen viewer: the image contain-fit against a black backdrop,
 *  the way the real Photos app frames a shot that doesn't match the
 *  device's own aspect ratio. Uses the cached texture directly -- untouched
 *  by Thumbnail's crop, since that clones before mutating. */
function Viewer({ photo }: { photo: (typeof PHOTOS)[number] }) {
  const closePhoto = usePhone((s) => s.closePhoto);
  const texture = useTexture(photo.src);
  const image = texture.image as HTMLImageElement;
  const aspect = image.width / image.height;

  const width = Math.min(DESIGN.width, DESIGN.height * aspect);
  const height = width / aspect;
  const backdrop = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );

  return (
    <group>
      <mesh geometry={backdrop}>
        <meshBasicMaterial color={BACKDROP} toneMapped={false} />
      </mesh>

      <group position={[0, 0, LAYER * 7]}>
        <StatusBar />
      </group>

      <mesh position={[0, 0, LAYER]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      <NavBack label="Photos" color="#ffffff" onPress={closePhoto} />
    </group>
  );
}

/** The grid: a title and an edge-to-edge wall of square thumbnails. */
function Grid() {
  const closeApp = usePhone((s) => s.closeApp);

  return (
    <group>
      <group position={[0, 0, LAYER * 7]}>
        <StatusBar color={INK} />
      </group>

      <NavBack label="Back" color="#0a84ff" onPress={closeApp} />

      <Text
        font={FONT_SEMIBOLD}
        position={[LEFT, TITLE_Y, LAYER]}
        fontSize={32}
        color={INK}
        anchorX="left"
        anchorY="middle"
      >
        Photos
      </Text>

      <Suspense fallback={null}>
        {PHOTOS.map((photo, index) => (
          <Thumbnail key={photo.src} photo={photo} index={index} />
        ))}
      </Suspense>
    </group>
  );
}

/**
 * The Photos app: an edge-to-edge grid of shots, each opening full-screen
 * on tap -- a plain viewer, nothing to edit, share or delete.
 */
export function PhotosApp() {
  const closeApp = usePhone((s) => s.closeApp);
  const openIndex = usePhone((s) => s.photo);

  const screenGeometry = useMemo(
    () => roundedRectGeometry(DESIGN.width, DESIGN.height, 0.17 * DESIGN.width),
    [],
  );
  const indicator = useMemo(() => roundedRectGeometry(130, 5, 2.5), []);

  return (
    <group>
      <mesh geometry={screenGeometry}>
        <meshBasicMaterial color={PAPER} toneMapped={false} />
      </mesh>

      {openIndex === null ? (
        <Grid />
      ) : (
        <Suspense fallback={null}>
          <Viewer photo={PHOTOS[openIndex]} />
        </Suspense>
      )}

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
