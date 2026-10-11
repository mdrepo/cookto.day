import { describe, expect, test } from "bun:test";
import { openPage } from "../helpers/page.js";

describe("language switch", () => {
  test.each([
    ["en", "ltr", "Add a grocery bill to see what you can cook today"],
    ["hi", "ltr", "आज क्या पका सकते हैं, यह देखने के लिए किराने का बिल जोड़ें"],
    ["mr", "ltr", "आज काय शिजवता येईल ते पाहण्यासाठी किराणा बिल जोडा"],
    ["ar", "rtl", "أضف فاتورة بقالة لترى ما يمكنك طبخه اليوم"],
  ])("choosing %p sets lang, direction %p and the words", (code, dir, body) => {
    const page = openPage();
    page.chooseLanguage(code);
    expect(page.doc.documentElement.lang).toBe(code);
    expect(page.doc.documentElement.dir).toBe(dir);
    expect(page.emptyState().body).toBe(body);
  });

  test("the choice is remembered for the next visit", () => {
    const first = openPage();
    first.chooseLanguage("mr");
    const saved = first.storage.getItem("cookto.day:language");
    expect(saved).toBe("mr");

    const next = openPage({ storage: { "cookto.day:language": "mr" } });
    expect(next.doc.documentElement.lang).toBe("mr");
    expect(next.emptyState().title).toBe("तुमचं स्वयंपाकघर रिकामं आहे");
  });

  test("an unknown saved language falls back to English", () => {
    const page = openPage({ storage: { "cookto.day:language": "xx" } });
    expect(page.doc.documentElement.lang).toBe("en");
  });
});
