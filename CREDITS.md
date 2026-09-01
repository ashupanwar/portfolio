# Credits

## 3D Models

All three models are licensed **CC Attribution 4.0** — commercial use is permitted,
but visible credit is **required**. These credits must stay reachable from the live
site (they are surfaced in-scene under Settings → About, as well as here).

- **"Iphone 14 Pro"** by mister dude ([@misterdude](https://sketchfab.com/misterdude))
  https://sketchfab.com/3d-models/iphone-14-pro-5cb0778041a34f09b409a38c687bb1d4
  Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

- **"Tomons Desk Lamp"** by chris ([@ekupixels](https://sketchfab.com/ekupixels))
  https://sketchfab.com/3d-models/tomons-desk-lamp-cd14b790cb4b47daa9d54422799ca95a
  Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  *Author has marked this model NoAI (no use in generative AI training datasets).*

- **"Office desks wooden"** by Chenchanchong ([@Chenchanchong](https://sketchfab.com/Chenchanchong))
  https://sketchfab.com/3d-models/office-desks-wooden-80ddb207b4dd47c39780acf2a0b3f517
  Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

### Modifications

The models in `public/models/` are modified from the originals. CC BY requires
indicating changes; they are:

- **iphone.glb** — emissive map removed (the baked fake screen), material forced
  from `BLEND`/double-sided to `OPAQUE`/single-sided, textures downsized to
  2048 (base, normal) / 1024 (ORM) and re-encoded to WebP, geometry Draco-compressed.
- **lamp.glb** — `Backdrop` and `LightPanels` staging nodes removed, textures
  downsized to 1024 and re-encoded to WebP, geometry Draco-compressed.
- **desk.glb** — `Lighting_Table-Lamps_Cute_01` subtree removed, textures downsized
  to 1024 and re-encoded to WebP, geometry Draco-compressed.

Originals are kept unmodified in `assets-src/` (git-ignored). Regenerate with `npm run assets`.
