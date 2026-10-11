import {
  ArrowLeft,
  Calendar,
  Camera,
  Carrot,
  Check,
  ChevronDown,
  ChevronRight,
  CookingPot,
  FileText,
  LoaderCircle,
  type LucideIcon,
  Minus,
  Plus,
  Refrigerator,
  Search,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import styles from "./Icon.module.css";

// The only file that imports Lucide (ADR 0020, design:check). These are the
// icons a code owner has approved (specs/18-icons.md, 29-button-card.md); a new one needs one
// too. `turns` marks icons that point, which turn round in right to left.
const ICONS = {
  "arrow-left": { svg: ArrowLeft, turns: true },
  calendar: { svg: Calendar },
  camera: { svg: Camera },
  carrot: { svg: Carrot },
  check: { svg: Check },
  "chevron-down": { svg: ChevronDown },
  "chevron-right": { svg: ChevronRight, turns: true },
  "cooking-pot": { svg: CookingPot },
  "file-text": { svg: FileText },
  "loader-circle": { svg: LoaderCircle },
  minus: { svg: Minus },
  plus: { svg: Plus },
  refrigerator: { svg: Refrigerator },
  search: { svg: Search },
  "shopping-cart": { svg: ShoppingCart },
  "trash-2": { svg: Trash2 },
  "triangle-alert": { svg: TriangleAlert },
  upload: { svg: Upload },
  x: { svg: X },
} satisfies Record<string, { svg: LucideIcon; turns?: true }>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  /** sm 16px, md 20px (the default), lg 24px: the --icon-* tokens. */
  size?: "sm" | "md" | "lg";
  /** What it means, when it means something on its own. Without one, it's decoration. */
  label?: string;
}

/** A small sign, drawn in the colour of its text. */
export function Icon({ name, size = "md", label }: IconProps) {
  const icon: { svg: LucideIcon; turns?: true } = ICONS[name];
  const Svg = icon.svg;
  const className = [styles[size], icon.turns && styles.turns]
    .filter(Boolean)
    .join(" ");
  return label ? (
    <Svg
      className={className}
      role="img"
      aria-label={label}
      focusable="false"
    />
  ) : (
    <Svg className={className} aria-hidden="true" focusable="false" />
  );
}
