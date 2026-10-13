# DESIGN.md: how cookto.day looks

The rules for how every screen looks, for whoever builds UI here, people and agents. **You don't decide how something looks: this file does, or a code owner does.** If a screen needs something this file doesn't cover, stop and ask a code owner (@mdrepo) for the design. Don't invent one.

`bun run design:check` fails on colours, type, corners, spacing and directions that aren't allowed here ([ADR 0011](docs/adr/0011-design-guide-and-check.md)). The tokens live in [`packages/ui/tokens/`](packages/ui/tokens/) ([ADR 0019](docs/adr/0019-design-system.md)).

## 1. Principles

- **A kitchen notebook.** Warm paper, dark ink, one aubergine for actions. Calm: nothing flashes, nothing shouts. The one exception is food about to go off, which gets the warm warning colour.
- **Their kitchen, their words.** Dish and ingredient names are the household's own, in their language. We never rename "dal" to "lentil soup".
- **Phone first, one hand.** One column, at most `40rem` wide, centred. Tap targets at least 44px high. People use it standing at the fridge.
- **Fast and private.** System fonts only, no icon fonts, no images from other sites. Icons are Lucide's, through `Icon` ([ADR 0020](docs/adr/0020-icons-lucide.md)), never emoji. The page has a size budget (`apps/web/test/budget/page-size.test.ts`).
- **Every language, both directions.** Every screen works in English, Hindi, Marathi and Arabic, left to right and right to left. Use logical properties, never `left`/`right`.
- **Plain words.** Say what happened and what to do next ("We couldn't read this bill. Try the PDF from the app's order page."). Sentence case. No error codes.
- **Both themes.** Every screen works in light and dark. Using the variables does that for you.

## 2. Tokens

Use the variables, never a raw value. A token that's missing is added by a code owner, in `packages/ui/tokens/*.tokens.json`; then `bun run tokens` writes the CSS variables and the tables below. Don't edit the tables by hand: `design:check` fails when they differ from the tokens, or when text in either theme is hard to read (WCAG AA).

### Colour

<!-- tokens:color -->

| Use                                                                                       | Variable                   | Light   | Dark    |
| ----------------------------------------------------------------------------------------- | -------------------------- | ------- | ------- |
| Page background (paper)                                                                   | `var(--color-bg)`          | #fbf7f0 | #1c1a17 |
| Cards, panels, inputs                                                                     | `var(--color-surface)`     | #fffdf9 | #26231f |
| Text (ink)                                                                                | `var(--color-text)`        | #2b2622 | #f1ebe2 |
| Secondary text: hints, dates, quantities                                                  | `var(--color-text-muted)`  | #6b6259 | #b3a99c |
| Borders and dividers                                                                      | `var(--color-border)`      | #e6ddd0 | #3a352f |
| Actions: the main button, selected state, links                                           | `var(--color-accent)`      | #6e3b5f | #d9a3c6 |
| A soft fill behind a selected chip or row                                                 | `var(--color-accent-soft)` | #f1e4ec | #3a2934 |
| Text and icons on `--color-accent`                                                        | `var(--color-on-accent)`   | #fffdf9 | #1c1a17 |
| The main button's fill, never text: aubergine, deep enough for white words in both themes | `var(--color-action)`      | #6e3b5f | #8a4f78 |
| Words and icons on `--color-action`: white                                                | `var(--color-on-action)`   | #fffdf9 | #fffdf9 |
| About to go off, errors                                                                   | `var(--color-warn)`        | #a64b17 | #e8955f |

<!-- /tokens:color -->

### Type

System fonts only: `font-family: var(--font-body)` (it includes Devanagari and Arabic system fonts). Line height `var(--leading)`; Hindi, Marathi and Arabic get `var(--leading-tall)` from the foundation.

<!-- tokens:text -->

| Variable         | Value    | Used for                               |
| ---------------- | -------- | -------------------------------------- |
| `var(--text-sm)` | 0.875rem | Hints, notes, labels, quantities       |
| `var(--text-md)` | 1rem     | Body text and list items (the default) |
| `var(--text-lg)` | 1.25rem  | Section and card titles                |
| `var(--text-xl)` | 1.75rem  | The page title                         |

