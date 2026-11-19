import type { StatsDto } from "@shared/api";
import type { ReactNode } from "react";
import { formatDuration, pluralRu } from "@/lib/format";

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{hint}</p>
    </div>
  );
}

const days = (n: number) => `${n} ${pluralRu(n, ["день", "дня", "дней"])}`;

function notesHint(notes: NonNullable<StatsDto["notes"]>): string {
  const links = pluralRu(notes.links, ["ссылка", "ссылки", "ссылок"]);
  const timecodes = pluralRu(notes.timecodes, ["таймкод", "таймкода", "таймкодов"]);
  return `${notes.links} ${links} · ${notes.timecodes} ${timecodes}`;
}

/** The headline numbers of the period (SPEC §6.7). */
export function StatTiles({ stats }: { stats: StatsDto }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Время учёбы"
        value={formatDuration(stats.total)}
        hint={stats.period === "week" ? "за неделю" : "за месяц"}
      />
      <Tile
        label="Учебных дней"
        value={stats.activeDays}
        hint={`из ${stats.days.length} · от 5 минут в день`}
      />
      <Tile
        label="Серия"
        value={days(stats.streak.current)}
        hint={`рекорд — ${days(stats.streak.best)}`}
      />
      <Tile
        label="Заметки"
        value={stats.notes ? stats.notes.count : "—"}
        hint={stats.notes ? notesHint(stats.notes) : "хранилище не подключено"}
      />
    </div>
  );
}
