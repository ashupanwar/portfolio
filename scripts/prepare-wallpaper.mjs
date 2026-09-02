/**
 * Builds the lock-screen wallpaper and its subject cutout.
 *
 *   public/wallpaper.webp     -- the photo, cropped to the screen's aspect
 *   public/wallpaper-fg.webp  -- the same photo with alpha, keeping only the
 *                                dark subject so it can be drawn *over* the
 *                                clock, reproducing iOS's depth effect
 *
 * Run: npm run wallpaper
 */
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'assets-src/wallpaper-src.jpg');

/** Screen aspect, from SCREEN.width / SCREEN.height in the design grid. */
const ASPECT = 390 / 844;
const OUT_WIDTH = 780;
const OUT_HEIGHT = Math.round(OUT_WIDTH / ASPECT);

/**
 * Must match LIFT_TRAVEL in usePhone.ts.
 *
 * On unlock the lock screen slides up by scrolling these textures rather than
 * moving their mesh (which is what protects the screen's rounded corners). That
 * scroll needs somewhere to go: without padding, the sampler clamps and smears
 * the last row of pixels across the strip it reveals. Transparent padding lets
 * the home screen show through instead.
 */
const TRAVEL = 0.45;
const CANVAS_HEIGHT = Math.round(OUT_HEIGHT * (1 + TRAVEL));

/**
 * Pixels trimmed off the top of the source before cropping.
 *
 * A plain centre crop leaves the subject's head below the clock, so the depth
 * effect would never actually occlude anything. Trimming sky lifts him into the
 * type, matching the reference screenshot.
 */
const TRIM_TOP = 250;

/**
 * The cutout works by rejecting the two backgrounds rather than by selecting
 * the subject, because the backgrounds are the separable things here.
 *
 * Sampled from the photo (r,g,b -> luma, blueness = b - (r+g)/2):
 *   sky    luma  87   blueness  100
 *   hair   luma   9   blueness   10
 *   snow   luma 195   blueness   14
 *   skin   luma 182   blueness  -59
 *   jacket luma  98   blueness   -5
 *
 * Note a plain brightness cut cannot work: blue contributes only 7% of luma, so
 * the deep sky reads *darker* than the snow and about as dark as the jacket.
 * Sky is separated by blueness, snow by being bright *and* neutral -- which
 * leaves skin (bright but strongly negative blueness) correctly in the subject.
 */
const smoothstep = (edge0, edge1, value) => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

async function run() {
  const rotated = await sharp(SRC).rotate().toBuffer();
  const meta = await sharp(rotated).metadata();
  console.log(`  source ${meta.width}x${meta.height} (after EXIF rotation)`);

  const cropHeight = meta.height - TRIM_TOP;
  const cropWidth = Math.round(cropHeight * ASPECT);
  const left = Math.round((meta.width - cropWidth) / 2);

  const base = sharp(rotated)
    .extract({ left, top: TRIM_TOP, width: cropWidth, height: cropHeight })
    .resize(OUT_WIDTH, OUT_HEIGHT);

  const rgb = await base.clone().removeAlpha().raw().toBuffer();

  /** Lays an image onto a transparent canvas of the full scroll height. */
  const onPaddedCanvas = (input) =>
    sharp({
      create: {
        width: OUT_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([{ input, top: 0, left: 0 }]);

  await onPaddedCanvas(await base.clone().png().toBuffer())
    .webp({ quality: 82, alphaQuality: 100 })
    .toFile(resolve(root, 'public/wallpaper.webp'));

  // Same pixels, alpha driven by darkness. Because the cutout carries the very
  // same colours as the layer beneath it, the soft edges composite back onto
  // themselves invisibly -- the only place the two layers differ is wherever
  // the clock sits between them.
  const rgba = Buffer.alloc(OUT_WIDTH * OUT_HEIGHT * 4);
  for (let i = 0; i < OUT_WIDTH * OUT_HEIGHT; i += 1) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const blueness = b - (r + g) / 2;

    const sky = smoothstep(45, 75, blueness);
    const snow = smoothstep(140, 172, luma) * smoothstep(-30, -5, blueness);
    const alpha = 1 - Math.max(sky, snow);

    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = Math.round(alpha * 255);
  }

  const cutout = await sharp(rgba, {
    raw: { width: OUT_WIDTH, height: OUT_HEIGHT, channels: 4 },
  })
    .png()
    .toBuffer();

  await onPaddedCanvas(cutout)
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(resolve(root, 'public/wallpaper-fg.webp'));

  // Home-screen backdrop: the same photo, heavily blurred and knocked back so
  // white widget cards and app labels stay legible over it. No scroll padding --
  // the home screen scales rather than slides.
  await base
    .clone()
    .blur(28)
    .modulate({ brightness: 0.82, saturation: 0.9 })
    .webp({ quality: 78 })
    .toFile(resolve(root, 'public/wallpaper-blur.webp'));

  // Frosted-glass plate for the dock. Blurred far harder and lifted toward
  // white, so sampling it through the dock's window reads as glass over the
  // wallpaper rather than as a flat white panel -- WebGL has no backdrop-filter.
  await base
    .clone()
    // Lifted only slightly off the backdrop -- enough that the dock reads as a
    // distinct pane, without tinting it toward white.
    .blur(46)
    .modulate({ brightness: 1.12, saturation: 1.15 })
    .webp({ quality: 74 })
    .toFile(resolve(root, 'public/wallpaper-frost.webp'));

  console.log(
    `  wrote wallpaper.webp, wallpaper-fg.webp, wallpaper-blur.webp and wallpaper-frost.webp ` +
      `(${OUT_WIDTH}x${CANVAS_HEIGHT}, photo ${OUT_HEIGHT} + ${CANVAS_HEIGHT - OUT_HEIGHT} clear)`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
