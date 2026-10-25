import { Suspense } from "react";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { useDocumentTheme } from "./features/settings/useDocumentTheme.js";
import { Tabs } from "./features/tabs/Tabs.js";
import { useMovedDishes } from "./moves.js";
import { stepOf, useRoute } from "./routes.js";
import {
  CookScreen,
  CuisinesScreen,
  DishesScreen,
  DishScreen,
  ItemSheet,
  MoreScreen,
  PackScreen,
  PantryScreen,
  ReceiptScreen,
  SettingsScreen,
  ShoppingScreen,
  StaplesScreen,
  TelegramScreen,
} from "./screens.js";
import { useSync } from "./sync.js";
import { SaveProblem } from "./features/saving/SaveProblem.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows. The
// language is chosen on setup's first step and in Settings, not on every
// page (#84). Every page after setup has the tab bar, so on a wide screen
// each one sits beside the rail, at the same place.

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
    case "receipt":
      return <ReceiptScreen bar={<Bar current="pantry" />} />;
    default:
      return (
        <OnboardingScreen
          step={stepOf(route)}
          language={route === "where" ? <LanguagePicker /> : null}
        />
      );
  }
}
