import { cn } from "cn";
import { TRACKS } from "@/app/tracks";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

const PALETTE = [
  { name: "Фон", hex: "#0A0810", className: "bg-night" },
  { name: "Поверхность", hex: "#120E1C", className: "bg-surface" },
  { name: "Поверхность 2", hex: "#1A1428", className: "bg-surface-2" },
  { name: "Границы", hex: "#2A2140", className: "bg-line" },
  { name: "Основной", hex: "#8B5CF6", className: "bg-brand" },
  { name: "Наведение", hex: "#7C3AED", className: "bg-brand-hover" },
  { name: "Ссылки и кольца", hex: "#A78BFA", className: "bg-lilac" },
  { name: "Свечение", hex: "#C084FC", className: "bg-glow" },
  { name: "Текст", hex: "#EDE9FE", className: "bg-ink" },
  { name: "Вторичный текст", hex: "#A09CB5", className: "bg-ink-muted" },
  { name: "Успех", hex: "#34D399", className: "bg-success" },
  { name: "Внимание", hex: "#FBBF24", className: "bg-warning" },
  { name: "Ошибка", hex: "#F87171", className: "bg-danger" },
];

const TYPE_SCALE = [
  {
    spec: "Заголовок баннера · до 56 px · широкий жирный",
    className: "font-display text-[clamp(2rem,9vw,3.5rem)] leading-[1.05] font-extrabold uppercase",
    text: "Путь к Computer Vision",
  },
  {
    spec: "Заголовок страницы · 36 px",
    className: "font-display text-4xl font-bold",
    text: "Линейная алгебра",
  },
  {
    spec: "Заголовок секции · 24 px · Inter 600",
    className: "text-2xl font-semibold",
    text: "План на сегодня",
  },
  {
    spec: "Основной текст · 16–18 px · Inter",
    className: "max-w-[60ch] text-lg leading-relaxed",
    text: "Лекции MIT, Harvard и Stanford, план на каждый день и конспекты в твоём Obsidian — в одном месте.",
  },
  {
    spec: "Вторичный текст · 14 px",
    className: "text-sm text-ink-muted",
    text: "MIT · Gilbert Strang · 34 лекции",
  },
  {
    spec: "Таймкоды и длительность · JetBrains Mono",
    className: "font-mono text-sm tabular-nums",
    text: "12:34 · 1:12:05 · 45 мин",
  },
];

export function FoundationsSection() {
  return (
    <ShowcaseSection
      id="foundations"
      title="Цвета и шрифты"
      description="Палитра из SPEC и цвета треков. Цвет трека везде один и тот же: в карточках, на дорожной карте, в календаре."
    >
      <ShowcaseGroup title="Палитра">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {PALETTE.map((color) => (
            <li key={color.hex}>
              <span className={cn("block h-16 rounded-xl ring-1 ring-white/10", color.className)} />
              <p className="mt-2 text-sm text-ink">{color.name}</p>
              <p className="font-mono text-xs text-ink-muted">{color.hex}</p>
            </li>
          ))}
        </ul>
      </ShowcaseGroup>

      <ShowcaseGroup title="Цвета треков">
        <ul className="flex flex-wrap gap-6">
          {TRACKS.map((track) => (
            <li key={track.slug} className="flex items-center gap-2.5">
              <span className={cn("size-4 rounded-full", track.dotClass)} />
              <span className="text-ink">{track.title}</span>
            </li>
          ))}
        </ul>
      </ShowcaseGroup>

      <ShowcaseGroup title="Шрифты">
        <div className="space-y-6">
          {TYPE_SCALE.map((row) => (
            <div key={row.spec} className="grid gap-2 lg:grid-cols-[16rem_1fr] lg:items-baseline">
              <p className="text-xs text-ink-muted">{row.spec}</p>
              <p className={cn("text-ink", row.className)}>{row.text}</p>
            </div>
          ))}
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
