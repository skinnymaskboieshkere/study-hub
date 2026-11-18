import type { CourseCardDto } from "@shared/api";
import { COLLECTIONS, SUBJECTS } from "@shared/catalog";
import { cn } from "cn";
import { BookmarkPlus, SearchX } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { COLLECTION_LABEL, SUBJECT_LABEL } from "@/app/labels";
import { useCatalog } from "@/app/queries";
import { TRACKS } from "@/app/tracks";
import { CourseCard } from "@/components/course/CourseCard";
import { FilterChips } from "@/components/FilterChips";
import { CardGridSkeleton, QueryError } from "@/components/QueryState";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  countByCollection,
  filterCourses,
  filterFromParams,
  hasActiveFilters,
  type CollectionFilter,
} from "@/lib/catalog-filter";

const TRACK_OPTIONS = TRACKS.map((track) => ({
  value: track.slug,
  label: track.title,
  dotClass: track.dotClass,
}));

export function CatalogPage() {
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const filter = filterFromParams(params);
  const courses = useMemo(() => catalog.data?.courses ?? [], [catalog.data]);
  const visible = useMemo(() => filterCourses(courses, filter), [courses, filter]);
  const counts = countByCollection(courses);
  const universities = [...new Set(courses.map((course) => course.university))].sort();

  function update(name: string, value: string | string[]) {
    const next = new URLSearchParams(params);
    next.delete(name);
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item && item !== "all") next.append(name, item);
    }
    setParams(next, { replace: true });
  }

  function resetFilters() {
    const next = new URLSearchParams();
    if (filter.collection !== "all") next.set("collection", filter.collection);
    setParams(next, { replace: true });
  }

  return (
    <section className="pt-8 sm:pt-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Мои курсы
      </h1>
      <p className="mt-3 max-w-[60ch] text-ink-muted">
        Бесплатные курсы MIT, Harvard, Yale, Stanford и других университетов по четырём трекам.
      </p>

      <div className="no-scrollbar -mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ToggleGroup
          type="single"
          aria-label="Коллекция"
          value={filter.collection}
          onValueChange={(value) => value && update("collection", value)}
          spacing={1}
          className="rounded-full border border-line bg-surface p-1"
        >
          {(["all", ...COLLECTIONS] as CollectionFilter[]).map((value) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-9 rounded-full px-4 text-ink-muted data-[state=on]:bg-surface-2 data-[state=on]:text-ink"
            >
              {value === "all" ? "Все" : COLLECTION_LABEL[value]}
              <span className="font-mono text-xs text-ink-muted">{counts[value]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="mt-5 space-y-4">
        <FilterChips
          label="Трек"
          options={TRACK_OPTIONS}
          value={filter.tracks}
          onValueChange={(value) => update("track", value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Предмет"
            value={filter.subject}
            onChange={(value) => update("subject", value)}
            options={SUBJECTS.map((subject) => ({ value: subject, label: SUBJECT_LABEL[subject] }))}
          />
          <FilterSelect
            label="Университет"
            value={filter.university}
            onChange={(value) => update("university", value)}
            options={universities.map((name) => ({ value: name, label: name }))}
          />
          <FilterSelect
            label="Уровень"
            value={filter.level}
            onChange={(value) => update("level", value)}
            options={[1, 2, 3, 4].map((level) => ({
              value: String(level),
              label: `${level} курс`,
            }))}
          />
          {hasActiveFilters(filter) && (
            <Button variant="ghost" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {catalog.isPending ? (
          <CardGridSkeleton />
        ) : catalog.isError ? (
          <QueryError error={catalog.error} onRetry={() => void catalog.refetch()} />
        ) : visible.length === 0 ? (
          <EmptyCatalog
            collection={filter.collection}
            onReset={resetFilters}
            filtered={hasActiveFilters(filter)}
          />
        ) : (
          <CourseGroups courses={visible} />
        )}
      </div>
    </section>
  );
}

function FilterSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={props.value} onValueChange={props.onChange}>
      <SelectTrigger
        aria-label={props.label}
        className={cn("min-w-44 rounded-full", props.value !== "all" && "border-lilac/50 text-ink")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{props.label}: все</SelectItem>
        {props.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Courses grouped by track, in the order of the path. */
function CourseGroups({ courses }: { courses: CourseCardDto[] }) {
  return (
    <div className="space-y-12">
      {TRACKS.map((track) => {
        const inTrack = courses.filter((course) => course.track === track.slug);
        if (inTrack.length === 0) return null;
        return (
          <section key={track.slug} aria-labelledby={`track-${track.slug}`}>
            <h2
              id={`track-${track.slug}`}
              className="flex items-center gap-2.5 text-xl font-semibold text-ink"
            >
              <span aria-hidden className={cn("size-2.5 rounded-full", track.dotClass)} />
              {track.title}
              <span className="font-mono text-sm font-normal text-ink-muted">{inTrack.length}</span>
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {inTrack.map((course) => (
                <li key={course.slug}>
                  <CourseCard course={course} to={`/courses/${course.slug}`} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EmptyCatalog(props: {
  collection: CollectionFilter;
  filtered: boolean;
  onReset: () => void;
}) {
  if (props.filtered) {
    return (
      <StateMessage
        icon={SearchX}
        title="Под эти фильтры курсов нет"
        action={
          <Button variant="secondary" onClick={props.onReset}>
            Сбросить фильтры
          </Button>
        }
      >
        Убери часть фильтров — например, предмет или уровень.
      </StateMessage>
    );
  }
  const label = props.collection === "all" ? "каталоге" : `«${COLLECTION_LABEL[props.collection]}»`;
  return (
    <StateMessage icon={BookmarkPlus} title={`В ${label} пока пусто`}>
      Курс попадает в «В процессе» сам, как только начнёшь смотреть. Остальные коллекции выбираются
      на странице курса.
    </StateMessage>
  );
}
