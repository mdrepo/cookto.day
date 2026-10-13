import { CuisinesScreen } from "./features/cuisines/CuisinesScreen.js";
import { DishesScreen } from "./features/dishes/DishesScreen.js";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { PantryScreen } from "./features/pantry/PantryScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { StaplesScreen } from "./features/staples/StaplesScreen.js";
import { Tabs } from "./features/tabs/Tabs.js";
import { useRoute } from "./routes.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows.

export function App() {
  useDocumentLanguage();
  const route = useRoute();
  const picker = <LanguagePicker />;
  switch (route) {
    case "home":
      return (
        <>
          <HomeScreen header={picker} />
          <Tabs current={route} />
        </>
      );
    case "cuisines":
      return <CuisinesScreen header={picker} />;
    case "staples":
      return <StaplesScreen header={picker} />;
    case "pantry":
      return (
        <>
          <PantryScreen header={picker} />
          <Tabs current={route} />
        </>
      );
    case "dishes":
      return (
        <>
          <DishesScreen header={picker} />
          <Tabs current={route} />
        </>
      );
    default:
      return <OnboardingScreen step={route} header={picker} />;
  }
}
