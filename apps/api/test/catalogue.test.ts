import { describe, expect, test } from "bun:test";
import { checkTemplates, EN } from "@cookto/templates";
import { checkWorkflows } from "@cookto/workflows";
import { WORKFLOWS } from "../src/workflows/registry.js";

// specs/234, criteria 2 and 3, on what ships: the bot's workflows and
// templates pass both checks, so a mistake fails the build, not a run.

describe("what the bot ships", () => {
  test("its workflows name only templates, keys and steps that exist", () => {
    expect(checkWorkflows(Object.values(WORKFLOWS), EN)).toEqual([]);
  });

  test("its templates agree across languages and keep WhatsApp's limits", () => {
    expect(checkTemplates({ en: EN })).toEqual([]);
  });
});
