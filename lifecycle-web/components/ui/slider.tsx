"use client";
import * as React from "react";
import { cn } from "../utils";

export function Slider({
  min = 0,
  max = 100,
  value,
  onValueChange,
}: {
  min?: number;
  max?: number;
  value: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onValueChange(parseInt(e.target.value))}
        className={cn("h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted")}
      />
      <span className="w-10 text-right text-sm">{value}</span>
    </div>
  );
}
