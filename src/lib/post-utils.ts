export type Lang = 'zh' | 'en';

export function getLangFromId(id: string): Lang {
  return id.startsWith('en/') ? 'en' : 'zh';
}

export function getSlugFromId(id: string): string {
  return id
    .split('/')
    .slice(1)
    .join('/')
    .replace(/\.[^/.]+$/, '');
}

export function getReadingTimeMinutes(body: string, lang: Lang): number {
  if (lang === 'zh') {
    const charCount = body.replace(/\s/g, '').length;
    return Math.max(1, Math.round(charCount / 400));
  }
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

export function sortByDateDesc<T extends { data: { pubDate: Date } }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function dedupeSortedTags(tagLists: string[][]): string[] {
  const set = new Set<string>();
  for (const tags of tagLists) {
    for (const tag of tags) set.add(tag);
  }
  return Array.from(set).sort();
}
