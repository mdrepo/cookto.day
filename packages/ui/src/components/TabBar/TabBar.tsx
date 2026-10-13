import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./TabBar.module.css";

export interface Tab {
  key: string;
  label: string;
  icon: IconName;
  current?: boolean;
}

export interface TabBarProps {
  /** Names the navigation for screen readers. */
  label: string;
  tabs: readonly Tab[];
  onPick: (key: string) => void;
}

/** The bar at the bottom between the app's main pages (the prototype's). */
export function TabBar({ label, tabs, onPick }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={styles.tab}
          aria-current={tab.current ? "page" : undefined}
          onClick={() => {
            onPick(tab.key);
          }}
        >
          <Icon name={tab.icon} size="lg" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
