import { defineConfig, devices } from "@playwright/test";

// The spike's e2e: the same spec against both versions.
const port = 3399;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 7"],
    launchOptions: {
      args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],
    },
  },
  projects: [
    {
      name: "vanilla",
      use: { baseURL: `http://localhost:${String(port)}/vanilla/` },
    },
    {
      name: "preact",
      use: { baseURL: `http://localhost:${String(port)}/preact/` },
    },
  ],
  webServer: {
    command: "bun build.ts --serve",
    port,
    reuseExistingServer: false,
  },
});
