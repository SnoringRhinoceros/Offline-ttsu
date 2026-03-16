import { openDB } from "idb";

export interface JMDictEntry {
  id: string;
  kanji: string[];
  kana: string[];

  tags?: string[];
  rules?: string[];
  score?: number;

  gloss: string[];
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
  const store = tx.store;

  for (const entry of entries) {
    store.put(entry); // no await (much faster)
  }

  await tx.done;
}