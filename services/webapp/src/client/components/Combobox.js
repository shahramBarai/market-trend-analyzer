"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "../components/Button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/Popover";

const ComboboxItem = React.memo(
  function ComboboxItem({ value, share, handleSelect }) {
    return (
      <CommandItem value={share.value} onSelect={handleSelect}>
        <Check
          className={cn(
            "mr-2 h-4 w-4",
            value === share.value ? "opacity-100" : "opacity-0"
          )}
        />
        {share.label}
      </CommandItem>
    );
  },
  (prevProps, nextProps) => prevProps.value === nextProps.value
);

export default function Combobox({ value, setValue, items }) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback((currentValue) => {
    setValue(currentValue === value ? "" : currentValue);
    setOpen(false);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? items.find((share) => share.value === value)?.label
            : "Select..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search shares..." />
          <CommandList>
            <CommandEmpty>No share found.</CommandEmpty>
            <CommandGroup>
              {items.map((share, index) => (
                <ComboboxItem
                  key={index}
                  value={value}
                  share={share}
                  handleSelect={handleSelect}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
