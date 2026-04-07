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

import JSZip from "jszip";

const PROXY_URL = "/api/dictionary-proxy";

export async function installDictionary() {
  console.log("Installing dictionary...");

  // Fetch from proxy (works in BOTH dev + prod)
  const res = await fetch(PROXY_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch dictionary ZIP");
  }

  const blob = await res.blob();
  const zip = await JSZip.loadAsync(blob);

  const allEntries: any[] = [];

  for (let i = 1; i <= 213; i++) {
    const fileName = `term_bank_${i}.json`;
    const file = zip.file(fileName);

    if (!file) {
      console.warn("Missing file:", fileName);
      continue;
    }

    const text = await file.async("string");
    const data = JSON.parse(text);

    const entries = data.map((row: any) => ({
      id: crypto.randomUUID(),
      kanji: row[0] ? [row[0]] : [],
      kana: row[1] ? [row[1]] : [],
      tags: row[2] || [],
      rules: row[3] || [],
      score: row[4] || 0,
      gloss: row[5] || [],
    }));

    allEntries.push(...entries);
  }

  await importJMDict(allEntries);

  console.log("✅ Dictionary install complete");
}