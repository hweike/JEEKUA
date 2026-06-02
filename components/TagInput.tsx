'use client';

import { useState } from 'react';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTag = () => {
    const newTag = inputValue.trim();
    if (newTag && !tags.includes(newTag)) {
      const newTags = [...tags, newTag];
      onChange(newTags.join(','));
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    onChange(newTags.join(','));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span
            key={tag}
            className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入后按回车或逗号添加'}
          className="flex-1 border rounded-l p-2"
        />
        <button
          type="button"
          onClick={addTag}
          className="bg-gray-200 px-4 rounded-r hover:bg-gray-300"
        >
          添加
        </button>
      </div>
    </div>
  );
}