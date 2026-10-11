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

// Version A: plain functions, no framework. The screen is built once; each
// change updates only the nodes that differ, so focus and the caret survive.

type Child = Node | string | null;
interface Props {
  class?: string;
  attrs?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, (e: Event) => void>>;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  for (const [k, v] of Object.entries(props.attrs ?? {})) el.setAttribute(k, v);
  for (const [k, fn] of Object.entries(props.on ?? {}))
    el.addEventListener(k, fn);
  for (const c of children) if (c !== null) el.append(c);
  return el;
}

function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function setPressed(el: Element, on: boolean): void {
  el.setAttribute("aria-pressed", String(on));
}

interface CardView {
  root: HTMLElement;
  input: HTMLInputElement;
  groups: Map<string, HTMLButtonElement>;
  rule: HTMLElement;
}
interface MemberView {
  root: HTMLElement;
  row: HTMLButtonElement;
  avatar: HTMLElement;
  name: HTMLElement;
  group: HTMLElement;
  action: HTMLElement;
  card: CardView | null;
}

let state: FamilyState = initialState();
const views = new Map<string, MemberView>();

function dispatch(next: FamilyState, afterwards?: () => void): void {
  state = next;
  update();
  afterwards?.();
}

function buildCard(id: string): CardView {
  // The label wraps the input, so the label text is the input's name.
  const input = h("input", {
    class: "name-input",
    attrs: { autocomplete: "off" },
    on: {
      input: (e) => {
        dispatch(rename(state, id, (e.target as HTMLInputElement).value));
      },
    },
  });
  const groups = new Map<string, HTMLButtonElement>();
  const groupButtons = GROUPS.map((g) => {
    const b = h(
      "button",
      {
        class: "chip",
        attrs: { type: "button" },
        on: {
          click: () => {
            dispatch(setGroup(state, id, g.id));
          },
        },
      },
      `${g.label} · ${g.ages}`,
    );
    groups.set(g.id, b);
    return b;
  });
  const rule = h("div", { class: "rule" });
  const root = h(
    "div",
    { class: "card" },
    h("label", { class: "label" }, "Name or nickname", input),
    h("div", { class: "label" }, "Age"),
    h("div", { class: "groups" }, ...groupButtons),
    rule,
    h(
      "div",
      { class: "actions" },
      h(
        "button",
        {
          class: "primary",
          attrs: { type: "button" },
          on: {
            click: () => {
              dispatch(toggleEdit(state, id), () => {
                views.get(id)?.row.focus();
              });
            },
          },
        },
        "Done",
      ),
      h(
        "button",
        {
          class: "secondary",
          attrs: { type: "button" },
          on: {
            click: () => {
              dispatch(remove(state, id), () => {
                addButton.focus();
              });
            },
          },
        },
        "Remove",
      ),
    ),
  );
  return { root, input, groups, rule };
}

function buildMember(m: Member): MemberView {
  const avatar = h("span", { class: "avatar" });
  const name = h("span", { class: "who-name" });
  const group = h("span", { class: "who-group" });
  const action = h("span", { class: "edit-link" });
  const row = h(
    "button",
    {
      class: "member-row",
      attrs: { type: "button" },
      on: {
        click: () => {
          dispatch(toggleEdit(state, m.id));
        },
      },
    },
    avatar,
    h("span", { class: "who" }, name, group),
    action,
  );
  return {
    root: h("div", { class: "member" }, row),
    row,
    avatar,
    name,
    group,
    action,
    card: null,
  };
}

function updateMember(v: MemberView, m: Member, open: boolean): void {
  setText(v.avatar, initial(m));
  setText(v.name, m.name);
  setText(v.group, groupLabel(m));
  setText(v.action, open ? "" : "Edit");
  v.row.setAttribute("aria-expanded", String(open));
  if (open && !v.card) {
    v.card = buildCard(m.id);
    v.root.append(v.card.root);
  } else if (!open && v.card) {
    v.card.root.remove();
    v.card = null;
  }
  if (!v.card) return;
  // Only write the value when it differs, or the caret jumps to the end.
  if (v.card.input.value !== m.name) v.card.input.value = m.name;
  for (const [id, b] of v.card.groups) setPressed(b, id === m.group);
  setText(v.card.rule, groupOf(m.group).rule);
}

const langButtons = LOCALES.map((l) =>
  h(
    "button",
    {
      class: "chip",
      attrs: { type: "button", lang: l.code },
      on: {
        click: () => {
          dispatch(setLocale(state, l.code));
        },
      },
    },
    l.label,
  ),
);
const membersEl = h("div");
const addButton = h(
  "button",
  {
    class: "add",
    attrs: { type: "button" },
    on: {
      click: () => {
        dispatch(addMember(state), () => {
          const id = state.editing;
          const card = id ? views.get(id)?.card : null;
          card?.input.focus();
        });
      },
    },
  },
  "+ Add someone",
);

function update(): void {
  document.documentElement.lang = state.locale;
  document.documentElement.dir = dirOf(state.locale);
  LOCALES.forEach((l, i) => {
    const b = langButtons[i];
    if (b) setPressed(b, l.code === state.locale);
  });

  const seen = new Set<string>();
  state.members.forEach((m, i) => {
    seen.add(m.id);
    let v = views.get(m.id);
    if (!v) {
      v = buildMember(m);
      views.set(m.id, v);
    }
    // Move a node only when it's out of place: moving blurs what's inside it.
    if (membersEl.children[i] !== v.root)
      membersEl.insertBefore(v.root, membersEl.children[i] ?? null);
    updateMember(v, m, state.editing === m.id);
  });
  for (const [id, v] of views) {
    if (!seen.has(id)) {
      v.root.remove();
      views.delete(id);
    }
  }
}

const app = document.getElementById("app");
app?.append(
  h(
    "div",
    { class: "screen" },
    h("div", { class: "langs" }, ...langButtons),
    h(
      "div",
      {},
      h("h1", {}, "Who's in the family?"),
      h(
        "div",
        { class: "hint" },
        "So we plan the right amounts, and food that suits everyone.",
      ),
    ),
    h("div", { class: "list" }, membersEl, addButton),
    h(
      "div",
      { class: "footer" },
      h("button", { class: "next", attrs: { type: "button" } }, "Next"),
    ),
  ),
);
update();
