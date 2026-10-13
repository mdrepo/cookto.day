import type { AppPack, NewItem, PackLoader } from "@cookto/data";
import type { PantryReader } from "@cookto/data/read";
import type { KitchenSettingsWriter, PantryWriter } from "@cookto/data/write";
import type { Condition, Unit } from "@cookto/engine";

// The kitchen (ADR 0027): the cuisines a household loads, its pantry, what
// it doesn't make, and a sample kitchen to try. No cuisine here: food comes
// from the loaded packs, by Wikidata id.

interface Kitchen {
  pantry: { reader: PantryReader; writer: PantryWriter };
  settings: KitchenSettingsWriter;
  packs: PackLoader;
}

/** Loads a cuisine's dishes; one that's coming soon can't be loaded. */
export async function loadCuisine(k: Kitchen, id: string): Promise<void> {
  const cuisine = k.packs.cuisines().find((c) => c.id === id);
  const kitchen = k.settings.kitchen();
  if (!cuisine || cuisine.soon || kitchen.cuisines.includes(id)) return;
  await k.packs.load(id);
  k.settings.setKitchen({ ...kitchen, cuisines: [...kitchen.cuisines, id] });
}

/** Ticked staples, as "have it": each once. */
export async function addStaples(
  k: Kitchen,
  ingredients: readonly string[],
  today: string,
): Promise<void> {
  const have = new Set(
    (await k.pantry.reader.items()).map((i) => i.ingredient),
  );
  const add = [...new Set(ingredients)].filter((i) => !have.has(i));
  if (add.length > 0)
    await k.pantry.writer.add(
      add.map((ingredient) => ({ ingredient, boughtOn: today })),
    );
}

export interface Food {
  name: string;
  amount?: number;
  unit?: Unit;
  boughtOn: string;
}

const loaded = (k: Kitchen) =>
  Promise.all(k.settings.kitchen().cuisines.map((id) => k.packs.load(id)));

/** The id a loaded pack calls `name`, in the app's language or English. */
function idOf(packs: readonly AppPack[], name: string, language: string) {
  const wanted = name.trim().toLocaleLowerCase();
  for (const pack of packs)
    for (const lang of [language, "en"]) {
      const words = pack.words[lang]?.ingredients ?? {};
      const found = Object.entries(words).find(
        ([, word]) => word.toLocaleLowerCase() === wanted,
      );
      if (found) return { id: found[0], days: pack.fresh[found[0]] };
    }
  return undefined;
}

/** Food a loaded cuisine knows gets its id and use-by; other food is kept as typed. */
export async function addFood(
  k: Kitchen,
  food: Food,
  language: string,
): Promise<void> {
  const known = idOf(await loaded(k), food.name, language);
  const item: NewItem = {
    ingredient: known?.id ?? food.name.trim(),
    boughtOn: food.boughtOn,
  };
  if (known?.days !== undefined) item.shelfLifeDays = known.days;
  if (food.amount !== undefined && food.unit !== undefined) {
    item.amount = food.amount;
    item.unit = food.unit;
  }
  await k.pantry.writer.add([item]);
}

export function changeAmount(
  k: Kitchen,
  id: string,
  amount: number | undefined,
  unit: Unit | undefined,
): Promise<void> {
  return k.pantry.writer.setAmount(id, amount, unit);
}

export function markFood(
  k: Kitchen,
  id: string,
  condition: Condition | undefined,
): Promise<void> {
  return k.pantry.writer.mark(id, condition);
}

export function useUp(k: Kitchen, id: string): Promise<void> {
  return k.pantry.writer.useUp(id);
}

/** Turns a part ("roti") off for this household, or back on. */
export function setMakes(
  k: Kitchen,
  part: string,
  makes: boolean,
): Promise<void> {
  const kitchen = k.settings.kitchen();
  const skip = kitchen.skip.filter((p) => p !== part);
  k.settings.setKitchen({ ...kitchen, skip: makes ? skip : [...skip, part] });
  return Promise.resolve();
}

/** Loads the cuisine if needed and fills the pantry with its sample, marked. */
export async function trySample(
  k: Kitchen,
  cuisine: string,
  today: string,
): Promise<void> {
  if (k.settings.kitchen().sample) return;
  const before = k.settings.kitchen().cuisines;
  await loadCuisine(k, cuisine);
  const pack = await k.packs.load(cuisine);
  await k.pantry.writer.add(
    pack.sample.map(({ ingredient, amount, unit }) => {
      const item: NewItem = { ingredient, boughtOn: today };
      const days = pack.fresh[ingredient];
      if (days !== undefined) item.shelfLifeDays = days;
      if (amount !== undefined && unit !== undefined)
        Object.assign(item, { amount, unit });
      return item;
    }),
    { sample: true },
  );
  const kitchen = k.settings.kitchen();
  k.settings.setKitchen({
    ...kitchen,
    sample: {
      addedCuisines: kitchen.cuisines.filter((c) => !before.includes(c)),
    },
  });
}

/** Takes the sample out, and any cuisine only the sample loaded. */
export async function clearSample(k: Kitchen): Promise<void> {
  const kitchen = k.settings.kitchen();
  if (!kitchen.sample) return;
  await k.pantry.writer.removeSample();
  const added = kitchen.sample.addedCuisines;
  k.settings.setKitchen({
    ...kitchen,
    cuisines: kitchen.cuisines.filter((c) => !added.includes(c)),
    sample: null,
  });
}
