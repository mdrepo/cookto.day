// Onboarding step 1, "Who's in the family?", as pure state. Both spike
// versions use this file unchanged, so the comparison is only the view layer.

export type Group = "baby" | "toddler" | "child" | "teen" | "adult" | "elder";
export type Locale = "en" | "hi" | "mr" | "ar";

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly group: Group;
}

export interface FamilyState {
  readonly locale: Locale;
  readonly members: readonly Member[];
  /** The member whose card is open, if any. */
  readonly editing: string | null;
  readonly nextId: number;
}

export const LOCALES: readonly {
  code: Locale;
  label: string;
  dir: "ltr" | "rtl";
}[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "hi", label: "हिंदी", dir: "ltr" },
  { code: "mr", label: "मराठी", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export const GROUPS: readonly {
  id: Group;
  label: string;
  ages: string;
  rule: string;
}[] = [
  {
    id: "baby",
    label: "Baby",
    ages: "under 1",
    rule: "Baby rules: no salt, sugar or honey. Mashed, soft food.",
  },
  {
    id: "toddler",
    label: "Toddler",
    ages: "1 to 4",
    rule: "Toddler plate on: softer, no added salt, nothing they could choke on.",
  },
  {
    id: "child",
    label: "Child",
    ages: "5 to 12",
    rule: "Kid portions, and lunch box ideas if they take one.",
  },
  {
    id: "teen",
    label: "Teen",
    ages: "13 to 17",
    rule: "Grown-up portions, often more.",
  },
  { id: "adult", label: "Adult", ages: "18+", rule: "Grown-up portions." },
  {
    id: "elder",
    label: "Elder",
    ages: "65+",
    rule: "Softer and less spicy, when they want it.",
  },
];

export function initialState(): FamilyState {
  return {
    locale: "en",
    members: [
      { id: "m1", name: "You", group: "adult" },
      { id: "m2", name: "Adult 2", group: "adult" },
      { id: "m3", name: "Dua", group: "toddler" },
    ],
    editing: null,
    nextId: 4,
  };
}

export function groupOf(id: Group): (typeof GROUPS)[number] {
  const found = GROUPS.find((g) => g.id === id);
  if (!found) throw new Error(`Unknown group ${id}`);
  return found;
}

export function groupLabel(member: Member): string {
  const label = groupOf(member.group).label;
  if (member.group === "toddler") return `${label} · toddler plate on`;
  if (member.group === "baby") return `${label} · baby rules on`;
  return label;
}

export function initial(member: Member): string {
  return (member.name.trim()[0] ?? "?").toUpperCase();
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === locale)?.dir ?? "ltr";
}

export function setLocale(s: FamilyState, locale: Locale): FamilyState {
  return { ...s, locale };
}

export function toggleEdit(s: FamilyState, id: string): FamilyState {
  return { ...s, editing: s.editing === id ? null : id };
}

export function rename(s: FamilyState, id: string, name: string): FamilyState {
  return {
    ...s,
    members: s.members.map((m) => (m.id === id ? { ...m, name } : m)),
  };
}

export function setGroup(
  s: FamilyState,
  id: string,
  group: Group,
): FamilyState {
  return {
    ...s,
    members: s.members.map((m) => (m.id === id ? { ...m, group } : m)),
  };
}

export function remove(s: FamilyState, id: string): FamilyState {
  return { ...s, members: s.members.filter((m) => m.id !== id), editing: null };
}

export function addMember(s: FamilyState): FamilyState {
  const id = `m${String(s.nextId)}`;
  return {
    ...s,
    members: [...s.members, { id, name: "Someone", group: "adult" }],
    editing: id,
    nextId: s.nextId + 1,
  };
}
