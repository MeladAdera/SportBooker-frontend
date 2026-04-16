import { useState } from 'react';
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
  fromDate?: Date;
  toDate?: Date;
  /** Pass "dropdown" to show year + month dropdowns instead of arrow-only navigation. */
  captionLayout?: 'label' | 'dropdown';
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  fromDate,
  toDate,
  captionLayout = 'label',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground transition-colors',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
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
          captionLayout={captionLayout}
          startMonth={fromDate}
          endMonth={toDate}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
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
