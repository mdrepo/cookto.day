import { Reminders, Section } from "@cookto/ui";
import { usePrepNotes } from "./usePrepNotes.js";

/** Prep that's due, tonight or this morning (specs/144). */
export function PrepNotes() {
  const s = usePrepNotes();
  if (!s || s.items.length === 0) return null;
  return (
    <Section title={s.title}>
      <Reminders label={s.title} items={s.items} />
    </Section>
  );
}
