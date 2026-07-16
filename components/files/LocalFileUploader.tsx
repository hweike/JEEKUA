'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url'; // 公共函数，用于转换图片URL

interface LocalFileUploaderProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function LocalFileUploader({ open, onClose, onUploadSuccess }: LocalFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string; existingUrl?: string } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
  });

  const uploadFileWithProgress = (fileToUpload: File): Promise<{ id: string; url: string; displayName: string; isExisting: boolean }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', fileToUpload);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error('解析响应失败'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || '上传失败'));
          } catch {
            reject(new Error(`上传失败: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('网络错误')));
      xhr.open('POST', '/api/admin/files');
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResult(null);
    try {
      const data = await uploadFileWithProgress(file);
      if (data.isExisting) {
        setResult({
          success: true,
          message: `文件已存在：${data.displayName}`,
          existingUrl: data.url, // 后端应返回相对路径（storage_key）
        });
      } else {
        setResult({ success: true, message: `上传成功：${data.displayName}` });
        onUploadSuccess();
        setTimeout(() => {
          onClose();
          setFile(null);
          setResult(null);
          setProgress(0);
        }, 2000);
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板');
  };

  const resetAndClose = () => {
    onClose();
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">上传本地文件</h2>
          <button onClick={resetAndClose}><X size={20} /></button>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm">
            {isDragActive ? '释放文件以上传' : '拖放或点击选择文件'}
          </p>
          {file && <p className="mt-2 text-sm font-medium text-blue-600">{file.name}</p>}
        </div>

        {file && (
          <div className="mt-4">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading && <Loader2 size={16} className="animate-spin" />}
              {uploading ? `上传中 ${progress}%` : '确认上传'}
            </button>
            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {result && (
          <div className={`mt-4 p-3 rounded flex flex-col gap-2 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div className="flex items-center gap-2">
              {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {result.message}
            </div>
            {result.success && result.existingUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span className="truncate flex-1">{getImageUrl(result.existingUrl)}</span>
                <button
                  onClick={() => copyToClipboard(getImageUrl(result.existingUrl!))}
                  className="p-1 hover:bg-green-200 rounded"
                  title="复制链接"
                >
                  <Copy size={14} />
                </button>
                <a
                  href={getImageUrl(result.existingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-green-200 rounded"
                  title="在新窗口打开"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
            {result.success && result.existingUrl && (
              <button
                onClick={resetAndClose}
                className="mt-2 text-sm text-green-700 hover:text-green-900 underline"
              >
                关闭
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}