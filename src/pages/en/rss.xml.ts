import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPostsByLang, postHref } from '../../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPostsByLang('en');
  return rss({
    title: "Parker's Dev Blog",
    description: "Parker's software development blog",
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postHref(post),
    })),
  });
}
