/**
 * Asset pipeline: assets-src/*.glb  ->  public/models/*.glb
 *
 * Per model we prune nodes we never render, fix broken material flags,
 * downsize + re-encode textures to WebP, then Draco-compress geometry.
 *
 * Run: npm run assets
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, prune, weld } from '@gltf-transform/functions';
import draco3d from 'draco3d';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'assets-src');
const OUT = resolve(root, 'public/models');

/**
 * Texture budgets by material slot. Anything unlisted falls back to `default`.
 * The phone is the hero prop and sits closest to camera, so it keeps 2K on the
 * slots that read at that distance; everything else is lit dimly and 1K is
 * indistinguishable.
 */
const BUDGETS = {
  iphone: { baseColorTexture: 2048, normalTexture: 2048, default: 1024 },
  lamp: { default: 1024 },
  desk: { default: 1024 },
};

const MODELS = [
  {
    key: 'iphone',
    in: 'iphone_14_pro.glb',
    out: 'iphone.glb',
    transform(document) {
      // Single mesh, single material. The screen is baked into baseColor and
      // faked with an emissive map -- we cover it with our own UI plane, so the
      // emissive has to go or it glows through as a second, wrong screen.
      for (const material of document.getRoot().listMaterials()) {
        material.setEmissiveTexture(null);
        material.setEmissiveFactor([0, 0, 0]);
        // Authored as BLEND + doubleSided on a solid opaque object, which costs
        // us depth sorting and double the fragment work for nothing.
        material.setAlphaMode('OPAQUE');
        material.setDoubleSided(false);
      }
    },
  },
  {
    key: 'lamp',
    in: 'tomons_desk_lamp.glb',
    out: 'lamp.glb',
    // Sketchfab studio staging that would wreck our lighting.
    dropNodes: ['Backdrop', 'LightPanels'],
  },
  {
    key: 'desk',
    in: 'office_desks_wooden.glb',
    out: 'desk.glb',
    // A second lamp we don't want competing with the Tomons.
    dropNodes: ['Lighting_Table-Lamps_Cute_01'],
  },
];

/**
 * Matches by prefix: exporters routinely append `_1`, `_0` etc. to node names,
 * so an exact match silently no-ops and the geometry ships anyway.
 */
function removeSubtree(document, prefix) {
  const nodes = document
    .getRoot()
    .listNodes()
    .filter((n) => n.getName().startsWith(prefix));
  if (!nodes.length) return 0;

  // Collect before disposing -- mutating during traversal skips siblings.
  const doomed = [];
  for (const node of nodes) node.traverse((n) => doomed.push(n));
  for (const n of doomed) n.dispose();
  return nodes.length;
}

async function resizeTextures(document, budget) {
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image) continue;

    // Slot lookup via the material that references this texture.
    const slotNames = new Set();
    for (const parent of texture.listParents()) {
      if (parent.propertyType !== 'Material') continue;
      for (const slot of ['baseColorTexture', 'normalTexture', 'emissiveTexture', 'occlusionTexture', 'metallicRoughnessTexture']) {
        const getter = `get${slot[0].toUpperCase()}${slot.slice(1)}`;
        if (typeof parent[getter] === 'function' && parent[getter]() === texture) {
          slotNames.add(slot);
        }
      }
    }

    const max = Math.max(
      ...[...slotNames].map((s) => budget[s] ?? budget.default),
      slotNames.size ? -Infinity : budget.default,
    );

    const before = Buffer.from(image);
    const meta = await sharp(before).metadata();

    // Normal and ORM maps carry vector/linear data -- lossy compression on them
    // shows up as shading artifacts, so they get a much higher quality floor.
    const isData =
      slotNames.has('normalTexture') ||
      slotNames.has('metallicRoughnessTexture') ||
      slotNames.has('occlusionTexture');

    const pipeline = sharp(before);
    if (meta.width > max || meta.height > max) {
      pipeline.resize(max, max, { fit: 'inside', withoutEnlargement: true });
    }

    const after = await pipeline.webp({ quality: isData ? 95 : 82, effort: 5 }).toBuffer();
    const outMeta = await sharp(after).metadata();

    texture.setImage(new Uint8Array(after)).setMimeType('image/webp');

    console.log(
      `      ${[...slotNames].join('+') || 'unused'}: ` +
        `${meta.width}x${meta.height} ${(before.length / 1024).toFixed(0)}KB -> ` +
        `${outMeta.width}x${outMeta.height} ${(after.length / 1024).toFixed(0)}KB`,
    );
  }
}

async function run() {
  await mkdir(OUT, { recursive: true });

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  let totalIn = 0;
  let totalOut = 0;

  for (const model of MODELS) {
    const inPath = resolve(SRC, model.in);
    const outPath = resolve(OUT, model.out);
    const sizeIn = (await readFile(inPath)).length;
    totalIn += sizeIn;

    console.log(`\n  ${model.in}  (${(sizeIn / 1e6).toFixed(1)} MB)`);

    const document = await io.read(inPath);

    for (const name of model.dropNodes ?? []) {
      const hits = removeSubtree(document, name);
      if (!hits) throw new Error(`dropNodes: no node matching "${name}" in ${model.in}`);
      console.log(`      dropped ${hits} node(s): ${name}*`);
    }

    model.transform?.(document);

    // prune() first so orphaned textures never get re-encoded.
    //
    // keepLeaves MUST stay true: empty leaf nodes are how these models mark
    // anchor points (the lamp's `Spot` empty, which the whole lighting rig
    // hangs off). Pruning them saves a few bytes and silently breaks the scene.
    await document.transform(
      dedup(),
      prune({ keepAttributes: false, keepLeaves: true }),
    );

    await resizeTextures(document, BUDGETS[model.key]);

    await document.transform(
      weld(),
      draco({ method: 'edgebreaker' }),
    );

    await io.write(outPath, document);

    const sizeOut = (await readFile(outPath)).length;
    totalOut += sizeOut;
    console.log(
      `   -> ${model.out}  ${(sizeOut / 1e6).toFixed(2)} MB ` +
        `(${(100 - (sizeOut / sizeIn) * 100).toFixed(0)}% smaller)`,
    );
  }

  console.log(
    `\n  TOTAL  ${(totalIn / 1e6).toFixed(1)} MB -> ${(totalOut / 1e6).toFixed(2)} MB\n`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
