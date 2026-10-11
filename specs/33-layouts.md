# #33: Parts sit together the same way on every screen, and screens have no CSS of their own

- **Issue:** #33
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Parts are designed, but the space between them isn't: each screen still sets its own gaps and columns in its own CSS, so screens drift apart and agents invent spacing. A few layouts, whose only spacing is the spacing tokens, make every screen sit the same way, and leave apps nothing to style.

## Acceptance criteria

Criteria 1 to 3 are shown on the kit page (cookto.day/kit/), 4 on cookto.day, and 5 and 6 are tooling. Each becomes one test, named after it (ADR 0002, 0003).

**Phone and desktop.** From this change on, every e2e test, these and all the earlier ones, in both apps, runs twice: on a phone (Pixel 7) and on a desktop (Chromium, 1280px wide). A layout that only works on a phone fails.

### 1. parts in a stack are spaced by the spacing steps only

- **Given** the kit's `Stack` examples, with gaps of step 2 and step 6
- **When** they're shown
- **Then** the parts sit one above the other, 8px and 24px apart, and a gap that isn't a spacing step (like 5) can't be asked for

### 2. a cluster wraps on a narrow phone, and starts from the right in Arabic

- **Given** the kit's `Cluster` example: five buttons, more than fit across a phone
- **When** it's shown on a phone, in English and in Arabic
- **Then** the buttons wrap onto a second line instead of running off the screen, and the first one is at the left in English and at the right in Arabic

### 3. a screen is one centred column

- **Given** the kit's `Screen` example
- **When** it's shown on a phone and on a desktop
- **Then** its content is one column, at most 40rem wide and centred on the desktop, with 16px at each side on the phone

### 4. today's page looks the same, with no CSS of its own

- **Given** cookto.day, rebuilt from `Screen` and `Stack`
- **When** it loads, in English and in Arabic
- **Then** everything is where it was, the same size and colour as before (the look test from #17 still passes), and `apps/web/src/styles.css` is gone

### 5. an app's own CSS fails the design check

- **Given** a CSS file in `apps/web/src/`
- **When** `bun run design:check` runs
- **Then** it fails, saying apps compose parts and layouts from `@cookto/ui`, and don't style (the kit page's frame is the one exception)

### 6. a new layout starts with every file it needs

- **Given** there is no `Grid` layout
- **When** someone runs `bun run new layout Grid`
- **Then** `packages/ui/src/layouts/Grid/` gets its `.tsx`, `.module.css` and `.kit.tsx`, its test fails until it's built, and design:check, size:check, the typecheck and lint pass

## Words

None for the app. The kit's examples reuse the words it has.

## Out of scope

- `ActionBar` (the main buttons where the thumb reaches): it comes with onboarding, its first user.
- `new screen`: with onboarding too.
- iPhone Safari (WebKit): its own issue and ADR, since it changes ADR 0004.
- The page's header: it becomes a `Header` component with onboarding; until then, `Screen` holds it.
