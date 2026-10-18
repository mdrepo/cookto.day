import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";
import { Onboarding } from "./support/onboarding.js";

// specs/195-who-cooks.md: two roles per phone; the planner decides tomorrow,
// the cook sees the day; a planned meal counts as made.

/** The household's clock, "YYYY-MM-DDTHH:MM", in the phone's own time. */
const at = (page: Page, time: string) =>
  page.clock.setFixedTime(new Date(`${time}:00`));

interface Plan {
  on: string;
  slot: string;
  dish: string;
  for?: "child";
}

/** Meals planned on an earlier day, saved the way the app saves them. */
async function planned(page: Page, plans: Plan[]): Promise<void> {
  await page.evaluate(async (plans) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("cookto.day", 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore("records", { keyPath: ["c", "id"] });
      };
      open.onsuccess = () => {
        resolve(open.result);
      };
      open.onerror = () => {
        reject(new Error("couldn't open the app's store"));
      };
    });
    const tx = db.transaction("records", "readwrite");
    plans.forEach((plan, i) => {
      const id = `seed-${String(i)}`;
      tx.objectStore("records").put({
        c: "plans",
        id,
        record: {
          id,
          ...plan,
          prep: null,
          version: 1,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      });
    });
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
    db.close();
  }, plans);
  await page.reload();
}

/** This phone plans the meals: chosen in Settings. */
async function planner(k: Cooking, page: Page): Promise<void> {
  await k.settings();
  await page.getByRole("radio", { name: "I plan the meals" }).click();
  await k.home();
}

const tomorrow = (page: Page) => page.getByRole("region", { name: "Tomorrow" });

/** The share sheet and the clipboard, faked: tests stay offline. */
async function fakeShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { shared: string[] };
    w.shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: { text: string }) => {
        w.shared.push(data.text);
        return Promise.resolve();
      },
    });
  });
}

