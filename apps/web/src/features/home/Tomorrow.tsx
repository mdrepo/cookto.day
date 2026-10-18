import { Rows, Section } from "@cookto/ui";
import { useTomorrow } from "./useTomorrow.js";

/** Tomorrow's picks, from 4 pm (specs/144). */
export function Tomorrow() {
  const s = useTomorrow();
  if (!s) return null;
  return (
    <Section title={s.title}>
      <Rows label={s.title} rows={s.rows} />
    </Section>
  );
}
