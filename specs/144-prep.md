# #144: Prep the day before: soak, marinate, ferment

- **Issue:** #144
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Chole, rajma and dal makhani need dried beans soaked overnight. Butter chicken is best marinated for hours. Dosa batter ferments. Today the app suggests them for tonight, and someone who follows it at 6 pm can't cook it.

The owner's words: prep is a section of the dish. If tomorrow is chole, the app says so the day before. In the morning it asks whether the prep is done, or suggests something else.

## Decisions

- **Prep is data on the dish:** what to do, and how long before. `{ "do": "soak", "what": "chickpeas", "hours": 8 }`. Kinds: soak, marinate, ferment, thaw.
- **Beans are a household choice:** "Dried beans" or "Tinned beans", in Settings, dried to start. With tinned, the soak goes and the dish can be cooked tonight.
- **Reminders are events, not screens.** The engine works out what's due: "soak chickpeas tonight, for tomorrow's lunch". The app's screen is the first place that shows them. WhatsApp, email or a phone notification can show the same events later, without the engine changing.
- **Tomorrow is planned tonight.** From 4 pm, Today also shows tomorrow's picks, so their prep can start.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), plus unit tests for the engine's new functions.

### 1. a dish that needs prep isn't tonight's pick

- **Given** dried beans, chickpeas in the pantry, and no prep done
- **When** they open Today at 10 am
- **Then** chole isn't lunch's or dinner's pick
- **And** its card in Dishes says "Soak the chickpeas 8 hours before"

### 2. the evening before

- **Given** tomorrow's lunch pick is chole, and it's after 4 pm
- **When** they open Today
- **Then** they see "Tonight: soak the chickpeas, for tomorrow's lunch", with "Done"
- **When** they press "Done"
- **Then** it says "Soaking since 9 pm" and stays until tomorrow's lunch

### 3. the morning after

- **Given** chole is today's lunch pick, and its soak was marked done last night
- **Then** chole stays lunch's pick
- **Given** the soak wasn't marked done
- **When** they open Today in the morning
- **Then** they see "Did you soak the chickpeas last night?", with "Yes" and "No"
- **When** they press "No"
- **Then** lunch's pick changes to a dish that needs no prep, and chole moves to tomorrow's ideas

### 4. tinned beans

- **Given** "Tinned beans" in Settings
- **When** they open Today at 10 am
- **Then** chole can be lunch's pick, and its card says nothing about soaking

### 5. the dish page

- **When** they open chole
- **Then** a "Prep" section sits above the ingredients: "Soak the chickpeas overnight, at least 8 hours"

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Prep · Soak the {food} {hours} hours before · Soak the {food} overnight, at least {hours} hours · Marinate the {food} {hours} hours before · Let the {food} ferment overnight · Tonight: soak the {food}, for tomorrow's {meal} · Done · Soaking since {time} · Did you soak the {food} last night? · Yes · No · Dried beans · Tinned beans

## Out of scope

- WhatsApp, email and phone notifications: they read the same events, in their own spec.
- Prep for meals more than a day ahead.
- Which dishes need prep: the recipe review (#149) fills in each dish's prep.
