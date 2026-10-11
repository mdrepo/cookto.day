import { defineConfig, devices } from "@playwright/test";

// E2E tests: the built kit page (ADR 0019), served on localhost, in Chromium
// (ADR 0003, 0004). Uses its own port, so the web app's tests can run beside these.
const port = Number(process.env.E2E_PORT ?? 3399);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // `.only` must never reach the default branch (ADR 0003).
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    // Videos are attached to PRs for UI changes (ADR 0004).
    video: "on",
    trace: "retain-on-failure",
    // No internet: every host but localhost fails to resolve, so a slow or
    // missing outside site can't make a test fail, and the page can't
    // quietly depend on one (ADR 0004, 0013).
    launchOptions: {
      args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],
    },
  },
  // People open it on their phone in the kitchen, and sometimes on a
  // laptop: every test runs on both (specs/33-layouts.md).
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
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
