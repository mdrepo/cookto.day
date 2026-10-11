# 0019. Build the UI from one design system in five layers, each checked by a script

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** Mayur

## Context

[0011](0011-design-guide-and-check.md) stops agents inventing colours and sizes, but it guards loose CSS in an app. As screens arrive (onboarding, the bill upload, the pantry, the week plan), agents will build buttons and cards again on every screen unless there is one place they come from, and one way to add another. Agents follow what a script makes easy and a check makes certain, so each layer here has both: a generator to start from, and a check that fails when it's skipped.

## Decision

The design system is a workspace, `packages/ui` (`@cookto/ui`), in five layers. Each layer may use only the layers above it.

1. **Tokens: the values.** One source, `packages/ui/tokens/*.tokens.json`, in the W3C Design Tokens (DTCG) format, in three tiers:
   - *primitive*: the palette and scales (`green-600`, `space-4`); nothing outside tokens uses them;
   - *semantic*: what a value is for, with a light and a dark value (`color.accent`, `color.text-muted`);
   - *component*: only when a component needs its own knob (`button.height`).

   `bun run tokens` generates the CSS variables, a TypeScript list of token names, and the token tables in `DESIGN.md`. Generated files are committed so reviews show the change, and `design:check` fails if they are stale. The check also fails when a text and background pair the tokens declare misses WCAG AA contrast, in either theme.
2. **Foundation: the page itself.** One `foundation.css`: reset, body type, the focus ring, light and dark, right to left, `prefers-reduced-motion`, 44px tap targets. Written once, never per screen.
3. **Components: the parts.** React function components in `packages/ui/src/components/<Name>/`, styled with CSS Modules (built into Bun, no runtime). Native elements first (`<button>`, `<dialog>`, `<select>`, `<details>`), so keyboard and screen readers work without a library. Variants are typed unions, not free strings. A component never sets its own outer margin: spacing between things belongs to layouts. Each component folder holds exactly:
   - `<Name>.tsx` and `<Name>.module.css`;
   - `<Name>.test.tsx`: its role and name, keyboard use, and right to left;
   - `<Name>.kit.tsx`: its examples for the kit page;
   - and a row in `DESIGN.md`.

   `design:check` fails when any of these is missing.
4. **Layouts: how parts sit together.** A few primitives (`Stack`, `Cluster`, `Screen`, `ActionBar` for the thumb's reach) whose props are token steps (`gap={4}`), never raw values. Screens are layouts filled with components.
5. **Scaffolding: the only way to add one.** `bun run new component <Name>`, `new layout <Name>` and `new screen <name>` write the files above from templates in `tooling/templates/`, so a new piece passes the checks from its first commit. The generator writes the test and kit entry with a stub that renders nothing, so the test is red until the part is built ([0002](0002-tdd-workflow.md)). The `add-component` agent skill says: run the generator, never hand-make the folder.

**Apps compose; they don't style.** `apps/*/src` imports UI from `@cookto/ui` only, and has no CSS files of its own. A screen that needs something new gets a component or layout first, through a code owner, as [0011](0011-design-guide-and-check.md) says.

**The kit page** (`apps/kit`) builds every `*.kit.tsx` into one static page, each example in light and dark, English and Arabic. It is where a code owner reviews a new part, and later what screenshot tests photograph (their own ADR: they need Docker for stable fonts).

**No new dependencies.** The token generator and scaffolder are our own small scripts.

**Order of PRs**, each with its issue, spec and tests:

0. The look: a few visual directions of one real screen, as a clickable prototype in every language, light and dark; a code owner picks one. Today's "kitchen notebook" tokens are the starting point, not a given.
1. Tokens and their generator, with the contrast check. The current CSS variables move here, with the values the direction gives them.
2. Foundation.
3. `packages/ui` and the kit page, with the first components today's page needs (`Field`, `Select`, `EmptyState`, `Note`), then `Button` and `Card`.
4. Layouts, and today's page rebuilt from them.
5. The generators and the `add-component` skill, then onboarding as the first feature built only from the kit.

## Alternatives

- **Style Dictionary** for tokens: does far more than we need, with a dependency tree to vet and keep healthy. Our tokens are JSON to CSS, about a hundred lines. Revisit if we ship tokens to Android or iOS.
- **Tailwind:** a large native-binary toolchain, and class strings that `design:check` can't read; agents can write any value inline.
- **Storybook:** a huge dependency tree for what one static kit page does.
- **Radix or React Aria** for behaviour: weight we don't need while native elements cover it. Revisit per component (a combobox, a date picker) in its own ADR.
- **CSS-in-JS:** runtime cost on every render, on cheap phones.
- **Plop or Hygen** for scaffolding: dependencies for what a template and a write call do.

## Consequences

- An agent asked for a screen finds the parts in the kit, and if one is missing, the generator and the check push it down the same road every time.
- Every look change starts in `tokens.json`; a contrast mistake fails the build, not a user.
- More files per component, written by the generator, not by hand.
- `apps/*/src` with no CSS is strict; if real screens need an escape hatch often, revisit the rule rather than add exceptions.

## Implementation notes

**Tokens (#12, 2026-10-11):**

- The source is `packages/ui/tokens/`: `palette`, `base`, `light` and `dark`. Colours are hex strings, as most token tools read them, not the DTCG 2025.10 object form. Contrast pairs are a `day.cookto.contrast` extension on each text colour.
- Only colours have a primitive tier (the palette). Type, corner and spacing steps are used directly.
- The TypeScript list of token names comes with the layouts, its first user.
- CSS variables may be defined only in the generated `packages/ui/src/tokens.css`. `apps/web` imports it in CSS, which knip can't see, so knip is told the dependency is used.

**Components and the kit (#17, 2026-10-12):**

- A component's test lives in `packages/ui/test/<Name>.test.tsx`, not in its folder: `tdd:verify` runs new tests against main's `src/`, which would take a test inside `src/` away with it.
- The kit page has no script. Its build bundles the page with every `*.kit.tsx` and renders it once, so CSS Modules have the same class names in the markup and the stylesheet. The deploy copies it into the app's output at `/kit/`.
- `tokens.css` also has `[data-theme="light"]` and `[data-theme="dark"]` blocks, so the kit can show both themes side by side.
- `Field` gives its control the id, and the problem's `aria-describedby`, through a function child: `<Field label="…">{(control) => <Select {...control} />}</Field>`.
