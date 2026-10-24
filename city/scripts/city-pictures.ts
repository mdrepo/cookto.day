import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

// Pictures for the city (#252): each main screen of the app at phone size,
// with the sample kitchen in, and each part of the design kit from its kit
// page, light and in English. Taken when the city is built: the app and the
// kit are built, served here, and photographed with Playwright. Without a
// browser, or when a build fails, the city is drawn without pictures.

/** Each feature's main screen: its address in the app. */
const SCREENS: Record<string, string> = {
  home: "#/",
  pantry: "#/kitchen/pantry",
  shopping: "#/kitchen/list",
  dishes: "#/kitchen/dishes",
  cuisines: "#/kitchen/cuisines",
  staples: "#/kitchen/staples",
  more: "#/kitchen/more",
  settings: "#/settings",
  onboarding: "#/start/where",
};

export interface Pictures {
  /** Feature folder to a JPEG data URL of its main screen. */
  screens: Record<string, string>;
  /** Kit part name to a JPEG data URL of it, light and in English. */
  kit: Record<string, string>;
}

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};

/** A static server for a built folder, on a free port. */
function serve(dir: string) {
  return Bun.serve({
    port: 0,
    fetch(req) {
      const path = normalize(decodeURIComponent(new URL(req.url).pathname));
      let file = join(dir, path);
      if (!file.startsWith(dir) || !existsSync(file) || path.endsWith("/"))
        file = join(
          dir,
          path.endsWith("/") ? `${path}index.html` : "index.html",
        );
      if (!existsSync(file)) return new Response("not found", { status: 404 });
      return new Response(readFileSync(file), {
        headers: {
          "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        },
      });
    },
  });
}

const dataUrl = (b: Buffer) => `data:image/jpeg;base64,${b.toString("base64")}`;

export async function takePictures(root: string): Promise<Pictures> {
  const none: Pictures = { screens: {}, kit: {} };
  let browser;
  try {
    for (const app of ["apps/web", "apps/kit"])
      execFileSync("bun", ["run", "--cwd", app, "build"], {
        cwd: root,
        stdio: "ignore",
      });
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    return none;
  }
  const web = serve(join(root, "apps/web/dist")),
    kit = serve(join(root, "apps/kit/dist"));
  const out: Pictures = { screens: {}, kit: {} };
  const missed: string[] = [];
  try {
    const phone = await browser.newContext({
      viewport: { width: 390, height: 780 },
      colorScheme: "light",
    });
    await phone.addInitScript(() => {
      localStorage.setItem("cookto.day:onboarded", "yes");
      localStorage.setItem("cookto.day:role", "plan");
    });
    const page = await phone.newPage();
    await page.clock.setFixedTime(new Date("2026-10-19T18:30:00"));
    await page.goto(`${web.url.href}?sample#/`);
    await page.waitForTimeout(2500);
    for (const [feature, hash] of Object.entries(SCREENS)) {
      await page.goto(`${web.url.href}${hash}`);
      await page.waitForTimeout(900);
      out.screens[feature] = dataUrl(
        await page.screenshot({ type: "jpeg", quality: 62 }),
      );
    }
    const wide = await browser.newContext({
      viewport: { width: 1100, height: 900 },
      colorScheme: "light",
    });
    const kp = await wide.newPage();
    await kp.goto(kit.url.href);
    await kp.waitForTimeout(1500);
    for (const part of await kp.locator("section.kit-part").all()) {
      // One part's picture failing leaves the others.
      try {
        const name =
          (await part.locator("h2.kit-part-name").textContent())?.trim() ?? "";
        const panel = part.locator(".kit-panel").first();
        if (!name) continue;
        out.kit[name] = dataUrl(
          await panel.screenshot({
            type: "jpeg",
            quality: 62,
            animations: "disabled",
            timeout: 5000,
          }),
        );
      } catch (e) {
        missed.push((e as Error).message.split("\n")[0] ?? "");
      }
    }
  } catch (e) {
    // Whatever was taken stays; the rest is drawn without a picture.
    missed.push((e as Error).message.split("\n")[0] ?? "");
  } finally {
    await browser.close();
    await Promise.all([web.stop(true), kit.stop(true)]);
  }
  if (missed.length)
    console.log(
      `Pictures: ${String(missed.length)} not taken, first: ${missed[0] ?? ""}`,
    );
  return out;
}
