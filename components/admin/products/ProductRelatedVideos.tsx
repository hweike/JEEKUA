'use client';

import { useState, useEffect, useCallback } from 'react';
import { GripVertical, Trash2, Plus, VideoIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VideoSelectorDialog from './VideoSelectorDialog';

interface AssociatedVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: number;
  sortOrder: number;
}

interface ProductRelatedVideosProps {
  productId: string;
  locale: string;
  onSave?: () => void;
}

// 可拖拽视频项组件
function SortableVideoItem({
  video,
  index,
  onRemove,
  saving,
}: {
  video: AssociatedVideo;
  index: number;
  onRemove: (id: string) => void;
  saving: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.videoId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isFirst = index === 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 border rounded bg-gray-50"
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} className="text-gray-400" />
        </button>
        {video.thumbnail ? (
          <img
            src={`/api/proxy-image?url=${encodeURIComponent(video.thumbnail)}`}
            alt={video.title}
            className="w-12 h-10 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-10 bg-gray-200 rounded flex items-center justify-center">
            <VideoIcon size={16} className="text-gray-500" />
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-sm">{video.title}</div>
          {video.duration && (
            <div className="text-xs text-gray-500">{Math.floor(video.duration / 60)}:{video.duration % 60}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isFirst && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">主图视频</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(video.videoId)}
          className="text-red-500 hover:text-red-700"
          disabled={saving}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export default function ProductRelatedVideos({
  productId,
  locale,
  onSave,
}: ProductRelatedVideosProps) {
  const [videos, setVideos] = useState<AssociatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadVideos = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      // 假设后端 API 返回关联的视频列表
      const res = await fetch(`/api/admin/products/videos/${productId}`);
      const data = await res.json();
      setVideos(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const updateServer = async (newVideoIds: string[]) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/videos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: newVideoIds }),
      });
      await loadVideos();
      onSave?.();
    } catch (err) {
      console.error(err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (newIds: string[]) => {
    const existingIds = videos.map(v => v.videoId);
    const merged = [...existingIds, ...newIds.filter(id => !existingIds.includes(id))];
    if (merged.length > 10) {
      alert('最多关联10个视频');
      return;
    }
    updateServer(merged);
  };

  const handleRemove = (videoId: string) => {
    const newIds = videos.filter(v => v.videoId !== videoId).map(v => v.videoId);
    updateServer(newIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = videos.findIndex(v => v.videoId === active.id);
      const newIndex = videos.findIndex(v => v.videoId === over?.id);
      const newOrder = arrayMove(
        videos.map(v => v.videoId),
        oldIndex,
        newIndex
      );
      updateServer(newOrder);
    }
  };

  if (loading) {
    return <div className="border rounded p-4 text-gray-500">加载中...</div>;
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-lg">相关视频</h3>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={saving}
          className="text-sm text-blue-600 flex items-center gap-1"
        >
          <Plus size={16} /> 添加视频
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">最多可关联10个视频，支持拖拽排序。第一个视频将作为主图视频。</p>
      {videos.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">暂无关联视频，点击上方按钮添加</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={videos.map(v => v.videoId)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {videos.map((video, idx) => (
                <SortableVideoItem
                  key={video.videoId}
                  video={video}
                  index={idx}
                  onRemove={handleRemove}
                  saving={saving}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {videos.length > 0 && (
        <div className="text-xs text-gray-400 mt-2">拖拽左侧手柄可调整排序</div>
      )}
      {saving && <div className="text-right text-xs text-gray-400 mt-2">保存中...</div>}
      <VideoSelectorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleAdd}
        maxSelection={10}
        initialSelectedIds={videos.map(v => v.videoId)}
        locale={locale}
      />
    </div>
  );
}