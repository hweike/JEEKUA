// lib/webbuilder/use-preview-styles.ts
import { useState, useEffect } from 'react';

export function usePreviewStyles() {
  const [styles, setStyles] = useState<string>('');

  useEffect(() => {
    fetch('/api/preview-styles')
      .then((res) => res.text())
      .then(setStyles)
      .catch(console.error);
  }, []);

  return styles;
}