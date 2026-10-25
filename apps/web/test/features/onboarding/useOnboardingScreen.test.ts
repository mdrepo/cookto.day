import { describe, expect, test } from "bun:test";
import { renderCount } from "@cookto/testing";
import { addPerson, removePerson, toggleMeal } from "@cookto/usecases";
import { act } from "react";
import { usePersonCard } from "../../../src/features/onboarding/usePersonCard.js";
import { useOnboardingScreen } from "../../../src/features/onboarding/useOnboardingScreen.js";
import { household, settings } from "../../../src/platform.js";

// specs/65-onboarding.md, criteria 3 and 9. The app's own repositories, which
// keep data in memory where the browser's storage isn't there (as here).

const deps = { household, settings: settings.writer };

async function emptyHousehold() {
  for (const person of await household.reader.members())
    await removePerson(deps, person.id);
}

/** Lets reads and refreshes finish, inside React's act. */
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });

describe("useOnboardingScreen", () => {
  test("where is step 1 of 4; who 2; what you cook 3 (specs/263); who cooks 4", async () => {
    for (const [step, label] of [
      ["where", "Step 1 of 4"],
      ["who", "Step 2 of 4"],
      ["cuisines", "Step 3 of 4"],
      ["cooks", "Step 4 of 4"],
    ] as const) {
      const screen = renderCount(() => useOnboardingScreen(step));
      try {
        await settle();
        expect(screen.value().steps?.label).toBe(label);
      } finally {
        screen.unmount();
      }
    }
  });

  test("who can go on only with someone in the household", async () => {
    await emptyHousehold();
    const screen = renderCount(() => useOnboardingScreen("who"));
    try {
      await settle();
      expect(screen.value().canGoOn).toBe(false);
      await act(async () => {
        await addPerson(deps, "adult");
      });
      await settle();
      expect(screen.value().canGoOn).toBe(true);
    } finally {
      screen.unmount();
    }
  });

  test("what you cook can go on only with a cuisine ticked (specs/263)", async () => {
    const kitchen = settings.writer.kitchen();
    settings.writer.setKitchen({ ...kitchen, cuisines: [] });
    const screen = renderCount(() => useOnboardingScreen("cuisines"));
    try {
      await settle();
      expect(screen.value().canGoOn).toBe(false);
      act(() => {
        settings.writer.setKitchen({ ...kitchen, cuisines: ["north-indian"] });
      });
      await settle();
      expect(screen.value().canGoOn).toBe(true);
      expect(screen.value().skip).not.toBeNull();
    } finally {
      screen.unmount();
      settings.writer.setKitchen(kitchen);
    }
  });
});

describe("usePersonCard", () => {
  test("ticking one person's meal redraws only that person's card", async () => {
    await emptyHousehold();
    const adult = await addPerson(deps, "adult");
    const child = await addPerson(deps, "child");
    const card = renderCount(() => usePersonCard(child.id));
    try {
      await settle();
      expect(card.value().title).toBe("Child");
      const before = card.renders();

      await act(async () => {
        await toggleMeal(deps, adult.id, "breakfast");
      });
      await settle();
      expect(card.renders()).toBe(before);

      await act(async () => {
        await toggleMeal(deps, child.id, "breakfast");
      });
      await settle();
      expect(card.renders()).toBe(before + 1);
      expect(
        card.value().meals.find((m) => m.slot === "breakfast")?.pressed,
      ).toBe(false);
    } finally {
      card.unmount();
    }
  });
});
