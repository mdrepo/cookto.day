import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// The Worker builds (specs/241's deploy): Cloudflare bundles the API from
// its entry, and its bundler has no loader for images. The packs' words
// reach the server; their photos are the web app's, and stay out of it.

const ENTRY = fileURLToPath(new URL("../src/index.ts", import.meta.url));
const FILES = /\.(webp|png|jpe?g|gif|svg|avif)$/;

describe("the Worker bundle", () => {
  test("builds from the API's entry with no image in it", async () => {
    const images: string[] = [];
    const result = await Bun.build({
      entrypoints: [ENTRY],
      target: "browser",
      conditions: ["workerd", "worker"],
      external: ["cloudflare:*"],
      plugins: [
        {
          name: "no-images",
          setup(build) {
            build.onLoad({ filter: FILES }, (file) => {
              images.push(file.path.split("/packs/").pop() ?? file.path);
              return { contents: "export default ''", loader: "js" };
            });
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    expect(images).toEqual([]);
  });
});
