import styles from "./Logo.module.css";
import logo from "./logo.svg";

/** The pot, the app's logo. Decoration, unless it's given a label. */
export function Logo({ label = "" }: { label?: string }) {
  return (
    <img
      className={styles.logo}
      src={logo}
      alt={label}
      width={72}
      height={52}
    />
  );
}
