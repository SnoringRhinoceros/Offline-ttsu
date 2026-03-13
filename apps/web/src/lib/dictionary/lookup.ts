import { dbPromise } from "./jmdict-db";

export async function lookupWord(word: string) {
  console.log(word)
  const db = await dbPromise;

  const kanjiMatches = await db.getAllFromIndex("entries", "kanji", word);
  const kanaMatches = await db.getAllFromIndex("entries", "kana", word);

  const results = [...kanjiMatches, ...kanaMatches];

  return results.slice(0, 10);
}