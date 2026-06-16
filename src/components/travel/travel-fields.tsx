"use client";

interface TravelFieldsProps {
  destination: string;
  amount: string;
  onDestinationChange: (value: string) => void;
  onAmountChange: (value: string) => void;
}

export function TravelFields({
  destination,
  amount,
  onDestinationChange,
  onAmountChange,
}: TravelFieldsProps) {
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-medium text-slate-500">여행 정보</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          placeholder="여행지 (예: 제주도)"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
        />
        <input
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="비용 (예: 150000 또는 15만원)"
          inputMode="numeric"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
