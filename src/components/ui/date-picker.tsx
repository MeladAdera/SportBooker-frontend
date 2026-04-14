import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** ISO date string to disable all days before this date */
  fromDate?: Date;
  /** ISO date string to disable all days after this date */
  toDate?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  fromDate,
  toDate,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        <CalendarIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
        {value ? format(value, 'MMM d, yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(date) => {
            if (fromDate && date < fromDate) return true;
            if (toDate && date > toDate) return true;
            return false;
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
