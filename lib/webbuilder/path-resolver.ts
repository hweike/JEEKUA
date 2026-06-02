export function resolvePath(obj: any, path: string): any[] {
  const parts = path.split('.');
  let current = [obj];
  for (const part of parts) {
    const isArrayWildcard = part.endsWith('[]');
    const key = isArrayWildcard ? part.slice(0, -2) : part;
    const next: any[] = [];
    for (const item of current) {
      if (!item || typeof item !== 'object') continue;
      const val = item[key];
      if (val === undefined) continue;
      if (isArrayWildcard && Array.isArray(val)) {
        next.push(...val);
      } else if (!isArrayWildcard) {
        next.push(val);
      }
    }
    current = next;
  }
  return current;
}