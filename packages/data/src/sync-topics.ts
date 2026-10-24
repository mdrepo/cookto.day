// What each collection's change announces, as its repository does (specs/217).
// On its own, so the sync engine (./sync) loads only when a phone syncs.
/** What each collection's change announces, as its repository does. */
export const SYNC_TOPICS: Record<string, string> = {
  cooked: "cooked",
  "household-settings": "household-settings",
  members: "household",
  "my-dishes-out": "my-dishes",
  pantry: "pantry",
  plans: "plans",
  shopping: "shopping",
};
