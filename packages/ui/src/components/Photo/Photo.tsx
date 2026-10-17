import { Icon } from "../Icon/Icon.js";
import styles from "./Photo.module.css";

/** Each shape's size, so its space is kept before the photo arrives. */
const SIZE = {
  wide: { width: 800, height: 600 },
  square: { width: 160, height: 160 },
} as const;

/**
 * A dish's photo (specs/118): it loads when it's near the screen, unless the
 * screen needs it at once, and its space is kept, so nothing jumps when it
 * arrives. Without a photo: a plain tile with the pot.
 */
export function Photo({
  src,
  alt,
  shape,
  eager = false,
}: {
  src?: string | undefined;
  /** What it shows; "" when the words beside it already say. */
  alt: string;
  /** wide: 4 by 3, a dish's page. square: a row in a list. */
  shape: "wide" | "square";
  /** At the top of a page: load it now. */
  eager?: boolean;
}) {
  if (!src)
    return (
      <span
        className={`${styles.photo} ${styles[shape]} ${styles.tile}`}
        aria-hidden="true"
      >
        <Icon name="cooking-pot" size={shape === "wide" ? "lg" : "md"} />
      </span>
    );
  return (
    <img
      className={`${styles.photo} ${styles[shape]}`}
      src={src}
      alt={alt}
      {...SIZE[shape]}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
