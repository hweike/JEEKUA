'use client';

import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaGithub,
  FaTiktok,
  FaSnapchat,
  FaPinterest,
  FaTumblr,
  FaVimeo,
  FaGlobe,
} from 'react-icons/fa';

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

// 平台图标映射
const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: FaFacebook,
  twitter: FaTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  github: FaGithub,
  tiktok: FaTiktok,
  snapchat: FaSnapchat,
  pinterest: FaPinterest,
  tumblr: FaTumblr,
  vimeo: FaVimeo,
};

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialLinksProps {
  links: SocialLink[];
}

export default function SocialLinks({ links }: SocialLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <div
      className="flex items-center justify-center"
      style={{ gap: 'var(--spacing-4, 1rem)' }}
    >
      {links.map((link, idx) => {
        const platform = link.platform.toLowerCase();
        const Icon = platformIcons[platform] || FaGlobe;
        return (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--footer-link, var(--primary, #1e293b))',
              transition: COLOR_TRANSITION,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--footer-link-hover, var(--accent, #f1f5f9))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--footer-link, var(--primary, #1e293b))';
            }}
            aria-label={link.platform}
          >
            <Icon className="w-6 h-6" />
          </a>
        );
      })}
    </div>
  );
}