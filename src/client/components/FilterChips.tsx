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
  /** "sm": compact chips for narrow columns (the notes sidebar). */
  size?: "default" | "sm";
}

/** Filter "chips" above the catalog (SPEC §6.1). Several can be on at once. */
export function FilterChips({
  label,
  options,
  value,
  onValueChange,
  size = "default",
}: FilterChipsProps) {
  return (
    <ToggleGroup
      type="multiple"
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      spacing={size === "sm" ? 1 : 2}
      className="flex-wrap"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={cn(
            "rounded-full border border-line bg-surface font-normal text-ink-muted",
            size === "sm" ? "h-7 gap-1.5 px-2.5 text-xs" : "h-9 px-4 text-sm",
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
