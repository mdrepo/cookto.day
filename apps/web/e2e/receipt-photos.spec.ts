import { expect, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";
import {
  choosePhoto,
  line,
  notSure,
  row,
  sawFound,
  signedInKitchen,
} from "./support/receipt.js";

// specs/129-receipt-photos.md, the app: criteria 9 to 14. A receipt photo
// from Today or the Fridge, asked about once, read by our API (faked in
// the page), and "Found in your receipt" adds what was bought.

const CONSENT =
  "The photo goes to Google's Gemini to be read. Google keeps it for a short time only to check for abuse, and never trains on it. cookto.day keeps only the items.";

/** The made-up receipt of criteria 10 and 11, bought yesterday. */
const RECEIPT = {
  status: 200 as const,
  date: "2026-10-24",
  lines: [
    line("Fresh Paneer 200G", 4),
    line("Red Onions 700G"),
    line("15 Eggs"),
    line("Local Tomatoes"),
    line("Loose Ginger", 0.15, true),
    line("Velvet Almond Milk Drink"),
  ],
};

test.describe("Receipt photos", () => {
  test("ask before the first photo", async ({ page }) => {
    const { k, reads } = await signedInKitchen(page);
    reads.next = RECEIPT;
    await choosePhoto(page, "Add a receipt");
    await expect(page.getByText(CONSENT)).toBeVisible();
    expect(reads.reads).toHaveLength(0);
    await k.press("Read it");
    await sawFound(page);
    expect(reads.reads).toHaveLength(1);
    expect(reads.reads[0]?.type).toBe("image/jpeg");
    expect(reads.reads[0]?.bytes).toBeGreaterThan(0);

    // The next photo, from the Fridge, isn't asked about.
    await k.home();
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await k.press("Add food");
    await choosePhoto(page, "Photo of a receipt");
    await sawFound(page);
    expect(reads.reads).toHaveLength(2);
    await expect(page.getByText(CONSENT)).toHaveCount(0);
  });

  test("found in your photo", async ({ page }) => {
    const { k, reads } = await signedInKitchen(page);
    reads.next = RECEIPT;
    await choosePhoto(page, "Add a receipt");
    await k.press("Read it");
    await sawFound(page);
    for (const [food, says] of [
      ["Paneer", "800 g"],
      ["Onion", "700 g"],
      ["Eggs", "15 pieces"],
      ["Tomato", "have it"],
      ["Ginger", "150 g"],
    ] as const) {
      await expect(row(page, "found", food)).toContainText(says);
      await expect(
        row(page, "found", food).getByRole("checkbox"),
      ).toBeChecked();
    }
    await expect(row(page, "found", "Ginger")).toContainText("Check this line");
    await expect(row(page, "found", "Paneer")).not.toContainText(
      "Check this line",
    );
    const milk = row(page, "not-sure", "Velvet Almond Milk Drink");
    await expect(
      milk.getByRole("button", { name: "Add as it is" }),
    ).toBeVisible();
    await expect(milk.getByRole("button", { name: "Skip" })).toBeVisible();
  });

  test("add what was bought", async ({ page }) => {
    const { k, reads } = await signedInKitchen(page);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    // The dish's Back goes to My dishes: Today is its tab.
    await k.tabs().getByRole("button", { name: "Today" }).click();
    reads.next = RECEIPT;
    await choosePhoto(page, "Add a receipt");
    await k.press("Read it");
    await sawFound(page);
    await row(page, "not-sure", "Velvet Almond Milk Drink")
      .getByRole("button", { name: "Add as it is" })
      .click();
    await k.press("Add 6");

    await expect(k.title()).toHaveText("Fridge");
    await expect(k.item("Paneer")).toContainText("800 g · use within 6 days");
    await expect(k.item("Ginger")).toContainText("150 g");
    for (const food of ["Onion", "Eggs", "Tomato", "Velvet Almond Milk Drink"])
      await expect(k.item(food)).toBeVisible();
    const list = page.getByRole("button", { name: /^Shopping list \(\d+\)$/ });
    await list.click();
    const onList = page
      .getByRole("list", { name: "Shopping list" })
      .getByRole("listitem");
    await expect(onList.filter({ hasText: "Paneer" })).toHaveCount(0);
    await expect(onList.filter({ hasText: "Spinach" })).toHaveCount(1);

    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await k.press("Undo");
    await expect(k.item("Paneer")).toHaveCount(0);
    await expect(k.item("Velvet Almond Milk Drink")).toHaveCount(0);
    await list.click();
    await expect(onList.filter({ hasText: "Paneer" })).toHaveCount(1);
  });

  test("ask only once", async ({ page }) => {
    const { k, reads } = await signedInKitchen(page);
    reads.next = {
      status: 200,
      lines: [line("Velvet Almond Milk Drink"), line("Coca-Cola Zero Sugar")],
    };
    await choosePhoto(page, "Add a receipt");
    await k.press("Read it");
    await sawFound(page);
    await row(page, "not-sure", "Velvet Almond Milk Drink")
      .getByRole("button", { name: "Add as it is" })
      .click();
    await row(page, "not-sure", "Coca-Cola Zero Sugar")
      .getByRole("button", { name: "Skip" })
      .click();
    await k.press("Add 1");
    await expect(k.title()).toHaveText("Fridge");

    await k.home();
    await choosePhoto(page, "Add a receipt");
    await sawFound(page);
    await expect(row(page, "found", "Velvet Almond Milk Drink")).toBeVisible();
    await expect(page.getByText("Coca-Cola Zero Sugar")).toHaveCount(0);
    await expect(notSure(page)).toHaveCount(0);
  });

  test("what stops a read, in plain words", async ({ page }) => {
    const signedIn = await signedInKitchen(page);
    const reads = signedIn.reads;
    const cases = [
      [
        { status: 429, error: "limit", limit: "household-day" },
        "You've read 3 receipts today. Try again tomorrow.",
      ],
      [
        { status: 429, error: "limit", limit: "household-month" },
        "You've read 30 receipts this month.",
      ],
      [
        { status: 422, error: "not-a-receipt" },
        "This doesn't look like a receipt",
      ],
      [
        { status: 422, error: "rejected" },
        "We couldn't read this photo. Try again tomorrow.",
      ],
      [
        { status: 503, error: "off" },
        "Receipt photos aren't working right now",
      ],
      ["offline", "Receipt photos aren't working right now"],
      [
        { status: 502, error: "reader" },
        "Receipt photos aren't working right now",
      ],
    ] as const;
    let first = true;
    for (const [answer, says] of cases) {
      reads.next = answer;
      await signedIn.k.home();
      await choosePhoto(page, "Add a receipt");
      if (first) await signedIn.k.press("Read it");
      first = false;
      await expect(page.getByText(says)).toBeVisible({ timeout: 10_000 });
      await expect(signedIn.k.button("Tap what you bought")).toBeVisible();
    }
    expect(reads.reads).toHaveLength(cases.length);

    // Signed out: nothing is sent.
    await signedIn.k.home();
    await signedIn.k.settings();
    await signedIn.k.press("Sign out");
    await signedIn.k.home();
    await choosePhoto(page, "Add a receipt");
    await expect(
      page.getByText("Sign in to read receipt photos"),
    ).toBeVisible();
    await expect(signedIn.k.button("Tap what you bought")).toBeVisible();
    expect(reads.reads).toHaveLength(cases.length);
  });

  test("the privacy line stays true", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await expect(
      page.getByText(
        "Your fridge and family stay in this browser. A receipt photo is sent to be read only when you choose, and isn't kept.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Nothing is uploaded")).toHaveCount(0);
  });
});
