import { Link } from "react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export function RoadmapPage() {
  return (
    <PagePlaceholder
      title="Траектории"
      description="Дорожная карта из четырёх треков с пререквизитами: что уже доступно, что лучше отложить и сколько часов осталось до Computer Vision."
      stage="6"
    />
  );
}

export function StatsPage() {
  return (
    <PagePlaceholder
      title="Статистика"
      description="Часы по трекам и предметам за неделю и месяц, серия дней подряд и прогресс к Computer Vision."
      stage="7"
    />
  );
}

export function SettingsPage() {
  return (
    <PagePlaceholder
      title="Настройки"
      description="Путь к vault, учебные дни, субтитры, хоткеи и резервная копия данных."
      stage="7"
    />
  );
}

export function NotFoundPage() {
  return (
    <section className="pt-8 sm:pt-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Такой страницы нет
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        Проверь адрес или вернись{" "}
        <Link to="/" className="text-lilac underline-offset-4 hover:underline">
          на главную
        </Link>
        .
      </p>
    </section>
  );
}