<!-- /tokens:text -->

Weights: `400` body, `600` titles and labels, `700` the page title and the main button.

### Corners

<!-- tokens:radius -->

| Variable             | Value | Used for                     |
| -------------------- | ----- | ---------------------------- |
| `var(--radius-sm)`   | 4px   | Tags, small badges           |
| `var(--radius-md)`   | 8px   | Buttons, inputs, selects     |
| `var(--radius-lg)`   | 16px  | Cards and panels             |
| `var(--radius-full)` | 999px | Pills, round buttons, counts |

<!-- /tokens:radius -->

### Spacing

Steps of 4px. Screen side padding `--space-4`. Between blocks `--space-4` or `--space-6`.

<!-- tokens:space -->

| Variable         | Value | Used for                                 |
| ---------------- | ----- | ---------------------------------------- |
| `var(--space-1)` | 4px   | Tight gaps, like a title and its tagline |
| `var(--space-2)` | 8px   | Between a label and its control          |
| `var(--space-3)` | 12px  | Inside a control, side to side           |
| `var(--space-4)` | 16px  | Screen side padding; between blocks      |
| `var(--space-6)` | 24px  | Between sections                         |
| `var(--space-8)` | 32px  | Around an empty state                    |

<!-- /tokens:space -->

### Icons

`<Icon name="carrot" />` from `@cookto/ui`, never emoji, another SVG or a direct `lucide-react` import (`design:check`). Only the names in `Icon.tsx` are allowed; a new one needs a code owner. An icon takes its text's colour. With a `label` it's read out ("Remove"); without one it's decoration, and screen readers skip it. Never an icon instead of words where there's room for words. Arrows and chevrons turn round in Arabic by themselves.

<!-- tokens:icon -->

| Variable         | Value | Used for                                        |
| ---------------- | ----- | ----------------------------------------------- |
| `var(--icon-sm)` | 16px  | Icons in small text: hints, labels, chips       |
| `var(--icon-md)` | 20px  | Icons in body text and list rows (the default)  |
| `var(--icon-lg)` | 24px  | Icons on their own, like a close or back button |

<!-- /tokens:icon -->

### Foundation

[`packages/ui/src/foundation.css`](packages/ui/src/foundation.css) sets the page itself, once for every screen: the body's colours and type, taller lines for Devanagari and Arabic, an aubergine focus outline for keyboards, controls at least 44px tall, and no motion for people who turn it off. Don't restyle these on a screen; if one is wrong, change the foundation.

### Direction

Always the logical form: `margin-inline-start` not `margin-left`, `padding-inline`, `inset-inline-end` not `right`, `text-align: start` not `left`, `border-inline-start`. In TypeScript, the same: no `style.marginLeft`.

## 3. Components

