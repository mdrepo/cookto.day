import { lazy, Suspense } from "react";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { useDocumentTheme } from "./features/settings/useDocumentTheme.js";
import { Tabs } from "./features/tabs/Tabs.js";
import { useMovedDishes } from "./moves.js";
import { useRoute } from "./routes.js";
import { useSync } from "./sync.js";
import { SaveProblem } from "./features/saving/SaveProblem.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows. The
// language is chosen on setup's first step and in Settings, not on every
// page (#84). Every page after setup has the tab bar, so on a wide screen
// each one sits beside the rail, at the same place.

// Pages a first visit doesn't show load when someone opens them, so the
// first page stays within its budget as the app grows (ADR 0013; #95, #97).
// Setup and Today come with the first page; Settings is under More now
// (specs/175), so it loads when opened too.
const DishScreen = lazy(() =>
  import("./features/dish/DishScreen.js").then((m) => ({
    default: m.DishScreen,
  })),
);
const DishesScreen = lazy(() =>
  import("./features/dishes/DishesScreen.js").then((m) => ({
    default: m.DishesScreen,
  })),
);
const CuisinesScreen = lazy(() =>
  import("./features/cuisines/CuisinesScreen.js").then((m) => ({
    default: m.CuisinesScreen,
  })),
);
const PantryScreen = lazy(() =>
  import("./features/pantry/PantryScreen.js").then((m) => ({
    default: m.PantryScreen,
  })),
);
const ItemSheet = lazy(() =>
  import("./features/pantry/ItemSheet.js").then((m) => ({
    default: m.ItemSheet,
  })),
);
const ShoppingScreen = lazy(() =>
  import("./features/shopping/ShoppingScreen.js").then((m) => ({
    default: m.ShoppingScreen,
  })),
);
const MoreScreen = lazy(() =>
  import("./features/more/MoreScreen.js").then((m) => ({
    default: m.MoreScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import("./features/settings/SettingsScreen.js").then((m) => ({
    default: m.SettingsScreen,
  })),
);
const PackScreen = lazy(() =>
  import("./features/cuisines/PackScreen.js").then((m) => ({
    default: m.PackScreen,
  })),
);
const CookScreen = lazy(() =>
  import("./features/cook/CookScreen.js").then((m) => ({
    default: m.CookScreen,
  })),
);
const TelegramScreen = lazy(() =>
  import("./features/telegram/TelegramScreen.js").then((m) => ({
    default: m.TelegramScreen,
  })),
);
const StaplesScreen = lazy(() =>
  import("./features/staples/StaplesScreen.js").then((m) => ({
    default: m.StaplesScreen,
  })),
);

export function App() {
  useDocumentLanguage();
  useDocumentTheme();
  useMovedDishes();
  useSync();
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}

/** The tab bar, with a failed save's note just above it (specs/138). */
function Bar({ current }: { current: Parameters<typeof Tabs>[0]["current"] }) {
  return (
    <>
      <SaveProblem />
      <Tabs current={current} />
    </>
  );
}

function Page() {
  const route = useRoute();
  switch (route) {
    case "home":
      return (
        <HomeScreen
          bar={<Bar current={route} />}
          itemSheet={(id, onClose, onUsedUp) => (
            <Suspense fallback={null}>
              <ItemSheet id={id} onClose={onClose} onUsedUp={onUsedUp} />
            </Suspense>
          )}
        />
      );
    case "settings":
      return <SettingsScreen bar={<Bar current={route} />} />;
    case "cuisines":
      return <CuisinesScreen bar={<Bar current={route} />} />;
    case "staples":
      return <StaplesScreen bar={<Bar current={route} />} />;
    case "pantry":
      return <PantryScreen bar={<Bar current={route} />} />;
    case "dish":
      return <DishScreen bar={<Bar current={route} />} />;
    case "list":
      return <ShoppingScreen bar={<Bar current={route} />} />;
    case "dishes":
      return <DishesScreen bar={<Bar current={route} />} />;
    case "more":
      return <MoreScreen bar={<Bar current={route} />} />;
    case "pack":
      return <PackScreen bar={<Bar current={route} />} />;
    case "cook":
      return <CookScreen />;
    case "telegram":
      return <TelegramScreen />;
    default:
      return (
        <OnboardingScreen
          step={route}
          language={route === "where" ? <LanguagePicker /> : null}
        />
      );
  }
}
