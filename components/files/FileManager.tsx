'use client';
import { useState } from 'react';
import LocalFileUploader from './LocalFileUploader';
import UrlFileUploader from './UrlFileUploader';
import FileListTable from './FileListTable';
import { FilePlus, Link as LinkIcon, RefreshCw } from 'lucide-react';

export default function FileManager() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLocalUploader, setShowLocalUploader] = useState(false);
  const [showUrlUploader, setShowUrlUploader] = useState(false);

  const refresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">文件管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLocalUploader(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <FilePlus size={18} /> 上传文件
          </button>
          <button
            onClick={() => setShowUrlUploader(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <LinkIcon size={18} /> 从URL上传
          </button>
          <button onClick={refresh} className="p-2 border rounded-md">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <LocalFileUploader
        open={showLocalUploader}
        onClose={() => setShowLocalUploader(false)}
        onUploadSuccess={refresh}
      />

      <UrlFileUploader
        open={showUrlUploader}
        onClose={() => setShowUrlUploader(false)}
        onUploadSuccess={refresh}
      />

      <FileListTable key={refreshKey} onRefresh={refresh} />
    </div>
  );
}