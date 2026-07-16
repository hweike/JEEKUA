'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { SeoScoreResult } from '@/lib/seo/types';

interface SeoScoreCardProps {
  score: SeoScoreResult | null;
}

export function SeoScoreCard({ score }: SeoScoreCardProps) {
  if (!score) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-400 text-sm">
        请完成内容分析后查看评分
      </div>
    );
  }

  const { score: total, color, label, dimensions, suggestions } = score;

  const dimensionConfig = [
    { key: 'seo_title', label: '标题', icon: 'T' },
    { key: 'seo_description', label: '描述', icon: 'D' },
    { key: 'seo_keywords', label: '关键词', icon: 'K' },
  ] as const;

  const renderCheck = (check: { label: string; passed: boolean; suggestion?: string }) => (
    <div key={check.label} className="flex items-start gap-2 text-sm">
      {check.passed ? (
        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
      )}
      <span className={check.passed ? 'text-gray-700' : 'text-red-600'}>
        {check.label}
        {!check.passed && check.suggestion && (
          <span className="text-gray-400 text-xs ml-1">（{check.suggestion}）</span>
        )}
      </span>
    </div>
  );

  return (
    <div className="border rounded-lg p-4 bg-white space-y-4">
      {/* 总分 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {total}
          </div>
          <div>
            <div className="font-semibold text-gray-800">{label}</div>
            <div className="text-xs text-gray-500">SEO 评分</div>
          </div>
        </div>
        {suggestions.length > 0 && (
          <div className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {suggestions.length} 项待改进
          </div>
        )}
      </div>

      {/* 各维度检查项 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dimensionConfig.map(({ key, label }) => {
          const dim = dimensions[key];
          return (
            <div key={key} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm text-gray-700">{label}</span>
                <span className="text-xs text-gray-500">
                  {dim.score}/{dim.maxScore}
                </span>
              </div>
              <div className="space-y-1.5">
                {dim.checks.map(renderCheck)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 优化建议汇总 */}
      {suggestions.length > 0 && (
        <div className="border-t pt-3">
          <div className="text-sm font-medium text-gray-700 mb-1">💡 优化建议</div>
          <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}