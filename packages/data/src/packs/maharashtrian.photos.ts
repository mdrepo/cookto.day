// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- every package that compiles this file needs the photos' type
/// <reference path="../images.d.ts" />
// Written by `bun run packs:bundle` from packs/. Don't edit: change the pack.

import p0 from "../../../../packs/maharashtrian/photos/bhel-puri.webp";
import p0s from "../../../../packs/maharashtrian/photos/bhel-puri.small.webp";
import p1 from "../../../../packs/maharashtrian/photos/poha.webp";
import p1s from "../../../../packs/maharashtrian/photos/poha.small.webp";

const photos: Record<string, readonly [string, string]> = {
  "bhel-puri": [p0, p0s],
  poha: [p1, p1s],
};
export default photos;
