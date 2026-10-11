import type { Space } from "../tokens.js";
import gaps from "./gap.module.css";

/** The class that spaces a layout's parts by a spacing step. */
export const gapClass = (step: Space): string | undefined => gaps[`gap${step}`];
