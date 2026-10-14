import { lazy, Suspense } from "react";
import { CuisinesScreen } from "./features/cuisines/CuisinesScreen.js";
import { DishesScreen } from "./features/dishes/DishesScreen.js";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { PantryScreen } from "./features/pantry/PantryScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { SettingsScreen } from "./features/settings/SettingsScreen.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { useDocumentTheme } from "./features/settings/useDocumentTheme.js";
import { StaplesScreen } from "./features/staples/StaplesScreen.js";
import { Tabs } from "./features/tabs/Tabs.js";
import { useRoute } from "./routes.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows. The
// language is chosen on setup's first step and in Settings, not on every
// page (#84). Every page after setup has the tab bar, so on a wide screen
// each one sits beside the rail, at the same place.

// A dish's page loads when someone opens one, not with the first page (#95).
const DishScreen = lazy(() =>
  import("./features/dish/DishScreen.js").then((m) => ({
    default: m.DishScreen,
  })),
);

export function App() {
  useDocumentLanguage();
  useDocumentTheme();
  const route = useRoute();
  switch (route) {
    case "home":
      return <HomeScreen bar={<Tabs current={route} />} />;
    case "settings":
      return <SettingsScreen bar={<Tabs current={route} />} />;
    case "cuisines":
      return <CuisinesScreen bar={<Tabs current={route} />} />;
    case "staples":
      return <StaplesScreen bar={<Tabs current={route} />} />;
    case "pantry":
      return <PantryScreen bar={<Tabs current={route} />} />;
    case "dish":
      return (
        <Suspense fallback={null}>
          <DishScreen bar={<Tabs current={route} />} />
        </Suspense>
      );
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
