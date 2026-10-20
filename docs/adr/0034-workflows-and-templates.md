# 0034. Run the bot's conversations as workflows: steps in TypeScript, every word a template, runs as rows

- **Status:** Proposed
- **Date:** 2026-10-20
- **Deciders:** Mayur

## Context

The bot is about to hold real conversations ([spec #217](../../specs/217-households.md) put the plan and the cook in the household). The owner's workflows, 20 Oct 2026:

- **The planner** gets tomorrow's plan on Telegram. Yes makes it final. No offers: people change, cancel a meal or the day, other ideas; then the plan again, until Yes.
- **The helper** gets the final plan at once, each dish opening its recipe inside Telegram. The next day the bot asks at 3 pm about breakfast and lunch, and at 10 pm about the snack and dinner, one meal at a time. Yes: made, and the pantry is used. No: why, passed to the planner.
- **Receipts in the chat:** /receipt or a photo, read and added to the pantry.

Messenger-service's flow chain was read end to end (its nodes, the engine, the WhatsApp handlers, delayed messages, platform commands, the AI router) as the model. Its shape fits: steps as data with a chart drawn from them, commands that run beside the flow, delays as scheduled messages, and AI on a miss with steps as tools. Five things don't: there a customer starts the one flow by writing; state is one node id with loose extras; edges compare typed text; business effects are fields on nodes; messages are sent inline with pauses.

The owner also wants Meta's idea of templates: words kept apart from logic, by id, so we can localise later and a WhatsApp adapter needs no rewrite.

The design was grilled five times before this ADR; what broke and the fixes are part of the decision below. The draft with its diagrams is the workflows engine page.

## Decision

**Four layers, each knowing only the one below.** What starts a workflow; the workflow and its runner (`packages/workflows`); actions (the API) and templates (`packages/templates`); the messenger ([0031](0031-messenger.md)), unchanged.

**Workflows are TypeScript, not JSON in a database.** A workflow's shape is data: its steps, the template each sends, where each button key goes, what a step accepts (buttons, text, photo), when it expires and what happens then. Choices that depend on the day (other ideas, one button per dish, who's eating) are plain functions on the step. A step names keys and template ids the build checks. The chart is drawn from the definitions. Nobody edits workflows in a dashboard.

**The runner is pure.** It takes a run's state and one event (a button key, her text, her photo, a time) and returns the actions to run, the messages to send (template id, slots, button keys) and the next state. No words, no network, no database. A workflow is tested as a script of events and expected results.

**Every word is a template, by id and language.** `packages/templates` holds one file per language: a kind, a body with named slots, and a label per button key. Kinds: text, buttons (at most 3), choices (a list, at most 10), links (a page of cookto.day opening inside Telegram), photo, and an edit of a sent message. Slots are filled by the caller, already in the recipient's language (dish names from the packs' words, dates and times by locale). Templates use the app's word format, the same fill and plural forms as `apps/web/src/i18n/` ([0012](0012-localisation.md)), and are rendered per recipient, so one run can speak to the planner and the cook each in their own language; English until a native speaker reviews the others. Templates live in the repo, reviewed like the app's words; a WhatsApp copy is synced from them, never edited in Meta's dashboard. A check fails the build when a workflow names a missing template, when slots or button keys don't match in any language, or when a template breaks WhatsApp's limits (3 buttons, 10 list rows, 20-character labels, 1,024-character bodies). No started message relies on editing an earlier one.

**A run is one workflow happening for one household, about one thing, for an audience.** A row, by migration ([0032](0032-sql-migrations.md)): an 8-character id, the household, the audience (the planners, or one member), the workflow and step, what it's about (`{ day, meal }`, a receipt), a status (due, waiting, done, expired, cancelled), a counter and a lease, when it's due and when it expires, and the messages it sent to each recipient. Both planners get one run for tomorrow's yes or no; the first answer wins and the other's message says who answered.

**A button carries its run, step and key**: `w:<run>:<step>:<key>`, well under Telegram's 64 bytes. Labels never travel in the button.

