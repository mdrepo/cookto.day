import { CuisinesScreen } from "./features/cuisines/CuisinesScreen.js";
import { DishesScreen } from "./features/dishes/DishesScreen.js";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { PantryScreen } from "./features/pantry/PantryScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { SettingsScreen } from "./features/settings/SettingsScreen.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { StaplesScreen } from "./features/staples/StaplesScreen.js";
import { Tabs } from "./features/tabs/Tabs.js";
import { useRoute } from "./routes.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows. The
// language is chosen on setup's first step and in Settings, not on every
// page (#84).

export function App() {
  useDocumentLanguage();
  const route = useRoute();
  switch (route) {
    case "home":
      return (
        <>
          <HomeScreen />
          <Tabs current={route} />
        </>
      );
    case "settings":
      return <SettingsScreen />;
    case "cuisines":
      return <CuisinesScreen />;
    case "staples":
      return <StaplesScreen />;
    case "pantry":
      return (
        <>
          <PantryScreen />
          <Tabs current={route} />
        </>
      );
    case "dishes":
      return (
        <>
          <DishesScreen />
          <Tabs current={route} />
        </>
      );
    default:
      return (
        <OnboardingScreen
          step={route}
          language={route === "where" ? <LanguagePicker /> : null}
        />
      );
  }
}
