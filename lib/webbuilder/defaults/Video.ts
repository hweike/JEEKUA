// lib/webbuilder/defaults/Video.ts
export const DEFAULT_VIDEO = {
  bannerType: 'standard' as const,
  backgroundColor: '#ffffff',
  titleGroup: {
    title: 'Video',
    titleFontSize: 32,
    titleColor: '#000000',
    titleAlign: 'left' as const,
  },
  videoGroup: {
    videoUrl: 'https://www.bilibili.com/video/BV1ru7n6BE8p/?vd_source=83b45835b9eb31616bfca79d0bfe79a4',
    videoThumbnail: 'https://cdn.shopify.com/b/shopify-brochure2-assets/7ecd57f2fa3d7b997d29181a62c954ee.png',
    loop: false,
  },
  paddingGroup: {
    paddingTop: 32,
    paddingBottom: 32,
  },
  // 如果未来需要容器配置，也按分组添加
  mobileScaleFactor: 0.7, // 新增
};