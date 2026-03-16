import { dbPromise } from "./jmdict-db";

export async function lookupWord(word: string) {
  const db = await dbPromise;

  const kanjiMatches = await db.getAllFromIndex("entries", "kanji", word);
  const kanaMatches = await db.getAllFromIndex("entries", "kana", word);

  const map = new Map();

  [...kanjiMatches, ...kanaMatches].forEach(e => {
    map.set(e.id, e);
  });

  return [...map.values()].slice(0, 10);
}