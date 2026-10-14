# #96: Choose light, dark, or the phone's theme

- **Issue:** #96
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The app follows the phone's light or dark setting, and there's no way to change it. Some people want the app light at night in the kitchen, or dark on a laptop that's light.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. choose a theme in Settings

- **Given** a phone set to light
- **When** they open Settings
- **Then** "Theme" offers "Same as phone" (chosen), "Light" and "Dark"
- **When** they choose "Dark"
- **Then** the app turns dark at once, on every page

### 2. it's remembered

- **Given** "Dark" chosen
- **When** they reload the app
- **Then** it's still dark, and Settings still shows "Dark"

### 3. same as phone

- **Given** a phone set to dark, and "Light" chosen
- **When** they choose "Same as phone"
- **Then** the app is dark again

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Theme · Same as phone · Light · Dark

## Out of scope

- More colours or accent choices.
- The kit page: it keeps its own light and dark panels.
- Remembering it on other devices (sync, ADR 0025): it lives in this browser, like the language.
