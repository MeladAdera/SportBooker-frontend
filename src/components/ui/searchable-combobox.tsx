import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface SearchableComboboxOption {
  value: string;
  label: string;
}

export interface SearchableComboboxProps {
  options: SearchableComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  isLoading?: boolean;
  hasError?: boolean;
  /** When set, shows a row to clear the value (calls onChange('')). */
  allowClear?: boolean;
  clearLabel?: string;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  isLoading,
  hasError,
  allowClear,
  clearLabel,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [options, search],
  );

  const selectedLabel =
    value === ''
      ? undefined
      : (options.find((o) => o.value === value)?.label ?? value);

  if (isLoading) {
    return <Skeleton className="h-9 w-full rounded-lg" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive ring-3 ring-destructive/20',
          !selectedLabel && 'text-muted-foreground',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronsUpDown
          className="ml-2 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        sideOffset={4}
      >
        <div className="border-b border-border p-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>

        <ul role="listbox" className="max-h-56 overflow-y-auto p-1">
          {allowClear && value !== '' && clearLabel && (
            <li
              role="option"
              aria-selected={false}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
              )}
              onClick={() => {
                onChange('');
                setSearch('');
                setOpen(false);
              }}
            >
              <Check className="size-4 shrink-0 opacity-0" aria-hidden />
              {clearLabel}
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </li>
          ) : (
            filtered.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  o.value === value && 'bg-accent text-accent-foreground',
                )}
                onClick={() => {
                  onChange(o.value);
                  setSearch('');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    o.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {o.label}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
