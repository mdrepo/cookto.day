import type { AppPack } from "@cookto/data";
import { mealIdeas } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { useKitchenSettings, useLoadedPacks, useMyPacks } from "../../food.js";
import {
  clock,
  cookedQuery,
  eatingQuery,
  membersQuery,
  pantryQuery,
  plansQuery,
  queries,
  settings,
} from "../../platform.js";

const dishesOf = (packs: readonly AppPack[]) => packs.flatMap((p) => p.dishes);

/**
 * Each meal's ranked ideas for today and, from 4 pm, tomorrow (specs/72, 94,
 * 104, 144), as the use case ranks them for the chat too (specs/270).
 */
export function useMealPlans() {
  const packs = useLoadedPacks();
  const { skip } = useKitchenSettings();
  const beans = useStore(settings.store, (s) => s.beans);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const { data: members = [] } = useQuery(membersQuery, queries);
  const { data: history = [] } = useQuery(cookedQuery, queries);
  const { data: plans = [] } = useQuery(plansQuery, queries);
  // Who's out and guests, from the chat (specs/270).
  const { data: eating = [] } = useQuery(eatingQuery, queries);
  // Only My dishes are planned (specs/175).
  const dishes = dishesOf(useMyPacks());
  if (dishes.length === 0) return null;
  const now = clock();
  const ideas = mealIdeas({
    packs,
    dishes,
    skip,
    beans,
    pantry: items,
    members,
    history,
    plans,
    now,
  });
  return { ...ideas, packs, now, beans, plans, dishes, members, eating };
}
