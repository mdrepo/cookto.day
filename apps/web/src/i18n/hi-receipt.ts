import type { enReceipt } from "./en-receipt.js";

// Hindi, receipt photos (specs/129): hi.ts spreads it in.

export const hiReceipt: typeof enReceipt = {
  addReceipt: "रसीद जोड़ें",
  photoOfReceipt: "रसीद की फ़ोटो",
  receiptConsent:
    "फ़ोटो पढ़ने के लिए Google के Gemini को जाती है। Google उसे थोड़े समय के लिए सिर्फ़ गलत इस्तेमाल की जाँच के लिए रखता है, और उससे कभी सीखता नहीं। cookto.day सिर्फ़ सामान रखता है।",
  readIt: "पढ़ें",
  readingReceipt: "आपकी रसीद पढ़ी जा रही है…",
  foundInReceipt: "आपकी रसीद में मिला",
  notSure: "पक्का नहीं",
  addAsItIs: "जैसा है वैसा जोड़ें",
  skipLine: "छोड़ें",
  checkThisLine: "यह लाइन जाँचें",
  addedFromReceipt: "आपकी रसीद से {n} जोड़े गए",
  signInForReceipts: "रसीद की फ़ोटो पढ़ने के लिए साइन इन करें",
  receiptsToday: "आज आपने 3 रसीदें पढ़ ली हैं। कल फिर कोशिश करें।",
  receiptsMonth: "इस महीने आपने 30 रसीदें पढ़ ली हैं।",
  notAReceipt: "यह रसीद जैसी नहीं लगती",
  couldntRead: "हम यह फ़ोटो नहीं पढ़ पाए। कल फिर कोशिश करें।",
  receiptsNotWorking: "रसीद की फ़ोटो अभी काम नहीं कर रही",
};
