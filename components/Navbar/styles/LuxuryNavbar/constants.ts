// components/Navbar/styles/LuxuryNavbar/constants.ts

export interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  children?: MenuItem[];
  badge?: string;
}

export const DESKTOP_MENU_ITEMS: MenuItem[] = [
  {
    id: 'shop',
    label: 'Shop',
    linkType: 'internal',
    linkValue: '/collections/all',
    children: [
      {
        id: 'headphones',
        label: 'Headphones',
        linkType: 'internal',
        linkValue: '/collections/headphones',
        children: [
          { id: 'air-beats', label: 'Air Beats', linkType: 'internal', linkValue: '/products/air-beats' },
          { id: 'flow-harmony', label: 'Flow Harmony', linkType: 'internal', linkValue: '/products/flow-harmony' },
          { id: 'oasis-flow', label: 'Oasis Flow', linkType: 'internal', linkValue: '/products/oasis-flow' },
          { id: 'sound-bloom', label: 'Sound Bloom', linkType: 'internal', linkValue: '/products/sound-bloom' },
        ],
      },
      {
        id: 'earphones',
        label: 'Earphones',
        linkType: 'internal',
        linkValue: '/collections/earphones',
        children: [
          { id: 'wave-whisper', label: 'Wave Whisper', linkType: 'internal', linkValue: '/products/wave-whisper' },
          { id: 'whisper-flow', label: 'Whisper Flow', linkType: 'internal', linkValue: '/products/whisper-flow' },
          { id: 'crimson-noir', label: 'Crimson Noir', linkType: 'internal', linkValue: '/products/crimson-noir' },
          { id: 'rhythmiq', label: 'RhythmiQ', linkType: 'internal', linkValue: '/products/rhythmiq' },
        ],
      },
      {
        id: 'speakers',
        label: 'Speakers',
        linkType: 'internal',
        linkValue: '/collections/speakers',
        children: [
          { id: 'bass-wave', label: 'Bass Wave', linkType: 'internal', linkValue: '/products/bass-wave' },
          { id: 'echo-sphere', label: 'Echo Sphere', linkType: 'internal', linkValue: '/products/echo-sphere' },
          { id: 'sonic-silhouette', label: 'Sonic Silhouette', linkType: 'internal', linkValue: '/products/sonic-silhouette' },
          { id: 'echo-elegance', label: 'Echo Elegance', linkType: 'internal', linkValue: '/products/echo-elegance' },
        ],
      },
      {
        id: 'accessories',
        label: 'Accessories',
        linkType: 'internal',
        linkValue: '/collections/accessories',
        children: [
          { id: 'audio-cable', label: '3.5 mm Audio Cable', linkType: 'internal', linkValue: '/products/3-5-mm-audio-cable' },
          { id: 'soft-case', label: 'Soft Case', linkType: 'internal', linkValue: '/products/soft-case' },
          { id: 'ear-cushions', label: 'Ear cushions', linkType: 'internal', linkValue: '/products/ear-cushions' },
          { id: 'steel-case', label: 'Steel Case', linkType: 'internal', linkValue: '/products/steel-case' },
        ],
      },
    ],
  },
  {
    id: 'collections',
    label: 'Collections',
    linkType: 'internal',
    linkValue: '/collections',
    children: [
      { id: 'headphones-col', label: 'Headphones', linkType: 'internal', linkValue: '/collections/headphones' },
      { id: 'earphones-col', label: 'Earphones', linkType: 'internal', linkValue: '/collections/earphones' },
      { id: 'speakers-col', label: 'Speakers', linkType: 'internal', linkValue: '/collections/speakers' },
      { id: 'accessories-col', label: 'Accessories', linkType: 'internal', linkValue: '/collections/accessories' },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    linkType: 'internal',
    linkValue: '/pages/about',
    children: [
      { id: 'our-story', label: 'Our Story', linkType: 'internal', linkValue: '/pages/about' },
      { id: 'our-journal', label: 'Our Journal', linkType: 'internal', linkValue: '/blogs/news' },
      { id: 'faqs', label: "FAQ's", linkType: 'internal', linkValue: '/pages/faqs' },
      { id: 'contact-us', label: 'Contact Us', linkType: 'internal', linkValue: '/pages/contact' },
      { id: 'contact-map', label: 'Contact with Map', linkType: 'internal', linkValue: '/pages/contact-with-map-2' },
      { id: 'store-locations', label: 'Store locations', linkType: 'internal', linkValue: '/pages/contact-with-maps' },
      { id: 'bundle', label: 'Build Your Bundle', linkType: 'internal', linkValue: '/pages/bundle' },
    ],
  },
  { id: 'compare', label: 'Compare', linkType: 'internal', linkValue: '/pages/compare' },
  { id: 'contact', label: 'Contact', linkType: 'internal', linkValue: '/pages/contact-with-map' },
  { id: 'theme-features', label: 'Theme features', linkType: 'internal', linkValue: '/pages/theme-features' },
];

export const ANNOUNCEMENT_ITEMS = [
  { id: '1', text: 'Save up to 60% with code BLACKFRIDAY', link: null, icon: 'truck' },
  { id: '2', text: 'A question? Visit our contact page', link: '/pages/contact-with-map', icon: 'email' },
];

export const SOCIAL_LINKS = [
  { platform: 'facebook', url: 'https://www.facebook.com/shopify' },
  { platform: 'twitter', url: 'https://twitter.com/shopify' },
  { platform: 'instagram', url: 'https://instagram.com/shopify' },
  { platform: 'youtube', url: 'https://www.youtube.com/user/shopify' },
];

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch' },
];

export const CURRENCIES = [
  { code: 'CN', name: 'China (USD $)' },
  { code: 'US', name: 'United States (USD $)' },
  { code: 'GB', name: 'United Kingdom (USD $)' },
];