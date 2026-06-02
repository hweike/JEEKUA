export interface VideoIndex {
  id: string;
  locale: string;
  title: string;
  slug: string;
  category_key: string;
  source_type: 'youtube' | 'vimeo' | 'bilibili';
  video_url?: string;
  video_id: string;
  thumbnail?: string;
  duration?: number;
  visible: number;      // 1: visible, 0: hidden
  flagged?: number;
  tags?: string;        // 新增
  template?: string;
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  order_index: number;
  published_at: string;
  updated_at: string;
  created_at: string;
}

export interface VideoData extends VideoIndex {
  content?: string;     // Markdown 正文
}