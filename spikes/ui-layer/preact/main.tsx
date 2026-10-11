import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  addMember,
  dirOf,
  GROUPS,
  groupLabel,
  groupOf,
  initial,
  initialState,
  LOCALES,
  remove,
  rename,
  setGroup,
  setLocale,
  toggleEdit,
  type FamilyState,
  type Member,
} from "../shared/family.js";

// Version B: Preact. Same state file, same CSS, same markup.

type Update = (next: FamilyState, focus?: string) => void;

function Card({ m, set }: { m: Member; set: Update }) {
  return (
    <div class="card">
      <label class="label">
        Name or nickname
        <input
          class="name-input"
          autocomplete="off"
          data-focus={`input-${m.id}`}
          value={m.name}
          onInput={(e) => {
            set(rename(stateRef.current, m.id, e.currentTarget.value));
          }}
        />
      </label>
      <div class="label">Age</div>
      <div class="groups">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            class="chip"
            aria-pressed={m.group === g.id}
            onClick={() => {
              set(setGroup(stateRef.current, m.id, g.id));
            }}
          >
            {g.label} · {g.ages}
          </button>
        ))}
      </div>
      <div class="rule">{groupOf(m.group).rule}</div>
      <div class="actions">
        <button
          type="button"
          class="primary"
          onClick={() => {
            set(toggleEdit(stateRef.current, m.id), `row-${m.id}`);
          }}
        >
          Done
        </button>
        <button
          type="button"
          class="secondary"
          onClick={() => {
            set(remove(stateRef.current, m.id), "add");
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function MemberItem({
  m,
  open,
  set,
}: {
  m: Member;
  open: boolean;
  set: Update;
}) {
  return (
    <div class="member">
      <button
        type="button"
        class="member-row"
        data-focus={`row-${m.id}`}
        aria-expanded={open}
        onClick={() => {
          set(toggleEdit(stateRef.current, m.id));
        }}
      >
        <span class="avatar">{initial(m)}</span>
        <span class="who">
          <span class="who-name">{m.name}</span>
          <span class="who-group">{groupLabel(m)}</span>
        </span>
        <span class="edit-link">{open ? "" : "Edit"}</span>
      </button>
      {open && <Card m={m} set={set} />}
    </div>
  );
}

// Handlers read the latest state, not the one from when they were created.
const stateRef: { current: FamilyState } = { current: initialState() };

function App() {
  const [state, setState] = useState(stateRef.current);
  const [focus, setFocus] = useState<string | null>(null);
  const set: Update = (next, focusKey) => {
    stateRef.current = next;
    setState(next);
    setFocus(focusKey ?? null);
  };

  useEffect(() => {
    document.documentElement.lang = state.locale;
    document.documentElement.dir = dirOf(state.locale);
  }, [state.locale]);

  // Move focus after the screen has changed, by a stable key.
  useEffect(() => {
    if (!focus) return;
    document.querySelector<HTMLElement>(`[data-focus="${focus}"]`)?.focus();
    setFocus(null);
  }, [focus]);

  return (
    <div class="screen">
      <div class="langs">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            class="chip"
            lang={l.code}
            aria-pressed={state.locale === l.code}
            onClick={() => {
              set(setLocale(stateRef.current, l.code));
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div>
        <h1>Who's in the family?</h1>
        <div class="hint">
          So we plan the right amounts, and food that suits everyone.
        </div>
      </div>
      <div class="list">
        {state.members.map((m) => (
          <MemberItem
            key={m.id}
            m={m}
            open={state.editing === m.id}
            set={set}
          />
        ))}
        <button
          type="button"
          class="add"
          data-focus="add"
          onClick={() => {
            const next = addMember(stateRef.current);
            set(next, `input-${next.editing ?? ""}`);
          }}
        >
          + Add someone
        </button>
      </div>
      <div class="footer">
        <button type="button" class="next">
          Next
        </button>
      </div>
    </div>
  );
}

const app = document.getElementById("app");
if (app) render(<App />, app);
