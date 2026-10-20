import { defineConfig, devices } from "@playwright/test";

// The browser's storage, tested in the browsers people use (specs/61,
// ADR 0021): a test page on localhost, on the same three devices as the app.
const port = Number(process.env.E2E_PORT ?? 3399);

/**
 * On a Mac, WebKit's traces capture its window through WindowServer, which
 * crashed the owner's Mac on 18 Oct: on a laptop, two tests at a time and
 * WebKit records nothing (apps/web/playwright.config.ts says more).
 */
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  ...(ci ? {} : { workers: 2 }),
  // `.only` must never reach the default branch (ADR 0003).
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
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
    // The iPhone project runs only when asked (E2E_IOS=1): the owner tests on
    // a real iPhone for now, since Playwright's WebKit kept failing on layout
    // checks that passed everywhere else (ADR 0021, note of 20 Oct 2026).
    ...(process.env.E2E_IOS
      ? [
          {
            name: "iphone-webkit",
            use: {
              ...devices["iPhone 15"],
              ...(ci ? {} : { trace: "off" as const }),
            },
          },
        ]
      : []),
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "bun e2e/serve.ts",
    // A port, not a URL: if something else holds it, this fails at once.
    port,
    env: { PORT: String(port) },
    reuseExistingServer: false,
  },
});
