// lib/seo/configs/blogCollection.config.ts

import { PageTypeConfig } from '../types';
import { getBlogCategoryBySlug } from '../page-fetchers';

export const blogCollectionConfig: PageTypeConfig<'blogCollection'> = {
  type: 'blogCollection',
  getDataFetcher: () => async (slug, locale) => getBlogCategoryBySlug(locale, slug),
  mapToStructuredData: (category) => ({
    name: category?.name || '',
    description: category?.description || '',
    itemList: category?.posts?.map((post: any) => ({ url: post.url })) || [],
  }),
  getTitle: (category) => category?.seo_title || category?.name || '',
  getDescription: (category) => category?.seo_description || category?.description || '',
  getImage: (category) => category?.image,
};