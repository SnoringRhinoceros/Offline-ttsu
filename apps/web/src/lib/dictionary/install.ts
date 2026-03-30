import { importJMDict } from "./jmdict-db";
import { dbPromise } from "./jmdict-db";

export function loadDictionaryStyles(path: string) {
  const id = `dict-style-${path.replace(/[^\w]/g, "")}`;

  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = path;

  document.head.appendChild(link);
}

export async function isDictionaryInstalled() {
  const db = await dbPromise;
  const count = await db.count("entries");
  return count > 0;
}

export async function installDictionary() {
  console.log("installing dictionary");

  loadDictionaryStyles("/dictionaries/jmdict/styles.css");

  const allEntries: any[] = [];

  for (let i = 1; i <= 213; i++) {
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

      tags: row[2] || [],
      rules: row[3] || [],
      score: row[4] || 0,

      gloss: row[5] || []
    }));

    allEntries.push(...entries);
  }

  await importJMDict(allEntries);

  console.log("dictionary install complete");
}