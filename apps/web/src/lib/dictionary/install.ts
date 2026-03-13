import { importJMDict } from "./jmdict-db";
import { dbPromise } from "./jmdict-db";

export async function isDictionaryInstalled() {
  const db = await dbPromise;
  const count = await db.count("entries");
  return count > 0;
}


// can delete installed dictionary by typing indexedDB.deleteDatabase("reader-dictionary")
export async function installDictionary() {
  console.log("installing dictionary")

  for (let i = 1; i <= 213; i++) {   // there are 213 term banks in JMDict

    const file = `/dictionaries/jmdict/term_bank_${i}.json`;

    const res = await fetch(file);

    if (!res.ok) {
      console.warn("Missing dictionary file:", file);
      continue;
    }

    const data = await res.json();

    const entries = data.map((row: any) => ({
      id: crypto.randomUUID(),
      kanji: row[0] ? [row[0]] : [],
      kana: row[1] ? [row[1]] : [],
      gloss: row.slice(3)
    }));
    console.log(entries)

    await importJMDict(entries);
  }
}