test.describe("Who cooks", () => {
  test("who cooks, at setup", async ({ page }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await expect(start.step()).toHaveText("Step 2 of 3");
    await start.next();
    await expect(start.title()).toHaveText("Who cooks?");
    await expect(start.step()).toHaveText("Step 3 of 3");
    await expect(page.getByRole("radio", { name: "I cook" })).toBeChecked();
    await page.getByRole("radio", { name: "Someone else cooks" }).click();
    await start.next();
    await expect(start.title()).toHaveText("All set");
    await start.button("Go to my kitchen").click();
    const k = new Cooking(page);
    await k.settings();
    await expect(
      page.getByRole("radio", { name: "I plan the meals" }),
    ).toBeChecked();
  });

  test("the planner's evening", async ({ page }) => {
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await planner(k, page);
    const tm = tomorrow(page);
    await expect(tm).toBeVisible();
    // The first thing: above today's meals.
    const top = await tm.boundingBox();
    const today = await page
      .getByRole("region", { name: "Cook today" })
      .boundingBox();
    expect(top && today && top.y < today.y).toBe(true);
    for (const meal of ["Lunch", "Dinner"])
      await expect(
        tm
          .getByRole("article", { name: meal })
          .getByRole("button", { name: "Other ideas" }),
      ).toBeVisible();
    await expect(
      tm.getByRole("button", { name: "Share tomorrow" }),
    ).toBeVisible();

    const dinner = tm.getByRole("article", { name: "Dinner" });
    await dinner.getByRole("button", { name: "Other ideas" }).click();
    const idea = dinner
      .getByRole("list", { name: "Other ideas" })
      .getByRole("button")
      .first();
    const name = await k.nameOf(idea);
    await idea.click();
    await expect.poll(() => k.dishOf(dinner)).toBe(name);

    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Tomorrow's sorted");
    await expect(tm).toContainText(name);
    await expect(tm.getByRole("button", { name: "Change" })).toBeVisible();
  });

  test("silence is yes", async ({ page }) => {
    await at(page, "2026-10-19T21:30");
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await planner(k, page);
    const tm = tomorrow(page);
    await expect(tm).toContainText("Tomorrow's sorted");
    const lunch = await k.valueOf(
      tm.getByRole("list", { name: "Tomorrow" }),
      "Lunch",
    );
    expect(lunch).not.toBe("");

    await at(page, "2026-10-20T08:00");
    await page.reload();
    await expect(k.title()).toHaveText("cookto.day");
    await expect.poll(() => k.pickedDish("Lunch")).toBe(lunch);
  });

  test("share tomorrow", async ({ page }) => {
    await fakeShare(page);
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    await k.press("Choose what you cook");
    await k.load("Our kitchen");
    await planner(k, page);
    await planned(page, [
      { on: "2026-10-20", slot: "lunch", dish: "chole" },
      { on: "2026-10-20", slot: "dinner", dish: "kadhi-pakora" },
      { on: "2026-10-20", slot: "lunch", dish: "veg-khichdi", for: "child" },
    ]);
    await tomorrow(page)
      .getByRole("button", { name: "Share tomorrow" })
      .click();
    const shared = () =>
      page.evaluate(() => (window as unknown as { shared: string[] }).shared);
    await expect.poll(shared).toHaveLength(1);
    const lines = ((await shared())[0] ?? "").split("\n");
    expect(lines[0]).toBe("Tomorrow");
    expect(lines).toContain("Lunch: Chole");
    expect(lines).toContain("Dinner: Kadhi pakora");
    expect(lines).toContain("For the child: Khichdi with veggies");
    expect(lines.find((l) => l.startsWith("Tonight: "))).toMatch(
      /soak the chickpeas/,
    );
    expect(lines.find((l) => l.startsWith("Buy: "))).toMatch(/curd/i);
  });

  test("the cook's day", async ({ page }) => {
    await at(page, "2026-10-19T10:00");
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", undefined, 3);
    await planned(page, [
      { on: "2026-10-19", slot: "lunch", dish: "palak-paneer" },
      { on: "2026-10-19", slot: "dinner", dish: "dal-tadka" },
    ]);
    await k.home();
    const lunch = k.pick("Lunch");
    await expect.poll(() => k.dishOf(lunch)).toBe("Palak paneer");
    await expect.poll(() => k.dishOf(k.pick("Dinner"))).toBe("Dal tadka");
    await expect(page.getByRole("button", { name: "Made" })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Other ideas" })).toHaveCount(
      0,
    );
    await expect(tomorrow(page)).toHaveCount(0);

    await lunch.getByRole("button", { name: "Made" }).click();
    await expect(lunch).toContainText("Made");
    await expect(lunch.getByRole("button", { name: "Made" })).toHaveCount(0);

    await expect(k.useSoon().first()).toBeVisible();
    await expect(
      k.tabs().getByRole("button", { name: "Fridge", exact: true }),
    ).toBeVisible();

    await lunch.getByRole("button", { name: "Palak paneer" }).click();
    await expect(k.title()).toHaveText("Palak paneer");
  });

  /** Two dinner dishes in My dishes, and one of them planned for yesterday. */
  async function twoDishes(page: Page): Promise<Cooking> {
    await at(page, "2026-10-19T10:00");
    const k = new Cooking(page);
    await k.start();
    await k.press("Choose what you cook");
    await k.load("Maharashtrian");
    await k.home();
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    for (const dish of [
      "Bhel puri",
      "Matki usal",
      "Misal pav",
      "Poha",
      "Sabudana khichdi",
      "Thalipeeth",
    ])
      await k.takeOut(dish);
    await expect(k.dishes()).toHaveCount(2);
    await planned(page, [
      { on: "2026-10-18", slot: "dinner", dish: "pav-bhaji" },
    ]);
    await k.home();
    return k;
  }

  test("the plan counts as made", async ({ page }) => {
    const k = await twoDishes(page);
    await expect.poll(() => k.pickedDish("Dinner")).toBe("Varan bhaat");
    expect(await k.pickedDish("Lunch")).not.toBe("Pav bhaji");
  });

  test("didn't make it", async ({ page }) => {
    const k = await twoDishes(page);
    await k.openDish("Pav bhaji");
    await expect(page.getByRole("main")).toContainText(
      "Planned for dinner yesterday",
    );
    await k.press("Didn't make it");
    await expect(page.getByRole("main")).not.toContainText(
      "Planned for dinner yesterday",
    );
    await k.tabs().getByRole("button", { name: "Today", exact: true }).click();
    await expect(k.title()).toHaveText("cookto.day");
    await expect.poll(() => k.pickedDish("Dinner")).toBe("Pav bhaji");
  });

  test("the role, in Settings", async ({ page }) => {
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    await expect(tomorrow(page)).toHaveCount(0);
    await planner(k, page);
    await expect(tomorrow(page)).toBeVisible();
  });
});
