'use client';

import ReactPlayer from 'react-player';

interface VideoEmbedProps {
  url: string;
}

export default function VideoEmbed({ url }: VideoEmbedProps) {
  return (
    <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        controls
      />
    </div>
  );
}