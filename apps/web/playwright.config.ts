import { defineConfig, devices } from "@playwright/test";

// E2E tests: the built static site, served on localhost, in Chromium
// (ADR 0003, 0004). Uses its own port, so `bun run dev` can keep running.
const port = Number(process.env.E2E_PORT ?? 3299);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // `.only` must never reach the default branch (ADR 0003).
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    // Videos are attached to PRs for UI changes (ADR 0021).
    video: "on",
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
    { name: "iphone-webkit", use: { ...devices["iPhone 15"] } },
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
