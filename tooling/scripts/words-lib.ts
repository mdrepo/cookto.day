// Pure parts of the words check (scripts/check-words.ts), with unit tests.
// The app's English words stay plain: no AI-tell words, no emoji (ADR 0027).
// The banned list is tooling/banned-words.json, so a project built on this
// one can add its own.

export interface Entry {
  file: string;
  key: string;
  text: string;
}

const EMOJI = /\p{Extended_Pictographic}/u;

/** Each banned word or emoji in the app's words, naming the file and key. */
export function wordProblems(
  entries: readonly Entry[],
  banned: readonly string[],
): string[] {
  const words = banned.map(
    (w) => new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`, "iu"),
  );
  return entries.flatMap(({ file, key, text }) => {
    const problems: string[] = [];
    for (const word of words) {
      const found = word.exec(text);
      if (found)
        problems.push(
          `${file} ${key}: "${found[0]}" is on the banned list (tooling/banned-words.json). Say what happens, plainly.`,
        );
    }
    const emoji = EMOJI.exec(text);
    if (emoji)
      problems.push(`${file} ${key}: an emoji ("${emoji[0]}"). Words only.`);
    return problems;
  });
}
