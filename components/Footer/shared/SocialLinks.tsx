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
    <div className="flex items-center justify-center space-x-4">
      {links.map((link, idx) => {
        const platform = link.platform.toLowerCase();
        const Icon = platformIcons[platform] || FaGlobe;
        return (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: 'var(--footer-link)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--footer-link-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--footer-link)')}
            aria-label={link.platform}
          >
            <Icon className="w-6 h-6" />
          </a>
        );
      })}
    </div>
  );
}