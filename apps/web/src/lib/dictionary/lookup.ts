/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

import { dbPromise } from './jmdict-db';

export async function lookupLongestMatches(text: string) {
  const results: any[] = [];
  const seen = new Set<string>();

  // Try longest → shortest
  for (let len = text.length; len > 0; len--) {
    const sub = text.slice(0, len);

    const matches = await lookupWord(sub);

    if (matches.length > 0) {
      for (const m of matches) {
        const key = `${m.kanji?.[0]}-${m.kana?.[0]}`;

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            ...m,
            matchLength: len
          });
        }
      }
    }
  }

  // Sort: longest matches first (VERY important)
  results.sort((a, b) => b.matchLength - a.matchLength);

  return results;
}

export async function lookupWord(word: string) {
  const db = await dbPromise;

  const kanjiMatches = await db.getAllFromIndex('entries', 'kanji', word);
  const kanaMatches = await db.getAllFromIndex('entries', 'kana', word);

  const map = new Map();

  [...kanjiMatches, ...kanaMatches].forEach((e) => {
    map.set(e.id, e);
  });

  return [...map.values()].slice(0, 10);
}
