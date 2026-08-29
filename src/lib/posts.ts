import { getCollection, type CollectionEntry } from 'astro:content';
import {
  type Lang,
  getLangFromId,
  getSlugFromId,
  sortByDateDesc,
  dedupeSortedTags,
} from './post-utils';

export type Post = CollectionEntry<'posts'>;

export async function getPostsByLang(lang: Lang): Promise<Post[]> {
  const posts = await getCollection(
    'posts',
    ({ id, data }) => getLangFromId(id) === lang && !data.draft,
  );
  return sortByDateDesc(posts);
}

export async function getTranslationSlug(post: Post): Promise<string | null> {
  const otherLang: Lang = getLangFromId(post.id) === 'zh' ? 'en' : 'zh';
  const slug = getSlugFromId(post.id);
  const candidates = await getPostsByLang(otherLang);
  const found = candidates.find((p) => getSlugFromId(p.id) === slug);
  return found ? slug : null;
}

export async function getAllTags(lang: Lang): Promise<string[]> {
  const posts = await getPostsByLang(lang);
  return dedupeSortedTags(posts.map((p) => p.data.tags));
}

export async function getPostsByTag(lang: Lang, tag: string): Promise<Post[]> {
  const posts = await getPostsByLang(lang);
  return posts.filter((p) => p.data.tags.includes(tag));
}

export function postHref(post: Post): string {
  const lang = getLangFromId(post.id);
  const slug = getSlugFromId(post.id);
  return lang === 'zh' ? `/posts/${slug}/` : `/${lang}/posts/${slug}/`;
}
