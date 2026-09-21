// app/admin/payment/orders/create/components/RemarkInfo.tsx
'use client';

interface RemarkInfoProps {
  remark: string;
  onRemarkChange: (value: string) => void;
  readOnly?: boolean;
}

export default function RemarkInfo({
  remark,
  onRemarkChange,
  readOnly = false,
}: RemarkInfoProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        备注 <span className="text-gray-400 text-xs">（仅内部可见）</span>
      </label>
      <textarea
        value={remark}
        onChange={(e) => onRemarkChange(e.target.value)}
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="内部备注..."
        disabled={readOnly}
      />
    </div>
  );
}