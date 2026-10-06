import { getCollection, type CollectionEntry } from 'astro:content';

export type LeetCodeNote = CollectionEntry<'leetcode'>;

export async function getLeetCodeNotes(): Promise<LeetCodeNote[]> {
  const notes = await getCollection('leetcode', ({ data }) => !data.draft);
  return notes.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

