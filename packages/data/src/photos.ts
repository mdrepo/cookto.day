import type { PackPhotos } from "./packs.js";

// The packs' photos (specs/118), for the web app: `createPacks(PHOTOS)`.
// Their own entry, so the API, whose bundler loads no images, never reaches
// them. Our Kitchen has none yet: the family's own dishes.

export const PHOTOS: PackPhotos = {
  "north-indian": () => import("./packs/north-indian.photos.js"),
  maharashtrian: () => import("./packs/maharashtrian.photos.js"),
};
