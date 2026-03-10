import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface FloatingDatePickerProps {
  selected: Date;
  onSelect: (date: Date) => void;
  onClear?: () => void;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function FloatingDatePicker({ selected, onSelect, onClear }: FloatingDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(selected));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectDate = (date: Date) => {
    onSelect(date);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    handleSelectDate(today);
    setCurrentMonth(today);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Get days for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get starting day of week (0 = Sunday)
  const startingDayOfWeek = monthStart.getDay();

  // Create array with empty cells for days before month starts
  const calendarDays: (Date | null)[] = Array(startingDayOfWeek)
    .fill(null)
    .concat(daysInMonth);

  const today = new Date();

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border border-[#8B0000] rounded-md text-sm text-gray-600 bg-white hover:bg-[#fef2f2] transition-colors"
        data-testid="button-date-picker"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{format(selected, "MMM d, yyyy")}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>

      {/* Floating Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {format(currentMonth, "MMMM, yyyy")}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-[#fef2f2] rounded transition-colors"
                data-testid="button-prev-month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-[#fef2f2] rounded transition-colors"
                data-testid="button-next-month"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-0 px-4 pt-4">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 h-8 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0 px-4 pb-4">
            {calendarDays.map((day, index) => {
              const isSelected = day && isSameDay(day, selected);
              const isToday = day && isSameDay(day, today);
              const isCurrentMonth = day && isSameMonth(day, currentMonth);

              return (
                <div key={index} className="h-10 flex items-center justify-center">
                  {day && isCurrentMonth ? (
                    <button
                      onClick={() => handleSelectDate(day)}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-[#8B0000] text-white"
                          : isToday
                            ? "border-2 border-[#8B0000] text-gray-900"
                            : "text-gray-700 hover:bg-[#fef2f2]"
                      }`}
                      data-testid={`date-${day.getDate()}`}
                    >
                      {day.getDate()}
                    </button>
                  ) : day && !isCurrentMonth ? (
                    <span className="text-gray-300 text-sm">{day.getDate()}</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="flex gap-2 p-4 border-t border-gray-200">
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-2 text-sm font-medium text-[#8B0000] bg-white border border-[#8B0000] rounded hover:bg-[#fef2f2] transition-colors"
              data-testid="button-clear-date"
            >
              Clear
            </button>
            <button
              onClick={handleToday}
              className="flex-1 px-3 py-2 text-sm font-medium text-[#8B0000] bg-white border border-[#8B0000] rounded hover:bg-[#fef2f2] transition-colors"
              data-testid="button-today-date"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