Build screens from these React components, imported from `@cookto/ui` ([ADR 0019](docs/adr/0019-design-system.md)). **Reuse before you add.** A new component, or a new variant of one, needs a design from a code owner first (in the issue). See each one, in every theme, language and state, on the kit page: [cookto.day/kit/](https://cookto.day/kit/) (`bun run --cwd apps/kit dev`).

| Need                             | Use          | Notes                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A label and its control          | `Field`      | Label first, then the control, then any problem in the warning colour. `layout="inline"` in a header                                                                                                                                                                                                                                                                                                            |
| A choice from a short list       | `Select`     | The browser's own select, drawn by us with a `chevron-down` at its end, so it's 44px high on iPhones too. Always inside a `Field`. Can be disabled `wide`: as wide as where it sits, in a sheet.                                                                                                                                                                                                                |
| Nothing to show yet              | `EmptyState` | Dashed border on the surface colour. A title and one sentence that says what to do next                                                                                                                                                                                                                                                                                                                         |
| A welcome, a sample, a next step | `Callout`    | The prototype's warm card: a soft aubergine fill (`--color-accent-soft`), no border, large corners. A title, one sentence, and its buttons inside, the main one first                                                                                                                                                                                                                                           |
| The app's logo                   | `Logo`       | The pot (`logo.svg`), 72 by 52, in a warm card. Decoration unless it has a `label`. In dark it sits on a light backing (`--color-text`), so its ink outlines show. Never recoloured                                                                                                                                                                                                                             |
| The app's logo                   | `Logo`       | The pot (`logo.svg`), 72 by 52, in a warm card. Decoration unless it has a `label`. In dark it sits on a light backing (`--color-text`), so its ink outlines show. Never recoloured                                                                                                                                                                                                                             |
| A quiet note                     | `Note`       | Muted, small, centred. For reassurance ("Nothing is uploaded"), never for errors                                                                                                                                                                                                                                                                                                                                |
| A sign: back, remove, a carrot   | `Icon`       | `name` from its list, `size` sm, md or lg, and a `label` when it means something on its own. See Icons above                                                                                                                                                                                                                                                                                                    |
| An action                        | `Button`     | `kind`: one `main` (aubergine, white words, in both themes) per screen, `quiet` for the rest, `danger` to remove, `plain` (no frame) for a way out or a small action in a card. `busy` while it works; `disabled` when it can't. An `icon` before the words, or alone with a `label`                                                                                                                            |
| One thing: a dish, a pantry item | `Card`       | Surface colour, border, large corners. Its `title` names it for screen readers; `level` sets its heading under the screen's; an `action` (a plain icon button: remove) sits at the title's end                                                                                                                                                                                                                  |
| One choice, on or off            | `Chip`       | A toggle button (`aria-pressed`), pill-shaped, 44px. Ticked: accent fill with a `check`; not ticked: surface with a border. For meals someone eats                                                                                                                                                                                                                                                              |
| A small label beside something   | `Tag`        | Small bold words in a pill. `tone` soft (accent-soft fill: "toddler food"), outline (border, muted: "Coming soon") or warn (warning-colour words and border: "Past its best", "Use soon")                                                                                                                                                                                                                       |
| Somewhere to type a few words    | `Input`      | The browser's own text box, 44px, the page colour inside a border. Always inside a `Field`, which names it                                                                                                                                                                                                                                                                                                      |
| One answer from a few cards      | `Choice`     | Radio buttons in a `fieldset`, each a whole card with a title and a line under it; the radio at the start. Chosen: accent-soft fill, accent border. An option with `soon` is dashed, muted and disabled, with an outline `Tag`. `hideLegend` when the screen's title already asks the question                                                                                                                  |
| Where someone is in a few steps  | `Steps`      | "Step 1 of 2" in muted small words, then a thin bar per step, accent up to this one; the bars are hidden from screen readers                                                                                                                                                                                                                                                                                    |
| Each meal, with who it's for     | `Rows`       | A list of labels with their values at the end, on one surface with a border; a line between rows. A `quiet` value is muted ("Not planned")                                                                                                                                                                                                                                                                      |
| One meal's best dish             | `Pick`       | The prototype's "Tonight": an article named by its meal (small, muted heading), the dish in large bold words, what it's served with, then its `Reasons` and a plain "Other ideas"                                                                                                                                                                                                                               |
| Why something is suggested       | `Reasons`    | A dot, then a few words, per reason. `tone` warm (warning-colour dot: uses food that needs using), good (aubergine dot: "Has everything"), quiet (border-colour dot, muted words: "Needs: …")                                                                                                                                                                                                                   |
| Moving between the main pages    | `TabBar`     | The bar at the bottom: sticky, on the surface above a border, a button per page with its icon (lg) over its name, each at least 44px. The current page (`aria-current`) is aubergine. Starts from the right in Arabic                                                                                                                                                                                           |
| A list you tap, a row per thing  | `ItemList`   | One surface with a border, a line between rows. Each row is a whole button, 44px or more: the name (bold), a muted line under it ("250 g · use within 3 days"), a `Tag` or an amount at the end. It opens a `Sheet`                                                                                                                                                                                             |
| One thing's controls             | `Sheet`      | The browser's own modal dialog, from the bottom, as wide as the column, large top corners, the page behind dimmed. Its title names it; a plain `x` button closes it, so does Escape, and focus goes back to what opened it A tap outside it closes it too. Room at its bottom above the phone's edge. Inside, controls are as wide as the sheet (`Select wide`, buttons in a `Cluster fill`), for either thumb. |

### Layouts

How parts sit together. Screens are layouts filled with parts; the space between parts comes only from a layout's `gap`, a spacing step (`gap={4}` is `--space-4`). A gap that isn't a step fails the typecheck.

| Need                           | Use         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A whole page                   | `Screen`    | The prototype's light header: a small muted `eyebrow` (the date), the `title`, a `tagline` if the page needs one, and at most one `action` at the title's end (a settings gear, "Add food"). `header` sits above the title (the steps). No line under it. Then the main part: one centred column, at most 40rem, 16px at the sides on a phone, 16px between parts `bar` sits at the screen's bottom however short the page: the `TabBar`. |
| Parts one above the other      | `Stack`     | `gap`, default 4. Most of a screen is stacks                                                                                                                                                                                                                                                                                                                                                                                              |
| Two panes, like a tablet app   | `Panes`     | `primary` and `secondary`. On a phone, one above the other, the secondary first; on a wide screen (840px, the Screen's width, as Android's) side by side, the primary at the start and twice as wide. Today: Cook today and Use soon. The fridge: Fresh and Staples, and Use soon                                                                                                                                                         |
| A part of a page under a title | `Section`   | Its title small (`--text-sm`), 600 and muted, 8px above what it names; `tone="warn"` makes it warm, for food to use soon. Never a big heading for a section                                                                                                                                                                                                                                                                               |
| Parts side by side that wrap   | `Cluster`   | `gap`, default 2. Buttons in a row, chips. Starts from the right in Arabic `fill`: each part takes an equal share of the row, like a sheet's buttons.                                                                                                                                                                                                                                                                                     |
| The actions at the bottom      | `ActionBar` | Sticky at the bottom, on the surface above a border. Actions side by side, the last (the main one) takes the room; `below` holds a way out, like a plain "Skip for now"                                                                                                                                                                                                                                                                   |

**Apps don't style.** An app's `src/` has no CSS of its own (`design:check`): if a screen needs something, it's a part or a layout in `@cookto/ui`. The kit page's frame is the one exception.

A component has no outer margin: the space between parts belongs to the screen (and later, to layouts). Every component has the same files, which `design:check` checks: `<Name>.tsx`, `<Name>.module.css` and `<Name>.kit.tsx` in `packages/ui/src/components/<Name>/`, its test in `packages/ui/test/`, and a row here.

**Today** (the prototype's Today): the date above the title, a settings gear at its end; the sample or the empty kitchen as a `Callout`; then "Use soon" and "Cook today", each a `Section` (an `ItemList`, then a `Pick` per meal someone eats), and the `TabBar`. **The fridge** (the prototype's Fridge; the code calls it the pantry): "Add food" at the title's end, then "Use soon", "Fresh" and "Staples", each a `Section` holding an `ItemList`; a row opens its `Sheet` (how it is, change amount, used up). **Wide screens** (840px and up, like a laptop) are the same app in panes, as tablet apps do: the `TabBar` is a rail down the start side, Today and the fridge are `Panes` in a `wide` `Screen`, and a `Sheet` is a dialog in the middle. Not a separate app. **The language** is chosen on setup's first step and in Settings, never on every page. **The "use it today" warning** is the warn `Tag`: never a fill, a banner or a red screen.

Not designed yet, so ask before building: the bill upload, the shopping list, a link that looks like a button.

**Motion:** only the busy button's turning circle (`Button`). The foundation stops it, and every animation, for people who turn motion off. No other animation without a code owner.

**HTML:** render text with JSX, never `dangerouslySetInnerHTML` or `innerHTML` (AGENTS.md).

## 4. When the design isn't settled

A task that changes how something looks should say how in the issue: "use `.empty-state`", a screenshot, or a sketch from a code owner. If it doesn't, and this file doesn't cover it:

1. Stop before writing the UI.
2. Write down what's needed ("a warning on spinach that goes off tomorrow: there's no warning style yet") and ask a code owner.
3. Once they answer, they add the decision to this file, in the same PR or a separate one.

Every UI change attaches screenshots in **light and dark**, in **English and Arabic**, to its PR.
