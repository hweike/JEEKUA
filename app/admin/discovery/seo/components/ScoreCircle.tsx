// app/admin/discovery/seo/components/ScoreCircle.tsx

'use client';

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreCircle({ score, size = 'md' }: ScoreCircleProps) {
  const percent = Math.min(100, score);
  const color = percent >= 80 ? '#22c55e' : percent >= 60 ? '#eab308' : '#ef4444';

  const sizeMap = {
    sm: { wrapper: 'w-8 h-8', circle: 'w-8 h-8', r: 13, stroke: 2, fontSize: 'text-xs' },
    md: { wrapper: 'w-10 h-10', circle: 'w-10 h-10', r: 16, stroke: 3, fontSize: 'text-xs' },
    lg: { wrapper: 'w-12 h-12', circle: 'w-12 h-12', r: 20, stroke: 3, fontSize: 'text-sm' },
  };

  const s = sizeMap[size];
  const circumference = 2 * Math.PI * s.r;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className={`relative ${s.wrapper} inline-flex items-center justify-center`}>
      <svg className={`${s.circle} transform -rotate-90`}>
        <circle cx="50%" cy="50%" r={s.r} stroke="#e5e7eb" strokeWidth={s.stroke} fill="none" />
        <circle
          cx="50%"
          cy="50%"
          r={s.r}
          stroke={color}
          strokeWidth={s.stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className={`absolute font-bold ${s.fontSize}`}>{score}</span>
    </div>
  );
}