import { type ReactNode, useId } from "react";
import styles from "./Section.module.css";

export interface SectionProps {
  /** Names the section, small and muted, just above it ("Fresh"). */
  title: string;
  /** warn: the title in the warm colour, for food to use soon. */
  tone?: "warn";
  children: ReactNode;
}

/** A part of a page under its small title (the prototype's "Recent", #84). */
export function Section({ title, tone, children }: SectionProps) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title} data-tone={tone}>
        {title}
      </h2>
      {children}
    </section>
  );
}
