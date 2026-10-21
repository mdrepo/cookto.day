// A template (ADR 0034): the words of one message, by id and language, apart
// from the workflow that sends it. Its kinds and limits are WhatsApp's, so a
// WhatsApp adapter later needs no rewrite.

export type Kind = "text" | "buttons" | "choices" | "links" | "photo";

/** A count in words, by the language's plural forms: "{n} item". */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

export interface Template {
  kind: Kind;
  /** The words, with named slots: "Did you make {meal}?" */
  body: string;
  /** Each button's label, by the key the workflow knows it by. */
  buttons?: Record<string, string>;
  /** Slots that are counts, said in the language's plural forms. */
  plurals?: Record<string, PluralForms>;
}

/** Every template of one language, by id. */
export type Catalogue = Record<string, Template>;

/** Every language's templates; English always, the others when reviewed. */
export type Catalogues = { en: Catalogue } & Record<string, Catalogue>;

/** WhatsApp's limits, kept on Telegram too. */
export const LIMITS = { label: 20, body: 1024, buttons: 3, choices: 10 };
