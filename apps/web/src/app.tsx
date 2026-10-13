import { HomeScreen } from "./features/home/HomeScreen.js";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { useRoute } from "./routes.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another, and which one shows.

export function App() {
  useDocumentLanguage();
  const route = useRoute();
  const picker = <LanguagePicker />;
  return route === "home" ? (
    <HomeScreen header={picker} />
  ) : (
    <OnboardingScreen step={route} header={picker} />
  );
}
