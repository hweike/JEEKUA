'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export default function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Info
        size={14}
        className="text-gray-400 cursor-help"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      {visible && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg pointer-events-none">
          {content}
        </div>
      )}
    </div>
  );
}