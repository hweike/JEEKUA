// lib/seo/configs/docLibrary.config.ts

import { PageTypeConfig } from '../types';
import { getDocLibraryBySlug } from '../page-fetchers';

export const docLibraryConfig: PageTypeConfig<'docLibrary'> = {
  type: 'docLibrary',
  getDataFetcher: () => async (slug, locale) => getDocLibraryBySlug(locale, slug),
  mapToStructuredData: (library) => ({
    name: library?.name || '',
    description: library?.description || '',
    itemList: library?.docs?.map((doc: any) => ({ url: doc.url })) || [],
  }),
  getTitle: (library) => library?.seo_title || library?.name || '',
  getDescription: (library) => library?.seo_description || library?.description || '',
  getImage: (library) => library?.image,
};