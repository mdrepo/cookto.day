import { afterAll, afterEach, beforeAll } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Window as HappyWindow } from "happy-dom";
import { buildSite } from "../../scripts/build.js";

// DOM tests (ADR 0003): our own built page and bundle, in happy-dom, with
// file and network loading switched off. Never load anything else.

let outdir = "";
let files: string[] = [];
beforeAll(async () => {
  outdir = mkdtempSync(join(tmpdir(), "cookto-dom-"));
  // One script file, so it can run inline (no imports between chunks).
  files = await buildSite(outdir, { split: false });
});
afterAll(() => {
  rmSync(outdir, { recursive: true, force: true });
});

const openWindows: HappyWindow[] = [];
afterEach(async () => {
  for (const win of openWindows.splice(0)) await win.happyDOM.close();
});

export interface PageOpts {
  /**
   * localStorage contents before the page loads: a household that has done
   * onboarding, unless it says otherwise.
   */
  storage?: Record<string, string>;
  /** The address's query, such as "?preview-language=ar". */
  search?: string;
}

/** Opens the built index page and runs its bundle. */
export function openPage(opts: PageOpts = {}) {
  const html = files.find((f) => f.endsWith("index.html"));
  const script = files.find((f) => f.endsWith(".js"));
  if (!html || !script) throw new Error("The build produced no index page.");
  const win = new HappyWindow({
    url: `http://localhost/${opts.search ?? ""}`,
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      handleDisabledFileLoadingAsSuccess: true,
    },
  });
  openWindows.push(win);
  const w = win as unknown as Window & typeof globalThis;
  const storage = { "cookto.day:onboarded": "yes", ...opts.storage };
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  const parsed = new w.DOMParser().parseFromString(
    readFileSync(html, "utf8"),
    "text/html",
  );
  const doc = w.document;
  for (const { name, value } of parsed.documentElement.attributes)
    doc.documentElement.setAttribute(name, value);
  doc.head.replaceChildren(
    ...[...parsed.head.childNodes].map((n) => doc.importNode(n, true)),
  );
  doc.body.replaceChildren(
    ...[...parsed.body.childNodes].map((n) => doc.importNode(n, true)),
  );
  const bundle = doc.createElement("script");
  bundle.textContent = readFileSync(script, "utf8");
  doc.body.append(bundle);
  return {
    doc,
    storage: w.localStorage,
    text: (sel: string) => doc.querySelector(sel)?.textContent.trim() ?? "",
    /** The empty state's title and sentence, found by role, not by class. */
    emptyState() {
      const region = doc.querySelector("main section[aria-labelledby]");
      const titleId = region?.getAttribute("aria-labelledby") ?? "";
      return {
        title: doc.getElementById(titleId)?.textContent.trim() ?? "",
        body: region?.querySelector("p")?.textContent.trim() ?? "",
      };
    },
    /** The language list's options: code, words, and whether it's off. */
    languages() {
      return [
        ...doc.querySelectorAll<HTMLOptionElement>("#language option"),
      ].map((o) => ({
        code: o.value,
        text: o.textContent.trim(),
        off: o.disabled,
      }));
    },
    chooseLanguage(code: string) {
      const select = doc.querySelector<HTMLSelectElement>("#language");
      if (!select) throw new Error("no language switch");
      select.value = code;
      select.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
  };
}
