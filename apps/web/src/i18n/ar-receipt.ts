import type { enReceipt } from "./en-receipt.js";

// Arabic, receipt photos (specs/129): ar.ts spreads it in.

export const arReceipt: typeof enReceipt = {
  addReceipt: "أضف إيصالًا",
  photoOfReceipt: "صورة إيصال",
  receiptConsent:
    "تذهب الصورة إلى Gemini من Google لقراءتها. تحتفظ Google بها لوقت قصير فقط للتحقق من إساءة الاستخدام، ولا تتدرّب عليها أبدًا. يحتفظ cookto.day بالأصناف فقط.",
  readIt: "اقرأها",
  readingReceipt: "نقرأ إيصالك…",
  foundInReceipt: "ما وجدناه في إيصالك",
  notSure: "غير متأكدين",
  addAsItIs: "أضفه كما هو",
  skipLine: "تخطَّ",
  checkThisLine: "راجع هذا السطر",
  addedFromReceipt: "أضفنا {n} من إيصالك",
  signInForReceipts: "سجّل الدخول لقراءة صور الإيصالات",
  receiptsToday: "قرأت 3 إيصالات اليوم. حاول مجددًا غدًا.",
  receiptsMonth: "قرأت 30 إيصالًا هذا الشهر.",
  notAReceipt: "لا يبدو هذا إيصالًا",
  couldntRead: "لم نتمكن من قراءة هذه الصورة. حاول مجددًا غدًا.",
  receiptsNotWorking: "صور الإيصالات لا تعمل الآن",
};
