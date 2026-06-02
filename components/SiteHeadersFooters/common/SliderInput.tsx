'use client';

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export default function SliderInput({
  value,
  onChange,
  min = 0,
  max = 200,
  step = 1,
  label,
  unit = 'px',
}: SliderInputProps) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div className="flex items-center gap-4">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <span className="text-sm w-16 text-right">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
}