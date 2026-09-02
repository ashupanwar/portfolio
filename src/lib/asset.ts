/**
 * Prefixes a root-relative public-folder path with Vite's configured base.
 *
 * Files loaded straight from `public/` by their string path (glTF models,
 * textures, fonts) never pass through Vite's module graph, so unlike an
 * `import` they are never rewritten for the deploy base -- GitHub Pages
 * serves this site from /portfolio/, and a bare '/models/x.glb' resolves to
 * the domain root instead, 404ing.
 */
export function asset(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}
