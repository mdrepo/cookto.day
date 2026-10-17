import { lazy, Suspense } from "react";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { SettingsScreen } from "./features/settings/SettingsScreen.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { useDocumentTheme } from "./features/settings/useDocumentTheme.js";
import { Tabs } from "./features/tabs/Tabs.js";
import { useRoute } from "./routes.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows. The
// language is chosen on setup's first step and in Settings, not on every
// page (#84). Every page after setup has the tab bar, so on a wide screen
// each one sits beside the rail, at the same place.

// Pages a first visit doesn't show load when someone opens them, so the
// first page stays within its budget as the app grows (ADR 0013; #95, #97).
// Setup, Today and Settings come with the first page.
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
const StaplesScreen = lazy(() =>
  import("./features/staples/StaplesScreen.js").then((m) => ({
    default: m.StaplesScreen,
  })),
);

export function App() {
  useDocumentLanguage();
  useDocumentTheme();
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}

function Page() {
  const route = useRoute();
  switch (route) {
    case "home":
      return (
        <HomeScreen
          bar={<Tabs current={route} />}
          itemSheet={(id, onClose, onUsedUp) => (
            <Suspense fallback={null}>
              <ItemSheet id={id} onClose={onClose} onUsedUp={onUsedUp} />
            </Suspense>
          )}
        />
      );
    case "settings":
      return <SettingsScreen bar={<Tabs current={route} />} />;
    case "cuisines":
      return <CuisinesScreen bar={<Tabs current={route} />} />;
    case "staples":
      return <StaplesScreen bar={<Tabs current={route} />} />;
    case "pantry":
      return <PantryScreen bar={<Tabs current={route} />} />;
    case "dish":
      return <DishScreen bar={<Tabs current={route} />} />;
    case "list":
      return <ShoppingScreen bar={<Tabs current={route} />} />;
    case "dishes":
      return <DishesScreen bar={<Tabs current={route} />} />;
    default:
      return (
        <OnboardingScreen
          step={route}
          language={route === "where" ? <LanguagePicker /> : null}
        />
      );
  }
}
