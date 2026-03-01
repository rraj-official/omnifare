"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth,
  isSameDay, addMonths, subMonths, getDay, isToday, isBefore,
} from "date-fns";

const mockPrices: Record<string, number> = {};
function seedPrices(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  days.forEach((d) => {
    const key = format(d, "yyyy-MM-dd");
    if (!mockPrices[key]) {
      const base = 4200 + Math.floor(Math.abs(Math.sin(d.getTime() / 86400000) * 3000));
      mockPrices[key] = base;
    }
  });
}

for (let m = 0; m < 12; m++) {
  seedPrices(2026, m);
}

function getPriceColor(price: number): string {
  if (price < 4800) return "text-success";
  if (price < 5800) return "text-electric-light";
  return "text-red-400";
}

interface PriceCalendarProps {
  selected: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  showPrices: boolean;
}

export function PriceCalendar({ selected, onSelect, showPrices }: PriceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selected ?? new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="w-[300px] p-3">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="text-muted-foreground hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-white">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="text-muted-foreground hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const price = mockPrices[key];
          const isSelected = selected && isSameDay(day, selected);
          const isPast = isBefore(day, today) && !isToday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={key}
              onClick={() => !isPast && onSelect(day)}
              disabled={isPast}
              className={`flex flex-col items-center rounded-lg py-1.5 text-center transition-colors ${
                isSelected
                  ? "bg-electric text-white"
                  : isPast
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-navy-700"
              } ${!isCurrentMonth ? "opacity-50" : ""}`}
            >
              <span className={`text-xs ${isSelected ? "font-bold text-white" : isToday(day) ? "font-bold text-electric" : "text-white"}`}>
                {format(day, "d")}
              </span>
              {showPrices && price && !isPast && (
                <span className={`text-[8px] leading-tight ${isSelected ? "text-white/80" : getPriceColor(price)}`}>
                  ₹{(price / 1000).toFixed(1)}k
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showPrices && (
        <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Low</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-electric-light" /> Medium</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> High</span>
        </div>
      )}
    </div>
  );
}
