import { Note, Screen } from "@cookto/ui";
import { useTelegramOpen } from "./useTelegramOpen.js";

/**
 * Tomorrow opened inside Telegram (specs/241), while it signs in; or, when
 * the proof doesn't hold, the one line saying where to open it from.
 */
export function TelegramScreen() {
  const s = useTelegramOpen();
  return (
    <Screen title={s.title}>{s.message && <Note>{s.message}</Note>}</Screen>
  );
}
