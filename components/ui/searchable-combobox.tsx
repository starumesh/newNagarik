"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterOptions } from "@/lib/data/cities";

type SearchableComboboxProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  allowCreate?: boolean;
};

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function SearchableCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  allowCreate = true,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterOptions(options, query || value, 15),
    [options, query, value]
  );

  function commit(raw: string) {
    const next = titleCase(raw);
    if (!next) return;
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  function closeWithDraft(nextOpen: boolean) {
    if (!nextOpen) {
      const draft = (query || value).trim();
      if (allowCreate && draft.length >= 2) {
        const match = options.find(
          (option) => option.toLowerCase() === draft.toLowerCase()
        );
        commit(match ?? draft);
        return;
      }
      setQuery("");
    }
    setOpen(nextOpen);
  }

  return (
    <Popover open={open} onOpenChange={closeWithDraft}>
      <PopoverTrigger
        id={id}
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm outline-none",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(100vw-2rem,22rem)] p-2">
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const draft = (query || value).trim();
              if (!draft) return;
              const match = options.find(
                (option) => option.toLowerCase() === draft.toLowerCase()
              );
              if (match) commit(match);
              else if (allowCreate && draft.length >= 2) commit(draft);
              else if (filtered[0]) commit(filtered[0]);
            }
          }}
          placeholder="Type to search…"
          className="h-9"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                value === option && "bg-accent"
              )}
              onClick={() => commit(option)}
            >
              <span>{option}</span>
              {value === option ? <Check className="size-4 text-teal-700" /> : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Keep typing — we’ll save what you enter.
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
