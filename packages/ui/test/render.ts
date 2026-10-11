import { Window } from "happy-dom";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// A component's markup, as a browser would read it: rendered by React, then
// parsed into a document to ask by role, name and description (ADR 0003).

export function render(element: ReactElement): Document {
  const win = new Window();
  return new win.DOMParser().parseFromString(
    renderToStaticMarkup(element),
    "text/html",
  ) as unknown as Document;
}

/** The text of the elements an id-list attribute (like aria-describedby) names. */
export function textOf(doc: Document, ids: string | null): string {
  return (ids ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => doc.getElementById(id)?.textContent.trim() ?? "")
    .join(" ");
}