**One transition: claim, act, commit.** A button press claims the run only if it is still at that step (compare and set on the counter, with a short lease); a press that loses runs nothing and is told "That's done already". Then the actions run, each keyed by run and step so a repeat changes nothing. Then one database call moves the run and queues its messages in the outbox together. A crash between them: the lease runs out and the next attempt starts again from the claim.

**The router, in order:** a command (/plan, /receipt, /help, /stop) runs beside any open step; a button goes to its run; text or a photo goes to her open step if that step accepts it; a photo with nothing open starts a receipt run; anything else is passed to the planner as written. Only a step that accepts text or a photo holds a person's floor; steps that take buttons can be out together, and a check that comes due while she holds the floor waits as due.

**What starts a run:** a time, in the household's own time zone (the planner's evening message, the checks); another workflow (the planner's Yes starts the helper's plan, which makes tomorrow's check runs); a command or a photo. The cron that already drains the outbox each minute starts due runs too.

**Actions are one registry in the API**: finalise the plan, change who's eating, cancel a meal, swap a dish, mark made, use the pantry, add receipt items, pass on to the planner. Each writes the household's records the phones sync ([0033](0033-telegram-sign-in-and-households.md)), so every phone sees it. The registry is what an AI router calls later, for the last rule only.

**The server can pick tomorrow's plan.** When the planner's evening message is due and nobody has picked tomorrow, the API picks it with the same engine and cuisine packs the app uses, imported into the Worker, and saves it as plan records. A plan record's id is made from the household, the day, the meal and who it's for, so a phone and the server, or two phones offline, land on the one record and the newest version wins.

**For a household on workflows, the phone no longer schedules its own 9 pm send** ([spec #207](../../specs/207-connect-the-cook.md)); the planner's workflow is the send. Signed-out phones keep #207 as it is.

**Defaults, the owner's to change in the specs:** the planner's silence makes the plan final at a set time, as "silence is yes" does today; an unanswered meal check counts as made when it expires at the next plan; the two planners' first answer wins.

**Limits and switches.** A test times the server's pick of one household's plan against the Workers free plan's processing budget (about 10 ms a request). If it doesn't fit, the choice is the $5 Workers plan or picking on a Supabase Edge Function, as [0025](0025-server.md) allows for bills: the owner decides then. A switch per household ("bot off") and one for everyone (a Worker setting) stop all starts and sends at once; runs wait. Stuck runs show on the health page. Logs hold run ids, workflows, steps and outcomes, never words.

**Privacy.** Runs about a day are deleted with the conversation on /stop and after 90 days like messages ([0031](0031-messenger.md)). Receipt photos are fetched from Telegram, read and thrown away, never stored ([0028](0028-receipt-photos-ai.md)); AI reads one only after she agreed once.

**Order of PRs:** the engine alone with no new behaviour (the packages, runs by migration, the hard cases as tests, today's Telegram replies moved onto templates); then a spec each for the planner's yes or no with the helper's plan, the meal checks with the pantry, and receipts in the chat.

## Alternatives

- **Copy the flow chain** (one JSON map per business, edges with conditions, one node id of state): built for a customer who writes first and one flow per business; its state and text matching are where it got messy.
- **Workflows as JSON in the database, with an editor:** edit without a deploy, but computed choices would need a condition language, and we have one author who writes code.
- **Plain handlers per message, no engine:** fewer concepts now, but the hard cases (stale and double taps, two planners, a check during an open step) would be solved again in every handler, and nothing to draw.
- **Words inside the steps:** simpler today; no localisation and a rewrite for WhatsApp.
- **Templates in the database:** change words without a release, but unreviewed and untyped; a deploy takes 15 minutes.
- **Run the actions, then move the run:** found in grilling to let two taps both act.
- **A workflow library (XState and the like):** a dependency for a runner of a hundred lines, and no help with templates, runs or the outbox.

## Consequences

- One engine for every conversation the bot holds; a new workflow is a definition, its templates and its actions, each tested.
- WhatsApp later is an adapter and a template sync, not a rewrite.
- Words change in reviewed PRs; a translation is a file.
- The server now picks plans, so the engine and packs ship in the Worker and must stay within its budget.
- Spec #195's "no did-you-cook" is superseded by the meal-check spec if the owner approves it there.
- Revisit if a non-developer needs to author workflows, or when AI routing takes over more than free text.
