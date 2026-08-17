import { describe, it, expect } from 'vitest';
import {
  getLangFromId,
  getSlugFromId,
  getReadingTimeMinutes,
  sortByDateDesc,
  dedupeSortedTags,
} from './post-utils';

describe('getLangFromId', () => {
  it('detects zh from a zh/ prefixed id', () => {
    expect(getLangFromId('zh/hello-world')).toBe('zh');
  });

  it('detects en from an en/ prefixed id', () => {
    expect(getLangFromId('en/hello-world')).toBe('en');
  });
});

describe('getSlugFromId', () => {
  it('strips the language prefix', () => {
    expect(getSlugFromId('zh/hello-world')).toBe('hello-world');
  });

  it('preserves nested slugs', () => {
    expect(getSlugFromId('en/2026/hello-world')).toBe('2026/hello-world');
  });
});

describe('getReadingTimeMinutes', () => {
  it('estimates zh reading time from character count (400 chars/min)', () => {
    const body = '字'.repeat(800);
    expect(getReadingTimeMinutes(body, 'zh')).toBe(2);
  });

  it('estimates en reading time from word count (200 words/min)', () => {
    const body = new Array(400).fill('word').join(' ');
    expect(getReadingTimeMinutes(body, 'en')).toBe(2);
  });

  it('never returns less than 1 minute', () => {
    expect(getReadingTimeMinutes('short', 'en')).toBe(1);
  });
});

describe('sortByDateDesc', () => {
  it('sorts newest first', () => {
    const items = [
      { data: { pubDate: new Date('2026-01-01') } },
      { data: { pubDate: new Date('2026-06-01') } },
      { data: { pubDate: new Date('2026-03-01') } },
    ];
    const sorted = sortByDateDesc(items);
    expect(sorted.map((i) => i.data.pubDate.getMonth())).toEqual([5, 2, 0]);
  });
});

describe('dedupeSortedTags', () => {
  it('flattens, dedupes, and alphabetically sorts tags', () => {
    expect(dedupeSortedTags([['b', 'a'], ['a', 'c']])).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array for no tags', () => {
    expect(dedupeSortedTags([])).toEqual([]);
  });
});
