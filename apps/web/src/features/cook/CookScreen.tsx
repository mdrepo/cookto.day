import { Card, LinkOut, Photo, Rows, Screen, Stack } from "@cookto/ui";
import { useCookPage } from "./useCookPage.js";

/**
 * The cook's recipes (specs/241), opened from her plan in Telegram: each
 * meal's dish with its photo, its amounts for the people eating it, and a
 * link to its recipe. No tabs: it's the one page she came for.
 */
export function CookScreen() {
  const s = useCookPage();
  return (
    <Screen title={s.title}>
      <Stack gap={4}>
        {s.meals.map((meal) => (
          <Card key={meal.key} title={meal.label} level={2}>
            <Stack gap={2}>
              <Photo src={meal.photo} alt={meal.dish} shape="wide" />
              <h3>{meal.dish}</h3>
              <p>{meal.forPeople}</p>
              <Rows label={meal.dish} rows={meal.ingredients} />
              {meal.recipe && (
                <LinkOut href={meal.recipe.href}>{meal.recipe.label}</LinkOut>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}
