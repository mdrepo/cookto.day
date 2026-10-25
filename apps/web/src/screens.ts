import { lazy } from "react";

// Pages a first visit doesn't show load when someone opens them, so the
// first page stays within its budget as the app grows (ADR 0013; #95, #97).
// Setup and Today come with the first page; Settings is under More now
// (specs/175), so it loads when opened too. app.tsx puts them together.

export const DishScreen = lazy(() =>
  import("./features/dish/DishScreen.js").then((m) => ({
    default: m.DishScreen,
  })),
);
export const DishesScreen = lazy(() =>
  import("./features/dishes/DishesScreen.js").then((m) => ({
    default: m.DishesScreen,
  })),
);
export const CuisinesScreen = lazy(() =>
  import("./features/cuisines/CuisinesScreen.js").then((m) => ({
    default: m.CuisinesScreen,
  })),
);
export const PantryScreen = lazy(() =>
  import("./features/pantry/PantryScreen.js").then((m) => ({
    default: m.PantryScreen,
  })),
);
export const ItemSheet = lazy(() =>
  import("./features/pantry/ItemSheet.js").then((m) => ({
    default: m.ItemSheet,
  })),
);
export const ShoppingScreen = lazy(() =>
  import("./features/shopping/ShoppingScreen.js").then((m) => ({
    default: m.ShoppingScreen,
  })),
);
export const MoreScreen = lazy(() =>
  import("./features/more/MoreScreen.js").then((m) => ({
    default: m.MoreScreen,
  })),
);
export const SettingsScreen = lazy(() =>
  import("./features/settings/SettingsScreen.js").then((m) => ({
    default: m.SettingsScreen,
  })),
);
export const PackScreen = lazy(() =>
  import("./features/cuisines/PackScreen.js").then((m) => ({
    default: m.PackScreen,
  })),
);
export const CookScreen = lazy(() =>
  import("./features/cook/CookScreen.js").then((m) => ({
    default: m.CookScreen,
  })),
);
export const TelegramScreen = lazy(() =>
  import("./features/telegram/TelegramScreen.js").then((m) => ({
    default: m.TelegramScreen,
  })),
);
/** A receipt photo, being read (specs/129). */
export const ReceiptScreen = lazy(() =>
  import("./features/receipt/ReceiptScreen.js").then((m) => ({
    default: m.ReceiptScreen,
  })),
);
export const StaplesScreen = lazy(() =>
  import("./features/staples/StaplesScreen.js").then((m) => ({
    default: m.StaplesScreen,
  })),
);
