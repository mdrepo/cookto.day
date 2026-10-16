import { readFileSync } from "node:fs";
import { gemini } from "../src/receipts/gemini.js";
import { MAX_PHOTO_BYTES, photoType } from "../src/receipts/photo.js";
import { checkReceipt } from "../src/receipts/receipt.js";

// docs/runbooks/receipt-photos.md, step 3: read one photo exactly as the API
// does (the same instruction, schema, limits and checks) and print what it
// found, so a model is checked before it's switched on. Run by a person with
// the key; never by a test (ADR 0028).

const USAGE =
  "Usage: GEMINI_API_KEY=... bun apps/api/scripts/try-reader.ts <photo.jpg|photo.webp> <model>";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const [path, model] = process.argv.slice(2);
const key = process.env["GEMINI_API_KEY"];
if (!path || !model || !key) fail(USAGE);

const bytes = new Uint8Array(readFileSync(path));
if (bytes.length > MAX_PHOTO_BYTES)
  fail(
    `${path} is over 1.5 MB. The app shrinks photos before sending; shrink it the same way first: sips -Z 1600 ${path}`,
  );
const type = photoType(bytes);
if (type === null) fail(`${path} isn't a JPEG or WebP.`);

const started = Date.now();
const read = await gemini({ key, model }).read({ bytes, type });
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (!read.ok) fail(`${model}: ${read.reason}, after ${seconds} s`);

const receipt = checkReceipt(read.output);
console.log(
  `${model}: ${seconds} s, ${read.tokensIn} tokens in, ${read.tokensOut} out`,
);
console.log(`${receipt.shop ?? "(no shop)"}, ${receipt.date ?? "(no date)"}`);
for (const line of receipt.lines) {
  const price = line.unitPrice === undefined ? "" : ` × ${line.unitPrice}`;
  const mark = line.check ? "  ← check" : "";
  console.log(`  ${line.name}: ${line.qty}${price} = ${line.amount}${mark}`);
}
const total =
  receipt.addsUp === undefined
    ? "no subtotal read"
    : receipt.addsUp
      ? "lines add up to the subtotal"
      : "lines DON'T add up to the subtotal";
console.log(`${receipt.lines.length} lines; ${total}`);
