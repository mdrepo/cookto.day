import { defineConfig, devices } from "@playwright/test";

// E2E tests: the built kit page (ADR 0019), served on localhost, in Chromium
// (ADR 0003, 0021). Uses its own port, so the web app's tests can run beside these.
const port = Number(process.env.E2E_PORT ?? 3399);

/**
 * On a Mac, WebKit records video and traces by capturing its window through
 * WindowServer; many tests at once used up its GPU buffers and crashed the
 * owner's Mac three times on 18 Oct. So on a laptop: two tests at a time, no
 * video, and WebKit records nothing. CI records every test (ADR 0021);
 * `E2E_VIDEO=on` records Chromium's on a laptop, for a PR's video.
 */
const ci = Boolean(process.env.CI);
const video = ci || process.env.E2E_VIDEO === "on" ? "on" : "off";
/** WebKit on a laptop: no video and no trace, ever. */
const quietWebKit = ci ? {} : { video: "off" as const, trace: "off" as const };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  ...(ci ? {} : { workers: 2 }),
  // `.only` must never reach the default branch (ADR 0003).
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    // Videos are attached to PRs for UI changes (ADR 0021).
    video,
    trace: "retain-on-failure",
    // No internet: every request but localhost goes to a proxy that isn't
    // there, so it fails, in every browser. A slow or missing outside site
    // can't make a test fail, and the page can't quietly depend on one
    // (ADR 0021, 0013).
    proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" },
  },
  // People open it on their phone in the kitchen, Android or iPhone, and
  // sometimes on a laptop: every test runs on all three (ADR 0021).
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    // Every iPhone browser is Safari's engine, WebKit (ADR 0021).
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 15"], ...quietWebKit },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "bun scripts/serve.ts",
    // A port, not a URL: if something else holds it, this fails at once.
    port,
    env: { PORT: String(port) },
    reuseExistingServer: false,
  },
});
