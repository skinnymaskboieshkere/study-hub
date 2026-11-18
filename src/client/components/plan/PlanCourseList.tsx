import type { CourseCardDto } from "@shared/api";
import { cn } from "cn";
import { getTrack } from "@/app/tracks";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDuration, formatPercent } from "@/lib/format";

export interface CourseChoice {
  slug: string;
  selected: boolean;
  weight: number;
  /** "" = no deadline. */
  deadline: string;
}

const PRIORITIES = [
  { weight: 2, label: "Высокий" },
  { weight: 1, label: "Обычный" },
  { weight: 0.5, label: "Низкий" },
];

interface PlanCourseListProps {
  courses: CourseCardDto[];
  choices: CourseChoice[];
  onChange: (choices: CourseChoice[]) => void;
}

/** Which courses go into the plan, how much each matters, and optional deadlines. */
export function PlanCourseList({ courses, choices, onChange }: PlanCourseListProps) {
  const update = (slug: string, change: Partial<CourseChoice>) =>
    onChange(choices.map((choice) => (choice.slug === slug ? { ...choice, ...change } : choice)));

  return (
    <ul className="divide-y divide-line">
      {choices.map((choice) => {
        const course = courses.find((item) => item.slug === choice.slug);
        if (!course) return null;
        const id = `plan-course-${course.slug}`;
        return (
          <li key={course.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <Checkbox
              id={id}
              checked={choice.selected}
              onCheckedChange={(value) => update(course.slug, { selected: value === true })}
            />
            <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", getTrack(course.track).dotClass)}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{course.title}</span>
                <span className="block text-sm text-ink-muted">
                  {course.university} · {formatDuration(course.totalSeconds)} видео
                  {course.progress > 0 && ` · пройдено ${formatPercent(course.progress)}`}
                </span>
              </span>
            </label>
            <div
              className={cn(
                "flex items-center gap-2",
                !choice.selected && "pointer-events-none opacity-40",
              )}
            >
              <Select
                value={String(choice.weight)}
                onValueChange={(value) => update(course.slug, { weight: Number(value) })}
              >
                <SelectTrigger aria-label={`Приоритет ${course.shortTitle}`} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.weight} value={String(priority.weight)}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label={`Закончить ${course.shortTitle} к дате`}
                title="Закончить к дате (необязательно)"
                value={choice.deadline}
                onChange={(event) => update(course.slug, { deadline: event.target.value })}
                className="w-40"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
