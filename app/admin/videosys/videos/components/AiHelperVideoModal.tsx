'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Download, Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Toast from '@/components/Toast';

interface Language {
  code: string;
  zhName: string;
  nativeName: string;
}

interface Props {
  sourceLocale: string;
  videoId: string;
  videoTitle: string;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function AiHelperVideoModal({
  sourceLocale,
  videoId,
  videoTitle,
  onClose,
  onImportSuccess,
}: Props) {
  // 与博客文章模态框结构相同，仅调整类型和文案
  const [languages, setLanguages] = useState<Language[]>([]);
  const [targetLocales, setTargetLocales] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'export' | 'prompt' | 'import'>('export');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        setLanguages(data);
        setTargetLocales([]);
      })
      .catch(err => {
        console.error('获取语言列表失败:', err);
        setToast({ message: '获取语言列表失败', type: 'error' });
      });
  }, [sourceLocale]);

  const languageNames = Object.fromEntries(
    languages.map(l => [l.code, l.zhName || l.nativeName || l.code])
  );

  const handleSelectAll = () => {
    const all = languages
      .filter(l => l.code !== sourceLocale)
      .map(l => l.code);
    setTargetLocales(all);
  };

  const handleDeselectAll = () => {
    setTargetLocales([]);
  };

  const generatePrompt = async () => {
    if (targetLocales.length === 0) {
      setToast({ message: '请至少选择一个目标语言', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const exportRes = await fetch(
        `/api/admin/AiHelper/export?type=video&locale=${sourceLocale}&ids=${videoId}`
      );
      const exportData = await exportRes.json();
      if (!exportData.success) throw new Error(exportData.error);

      const promptRes = await fetch('/api/admin/AiHelper/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          sourceLocale,
          targetLocales,
          sourceData: exportData.data,
          languageNames,
        }),
      });
      const promptResult = await promptRes.json();
      if (!promptResult.success) throw new Error(promptResult.error);

      setPromptText(promptResult.prompt);
      setStep('prompt');
      setToast({ message: '提示词生成成功', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || '生成失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setToast({ message: '✅ 已复制到剪贴板', type: 'success' });
    } catch {
      setToast({ message: '复制失败，请手动选择复制', type: 'error' });
    }
  };

  const validateJson = (jsonText: string): { valid: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.translations || !Array.isArray(parsed.translations) || parsed.translations.length === 0) {
        return { valid: false, error: 'JSON 缺少 translations 数组或为空' };
      }
      for (const item of parsed.translations) {
        if (!item.language || !item.videos || !Array.isArray(item.videos)) {
          return { valid: false, error: '每个 translations 项必须包含 language 和 videos 字段' };
        }
        if (item.videos.length === 0) {
          return { valid: false, error: `语言 ${item.language} 的 videos 为空` };
        }
        for (const vid of item.videos) {
          if (!vid.id) {
            return { valid: false, error: `视频缺少 id 字段` };
          }
        }
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: 'JSON 格式错误: ' + e.message };
    }
  };

  const handleImport = async (jsonText: string) => {
    const validation = validateJson(jsonText);
    if (!validation.valid) {
      setToast({ message: validation.error!, type: 'error' });
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      setImporting(true);
      setImportResult(null);

      const res = await fetch('/api/admin/AiHelper/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          sourceLanguage: parsed.sourceLanguage || sourceLocale,
          translations: parsed.translations,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || '导入失败');

      setImportResult({
        imported: data.imported || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });

      if (data.failed === 0) {
        setToast({ message: '🎉 全部导入成功！', type: 'success' });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 2000);
      } else {
        setToast({ message: `导入完成，成功 ${data.imported} 条，失败 ${data.failed} 条`, type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: '导入失败: ' + err.message, type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            🤖 AI 翻译助手 - 视频
            <span className="text-sm font-normal text-gray-500">
              《{videoTitle}》
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-4 text-sm">
          <span className={`flex items-center gap-1 ${step === 'export' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
            导出数据
          </span>
          <span className="text-gray-300">→</span>
          <span className={`flex items-center gap-1 ${step === 'prompt' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${step === 'prompt' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>2</span>
            复制提示词
          </span>
          <span className="text-gray-300">→</span>
          <span className={`flex items-center gap-1 ${step === 'import' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${step === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>3</span>
            导入翻译
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'export' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                <span className="font-medium">源语言：</span>
                <span>{languageNames[sourceLocale] || sourceLocale} ({sourceLocale})</span>
              </div>
              <p className="text-gray-600">
                已选择视频：<strong>{videoTitle}</strong>
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                💡 <strong>提示：</strong>DeepSeek 等 AI 工具对翻译输出长度有限制。建议每次选择少于5个目标语言，分多次完成翻译。
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-medium">目标语言（可多选）</label>
                  <div className="flex gap-2">
                    <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:text-blue-800">全选</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={handleDeselectAll} className="text-xs text-blue-600 hover:text-blue-800">取消全选</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {languages.filter(l => l.code !== sourceLocale).map(lang => (
                    <label key={lang.code} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetLocales.includes(lang.code)}
                        onChange={(e) => {
                          if (e.target.checked) setTargetLocales([...targetLocales, lang.code]);
                          else setTargetLocales(targetLocales.filter(c => c !== lang.code));
                        }}
                      />
                      {lang.zhName || lang.nativeName || lang.code} ({lang.code})
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={generatePrompt}
                disabled={loading || targetLocales.length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? '生成中...' : '生成翻译提示词'}
              </button>
            </div>
          )}

          {step === 'prompt' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={handleCopy} className="bg-gray-200 px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-gray-300 transition">
                  <Copy size={14} /> 复制
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([promptText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `video_prompt_${sourceLocale}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-gray-200 px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-gray-300 transition"
                >
                  <Download size={14} /> 下载 .txt
                </button>
                <button onClick={() => setStep('import')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition">
                  下一步 →
                </button>
              </div>
              <textarea
                value={promptText}
                readOnly
                className="w-full border rounded p-3 font-mono text-sm h-96 resize-y"
              />
              <p className="text-xs text-gray-500">💡 复制以上内容到 DeepSeek 等 AI 工具，生成翻译 JSON 后粘贴到下一步</p>
            </div>
          )}

          {step === 'import' && (
            <div className="space-y-4">
              <button onClick={() => setStep('prompt')} className="bg-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition">
                ← 返回上一步
              </button>
              <div>
                <label className="block font-medium mb-2">粘贴 AI 返回的 JSON 数据</label>
                <textarea
                  className="w-full border rounded p-3 font-mono text-sm h-56 resize-y"
                  placeholder='{"sourceLanguage":"en","translations":[...]}'
                  id="jsonInput"
                />
                <p className="text-xs text-gray-500 mt-1">⚠️ 系统会自动校验 JSON 格式。</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
                    handleImport(input.value);
                  }}
                  disabled={importing}
                  className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50 flex items-center gap-2 hover:bg-green-700 transition"
                >
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {importing ? '导入中...' : '导入翻译'}
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('jsonInput') as HTMLTextAreaElement;
                    input.value = '';
                    setImportResult(null);
                  }}
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  清空
                </button>
              </div>
              {importResult && (
                <div className={`p-4 rounded ${importResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-center gap-3">
                    {importResult.failed === 0 ? <CheckCircle className="text-green-600" size={20} /> : <XCircle className="text-yellow-600" size={20} />}
                    <span className="font-medium">
                      ✅ 成功: {importResult.imported}
                      {importResult.failed > 0 && ` | ❌ 失败: ${importResult.failed}`}
                    </span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-auto">
                      {importResult.errors.slice(0, 10).map((err, i) => <p key={i} className="text-sm text-red-600">• {err}</p>)}
                      {importResult.errors.length > 10 && <p className="text-sm text-gray-500">... 还有 {importResult.errors.length - 10} 条错误</p>}
                    </div>
                  )}
                  {importResult.failed === 0 && <p className="text-sm text-green-600 mt-2">🎉 全部导入成功！页面即将刷新...</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition">
            关闭
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}