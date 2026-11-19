import { cn } from "cn";
import { formatDuration } from "@/lib/format";

export interface BreakdownItem {
  key: string;
  label: string;
  /** Tailwind class of the identity dot (track or subject color). */
  dotClass?: string;
  seconds: number;
}

/** Time per track or subject: label, bar, value. Bars are one color: the label names them. */
export function BreakdownBars({ items, empty }: { items: BreakdownItem[]; empty: string }) {
  const max = Math.max(0, ...items.map((item) => item.seconds));
  if (max === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
            {item.dotClass && (
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", item.dotClass)} />
            )}
            <span className="truncate">{item.label}</span>
          </span>
          <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
            {item.seconds > 0 && (
              <span
                className="block h-full rounded-full bg-brand"
                style={{ width: `${Math.max(2, (item.seconds / max) * 100)}%` }}
              />
            )}
          </span>
          <span className="w-20 text-right font-mono text-xs text-ink-muted">
            {item.seconds > 0 ? formatDuration(item.seconds) : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
