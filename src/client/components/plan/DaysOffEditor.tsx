import { CalendarX, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/plan";

interface DaysOffEditorProps {
  days: string[];
  onChange: (days: string[]) => void;
}

/** Days without study: exams, trips, holidays (SPEC §6.4). */
export function DaysOffEditor({ days, onChange }: DaysOffEditorProps) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft || days.includes(draft)) return;
    onChange([...days, draft].sort());
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          type="date"
          aria-label="День без учёбы"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-44"
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!draft}>
          <CalendarX aria-hidden />
          Добавить день
        </Button>
      </div>
      {days.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {days.map((day) => (
            <li key={day}>
              <button
                type="button"
                onClick={() => onChange(days.filter((item) => item !== day))}
                aria-label={`Убрать ${formatShortDate(day)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-ink hover:border-danger/50"
              >
                {formatShortDate(day)}
                <X aria-hidden className="size-3.5 text-ink-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
