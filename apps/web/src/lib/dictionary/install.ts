import { importJMDict } from "./jmdict-db";
import { dbPromise } from "./jmdict-db";

function extractGlossary(definitionBlocks: any[]): string[] {
  const results: string[] = [];

  function walk(node: any) {
    if (!node) return;

    if (node.tag === "li" && typeof node.content === "string") {
      results.push(node.content);
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    } else if (typeof node.content === "object") {
      walk(node.content);
    }
  }

  for (const block of definitionBlocks) {
    walk(block.content);
  }

  return results;
}

export async function isDictionaryInstalled() {
  const db = await dbPromise;
  const count = await db.count("entries");
  return count > 0;
}

export async function installDictionary() {
  console.log("installing dictionary");

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

    await importJMDict(entries);
  }

  console.log("dictionary install complete");
}