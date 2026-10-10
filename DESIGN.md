# DESIGN.md: how cookto.day looks

The rules for how every screen looks, for whoever builds UI here, people and agents. **You don't decide how something looks: this file does, or a code owner does.** If a screen needs something this file doesn't cover, stop and ask a code owner (@mdrepo) for the design. Don't invent one.

`bun run design:check` fails on colours, type, corners, spacing and directions that aren't allowed here ([ADR 0011](docs/adr/0011-design-guide-and-check.md)). The tokens live in [`src/styles.css`](src/styles.css).

## 1. Principles

- **A kitchen notebook.** Warm paper, dark ink, one herb-green for actions. Calm: nothing flashes, nothing shouts. The one exception is food about to go off, which gets the warm warning colour.
- **Their kitchen, their words.** Dish and ingredient names are the household's own, in their language. We never rename "dal" to "lentil soup".
- **Phone first, one hand.** One column, at most `40rem` wide, centred. Tap targets at least 44px high. People use it standing at the fridge.
- **Fast and private.** System fonts only, no icon fonts, no images from other sites. Emoji and plain text are the icons. The page has a size budget (`test/budget/page-size.test.ts`).
- **Every language, both directions.** Every screen works in English, Hindi, Marathi and Arabic, left to right and right to left. Use logical properties, never `left`/`right`.
- **Plain words.** Say what happened and what to do next ("We couldn't read this bill. Try the PDF from the app's order page."). Sentence case. No error codes.
- **Both themes.** Every screen works in light and dark. Using the variables does that for you.

## 2. Tokens

Use the variables, never a raw value. A token that's missing is added by a code owner, in `src/styles.css` (light and dark) and in this table.

### Colour

| Use | Variable |
|---|---|
| Page background (paper) | `var(--color-bg)` |
| Cards, panels, inputs | `var(--color-surface)` |
| Text (ink) | `var(--color-text)` |
| Secondary text: hints, dates, quantities | `var(--color-text-muted)` |
| Borders and dividers | `var(--color-border)` |
| Actions: the main button, selected state, links | `var(--color-accent)` |
| Text and icons on `--color-accent` | `var(--color-on-accent)` |
| About to go off, errors | `var(--color-warn)` |

### Type

System fonts only: `font-family: var(--font-body)` (it includes Devanagari and Arabic system fonts). Line height `var(--leading)`.

| Variable | Size | Used for |
|---|---|---|
| `--text-sm` | 0.875rem | hints, notes, labels, quantities |
| `--text-md` | 1rem | body text and list items (the default) |
| `--text-lg` | 1.25rem | section and card titles |
| `--text-xl` | 1.75rem | the page title |

Weights: `400` body, `600` titles and labels, `700` the page title and the main button.

### Corners

| Variable | Used for |
|---|---|
| `--radius-sm` (4px) | tags, small badges |
| `--radius-md` (8px) | buttons, inputs, selects |
| `--radius-lg` (16px) | cards and panels |
| `--radius-full` | pills, round buttons, counts |

### Spacing

Steps of 4px, as `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-6` (24px), `--space-8` (32px). Screen side padding `--space-4`. Between blocks `--space-4` or `--space-6`.

### Direction

Always the logical form: `margin-inline-start` not `margin-left`, `padding-inline`, `inset-inline-end` not `right`, `text-align: start` not `left`, `border-inline-start`. In TypeScript, the same: no `style.marginLeft`.

## 3. Components

Build screens from these, reusing their classes as they are. **Reuse before you add.** A new component, or a new variant of one, needs a design from a code owner first (in the issue).

| Need | Use | Notes |
|---|---|---|
| Every page | `.site-header` + `.page` | Title, tagline, language switch; one centred column |
| A choice from a short list | `.field` with `.field-select` | Label first, then the control. 44px high |
| Nothing to show yet | `.empty-state` with `.empty-title` and `.empty-body` | Dashed border on the surface colour. One sentence that says what to do next |
| A quiet note | `.note` | Muted, small, centred. For reassurance ("Nothing is uploaded"), not for errors |

Not designed yet, so ask before building: the bill upload, the pantry list, a dish card, the "use it today" warning, the shopping list, buttons.

**Motion:** none yet. No animations without a code owner.

**HTML:** `textContent` and `createElement`, never `innerHTML` (AGENTS.md).

## 4. When the design isn't settled

A task that changes how something looks should say how in the issue: "use `.empty-state`", a screenshot, or a sketch from a code owner. If it doesn't, and this file doesn't cover it:

1. Stop before writing the UI.
2. Write down what's needed ("a warning on spinach that goes off tomorrow: there's no warning style yet") and ask a code owner.
3. Once they answer, they add the decision to this file, in the same PR or a separate one.

Every UI change attaches screenshots in **light and dark**, in **English and Arabic**, to its PR.
