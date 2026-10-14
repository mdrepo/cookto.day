import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./LinkOut.module.css";

export interface LinkOutProps {
  /** Another site's address. */
  href: string;
  /** What it is: "See the recipe". */
  children: ReactNode;
}

/** The site's name, without "www.": vegrecipesofindia.com. */
const siteOf = (href: string) => new URL(href).hostname.replace(/^www\./, "");

/**
 * A link to another site, like a dish's recipe (#95). It names the site, so
 * people know where it goes, and opens in a new tab, so the app stays put.
 */
export function LinkOut({ href, children }: LinkOutProps) {
  return (
    <a
      className={styles.link}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.text}>
        <span className={styles.label}>{children}</span>
        <span className={styles.site}>{siteOf(href)}</span>
      </span>
      <Icon name="external-link" />
    </a>
  );
}
