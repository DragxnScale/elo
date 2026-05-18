"use client";

import {
  CUSTOM_SCORE,
  formatPointsLabel,
  SCORE_PRESETS,
} from "@/lib/match-scores";

type ScoreSelectProps = {
  value: string;
  customValue: string;
  onValueChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  id: string;
};

export function ScoreSelect({
  value,
  customValue,
  onValueChange,
  onCustomChange,
  id,
}: ScoreSelectProps) {
  return (
    <div className="space-y-2">
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="input-futuristic select-match w-full min-w-[9rem]"
      >
        {SCORE_PRESETS.map((pts) => (
          <option key={pts} value={String(pts)}>
            {formatPointsLabel(pts)}
          </option>
        ))}
        <option value={CUSTOM_SCORE}>Custom points…</option>
      </select>
      {value === CUSTOM_SCORE && (
        <input
          type="number"
          min={0}
          step={1}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          className="input-futuristic w-full py-3 text-base"
          placeholder="Enter points"
        />
      )}
    </div>
  );
}

