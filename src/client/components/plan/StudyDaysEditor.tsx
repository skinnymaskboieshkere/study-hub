import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WEEKDAYS } from "@/lib/plan";

interface StudyDaysEditorProps {
  /** Selected ISO weekdays as strings: "1" = Monday … "7" = Sunday. */
  weekdays: string[];
  onWeekdaysChange: (weekdays: string[]) => void;
  /** Minutes for days that differ from the usual: { "6": "30" }; "" = as usual. */
  perDay: Record<string, string>;
  onPerDayChange: (perDay: Record<string, string>) => void;
  /** The usual minutes per day, shown as the placeholder. */
  minutes: string;
}

/** Which weekdays are for study and, if needed, lighter or heavier days. */
export function StudyDaysEditor(props: StudyDaysEditorProps) {
  const { weekdays, perDay, minutes } = props;
  return (
    <>
      <p id="days-label" className="text-sm font-medium text-ink">
        Учебные дни и нагрузка
      </p>
      <ToggleGroup
        type="multiple"
        aria-labelledby="days-label"
        value={weekdays}
        onValueChange={props.onWeekdaysChange}
        spacing={2}
        className="mt-2 flex-wrap"
      >
        {WEEKDAYS.map((day) => (
          <ToggleGroupItem
            key={day.value}
            value={String(day.value)}
            className="size-11 rounded-full border border-line bg-surface-2 text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink"
          >
            {day.short}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="mt-3 flex flex-wrap gap-3">
        {WEEKDAYS.filter((day) => weekdays.includes(String(day.value))).map((day) => (
          <label key={day.value} className="flex items-center gap-2 text-sm text-ink-muted">
            {day.short}
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={480}
              step={5}
              placeholder={minutes}
              aria-label={`Минут в ${day.short}`}
              value={perDay[String(day.value)] ?? ""}
              onChange={(event) =>
                props.onPerDayChange({ ...perDay, [String(day.value)]: event.target.value })
              }
              className="w-20"
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Пусто — как в остальные дни. Меньше минут — для дней с парами допоздна.
      </p>
    </>
  );
}
