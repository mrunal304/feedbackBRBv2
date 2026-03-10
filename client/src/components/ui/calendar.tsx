import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-between items-center pt-1 pb-4 relative",
        caption_label: "text-sm font-semibold text-gray-900",
        nav: "flex gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-white hover:bg-gray-100 border-gray-200 p-0 rounded-md transition-colors"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse space-y-1",
        head_row: "flex gap-1 mb-2",
        head_cell:
          "text-gray-600 rounded-md w-9 font-semibold text-[0.75rem] text-center",
        row: "flex w-full gap-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: cn(
          "h-9 w-9 rounded-md font-normal text-gray-700 hover:bg-gray-100 transition-colors",
          "relative inline-flex items-center justify-center p-0"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#8B1A1A] text-white hover:bg-[#8B1A1A] font-semibold",
        day_today: "bg-gray-100 text-gray-900 font-semibold ring-2 ring-gray-300 ring-offset-1",
        day_outside:
          "text-gray-400",
        day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
        day_range_middle: "bg-gray-100",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-5 w-5", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-5 w-5", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
