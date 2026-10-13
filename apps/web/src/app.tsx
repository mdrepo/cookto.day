import { QueryClientProvider } from "@tanstack/react-query";
import { HomeScreen } from "./features/home/HomeScreen.js";
import { LanguagePicker } from "./features/settings/LanguagePicker.js";
import { useDocumentLanguage } from "./features/settings/useDocumentLanguage.js";
import { queries } from "./platform.js";

// The app: features put together (ADR 0022). Features don't import each
// other, so this is where one sits inside another.

export function App() {
  useDocumentLanguage();
  return (
    <QueryClientProvider client={queries}>
      <HomeScreen header={<LanguagePicker />} />
    </QueryClientProvider>
  );
}
