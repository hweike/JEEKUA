// lib/videosys/types.ts

// ============================================================
// 视频配置（从 settings.json 读取）
// ============================================================
export interface VideoConfig {
  name: string;                // 视频模块名称，如 "产品视频"
  seoTitle?: string;           // 自定义 SEO 标题
  seoDescription?: string;     // 自定义 SEO 描述
  image?: string;              // 默认分享图片
}

// ============================================================
// 视频分类（存储在云存储 categories.json 中）
// ============================================================
export interface VideoCategory {
  name: string;                // 分类名称
  slug: string;                // URL 友好标识
  order: number;               // 排序
  commentStatus?: 'disabled' | 'pending' | 'allowed';
  template?: string;           // 关联的模板 ID
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  isSystem?: boolean;          // 是否为系统分类（不可删除）
  [key: string]: any;          // 允许额外字段
}

export interface VideoCategoriesMap {
  [key: string]: VideoCategory;
}

// ============================================================
// 视频索引（数据库表 videos 的字段映射）
// ============================================================
export interface VideoIndex {
  id: string;
  locale: string;
  title: string;
  slug: string;
  category_key: string;               // 对应分类的 key
  source_type: 'youtube' | 'vimeo' | 'bilibili';
  video_url?: string;                 // 视频文件 URL（直接播放）
  video_id: string;                   // 平台视频 ID（用于生成 embedUrl）
  thumbnail?: string;                 // 缩略图 URL（可能为相对路径）
  duration?: number;                  // 时长（秒）
  visible: number;                    // 1: 可见, 0: 隐藏
  flagged?: number;                   // 标记（如 1 表示违规）
  tags?: string;                      // 标签（JSON 字符串或逗号分隔）
  template?: string;                  // 关联的模板 ID
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  order_index: number;
  published_at: string;
  updated_at: string;
  created_at: string;
}

// ============================================================
// 视频详情（含 Markdown 正文）
// ============================================================
export interface VideoData extends VideoIndex {
  content?: string;                   // Markdown 正文
}

// ============================================================
// 视频列表查询参数（用于 listVideos）
// ============================================================
export interface VideoListOptions {
  locale: string;
  title?: string;
  category?: string;                  // category_key
  page?: number;
  limit?: number;
  includeInvisible?: boolean;         // 是否包含隐藏视频
}

// ============================================================
// 视频列表返回结果
// ============================================================
export interface VideoListResult {
  items: VideoData[];
  total: number;
  page: number;
  limit: number;
}