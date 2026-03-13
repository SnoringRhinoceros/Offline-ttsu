import { openDB } from "idb";

export interface JMDictEntry {
  id: number;
  kanji: string[];
  kana: string[];
  gloss: string[];
  pos?: string[];
}

const DB_NAME = "reader-dictionary";
const STORE = "entries";

export const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    const store = db.createObjectStore(STORE, {
      keyPath: "id"
    });

    store.createIndex("kanji", "kanji", { multiEntry: true });
    store.createIndex("kana", "kana", { multiEntry: true });
  }
});

export async function importJMDict(entries: JMDictEntry[]) {
  const db = await dbPromise;
  const tx = db.transaction(STORE, "readwrite");

  for (const entry of entries) {
    await tx.store.put(entry);
  }

  await tx.done;
}