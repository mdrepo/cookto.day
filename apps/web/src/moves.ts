import { keepMovedDishes } from "@cookto/usecases";
import { useEffect } from "react";
import { kitchen } from "./platform.js";

/** Once, when the app opens: dishes that moved pack stay (specs/147). */
export function useMovedDishes(): void {
  useEffect(() => {
    void keepMovedDishes(kitchen);
  }, []);
}
