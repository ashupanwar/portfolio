/**
 * App icon artwork: assets-src/icons/*.{png,jpg} -> public/icons/*.webp
 *
 * Square, alpha-preserving, and small enough that twelve of them cost less than
 * one of the GLBs. Run: npm run icons
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { basename, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'assets-src/icons');
const OUT = resolve(root, 'public/icons');

/**
 * Rendered at 58pt on a phone that is itself a few centimetres wide in the
 * scene, but the camera can sit close, so keep some headroom.
 */
const SIZE = 192;

async function run() {
  await mkdir(OUT, { recursive: true });
  const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));

  let total = 0;
  for (const file of files) {
    const name = basename(file, extname(file)).replace(/_icon$/, '');

    let pipeline = sharp(resolve(SRC, file));
    const meta = await pipeline.metadata();

    // Sources carry different amounts of transparent margin around the
    // artwork. Left alone, that margin becomes part of the texture and the
    // icon renders smaller than its tile -- which is why they looked
    // inconsistent next to the drawn glyphs. Trim it so every icon starts at
    // its own true bounding box.
    //
    // Only for images that actually have alpha: the Lock icon arrived as an
    // opaque JPEG whose dark field IS the tile, and trimming uniform borders
    // would eat it down to the padlock.
    if (meta.hasAlpha) {
      pipeline = pipeline.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 });
    }

    // `cover` rather than `contain`: fill the square edge to edge, cropping
    // rather than letterboxing, so every tile is the same size on the grid.
    const info = await pipeline
      .resize(SIZE, SIZE, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(resolve(OUT, `${name}.webp`));

    total += info.size;
    console.log(`  ${name.padEnd(10)} ${(info.size / 1024).toFixed(0)}KB`);
  }

  console.log(`\n  ${files.length} icons, ${(total / 1024).toFixed(0)}KB total`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
