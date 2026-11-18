import { cn } from "cn";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface FilterChipOption {
  value: string;
  label: string;
  /** Tailwind background class for a colored dot (track filters). */
  dotClass?: string;
}

interface FilterChipsProps {
  /** Name of the filter for screen readers, e.g. "Трек". */
  label: string;
  options: FilterChipOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
}

/** Filter "chips" above the catalog (SPEC §6.1). Several can be on at once. */
export function FilterChips({ label, options, value, onValueChange }: FilterChipsProps) {
  return (
    <ToggleGroup
      type="multiple"
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      spacing={2}
      className="flex-wrap"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={cn(
            "h-9 rounded-full border border-line bg-surface px-4 text-sm font-normal text-ink-muted",
            "hover:bg-surface-2 hover:text-ink",
            "data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/15 data-[state=on]:text-ink",
          )}
        >
          {option.dotClass && (
            <span aria-hidden className={cn("size-2 rounded-full", option.dotClass)} />
          )}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
