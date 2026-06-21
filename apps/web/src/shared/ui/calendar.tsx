import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/shared/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-semibold text-foreground tracking-tight",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "inline-flex items-center justify-center rounded-md h-7 w-7",
          "border-0 bg-transparent text-muted-foreground",
          "transition-colors duration-150",
          "hover:bg-muted hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex mb-1",
        head_cell: cn(
          "w-9 text-center",
          "text-[10px] font-semibold  tracking-widest",
          "text-muted-foreground/60",
          "py-1",
        ),
        row: "flex w-full mt-0.5",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          "focus-within:relative focus-within:z-20",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/40",
          "[&:has([aria-selected])]:bg-accent/60",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
        ),
        day: cn(
          "inline-flex items-center justify-center rounded-md h-9 w-9 p-0",
          "text-sm font-normal",
          "transition-colors duration-100",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "aria-selected:opacity-100",
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground font-medium rounded-md",
          "hover:bg-primary/90 hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
        ),
        day_today: cn(
          "ring-1 ring-primary/50 ring-offset-1 ring-offset-background",
          "text-primary font-medium",
        ),
        day_outside: cn(
          "day-outside text-muted-foreground/40",
          "aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-30",
        ),
        day_disabled: "text-muted-foreground/30 pointer-events-none",
        day_range_middle: "aria-selected:bg-accent/60 aria-selected:text-accent-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
