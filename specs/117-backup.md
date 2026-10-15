# #117: Backup and restore, as a file

- **Issue:** #117
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Decisions:** [ADR 0013](../docs/adr/0013-static-browser-only.md) planned export and import as the backup. Sign-in and sync ([ADR 0025](../docs/adr/0025-server.md)) don't exist yet.

## Why

Everything lives only in this browser. Clearing it, or a new phone, loses the family, the fridge and the list. A backup file the family keeps, wherever they like, fixes both, with nothing uploaded.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. save a backup

- **Given** a household with a fridge, a shopping list and a dish cooked today
- **When** they press "Save a backup" in Settings
- **Then** the browser saves `cookto-day-backup-<date>.json`
- **And** it holds the household, settings, fridge, shopping list and what was cooked, and nothing from the packs

### 2. restore it

- **Given** that file, and another browser that finished onboarding
- **When** they press "Restore a backup" in Settings and choose the file
- **Then** they're asked "This replaces what's on this phone. Restore?"
- **When** they press "Restore"
- **Then** Today shows the saved household, and the Fridge and list are as they were saved

### 3. restore on a new phone

- **Given** a first visit
- **Then** the first step offers "Have a backup? Restore it", which restores and goes to Today

### 4. not a backup

- **When** they choose a file that isn't a cookto.day backup
- **Then** it says "This isn't a cookto.day backup" and changes nothing

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Backup · Save a backup · Restore a backup · This replaces what's on this phone. Restore? · Restore · Cancel · Have a backup? Restore it · This isn't a cookto.day backup · Keep it somewhere safe: it has your family's names and your fridge.

## Out of scope

- Automatic backups, and backups to Google Drive or iCloud.
- Merging a backup with what's on the phone.
- Sync between phones (ADR 0025).
