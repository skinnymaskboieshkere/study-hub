import { Link } from "react-router";
import { ControlsSection } from "./sections/ControlsSection";
import { CourseSection } from "./sections/CourseSection";
import { FeedbackSection } from "./sections/FeedbackSection";
import { FoundationsSection } from "./sections/FoundationsSection";
import { PlanSection } from "./sections/PlanSection";

const CONTENTS = [
  { href: "#foundations", label: "Цвета и шрифты" },
  { href: "#controls", label: "Кнопки и формы" },
  { href: "#courses", label: "Курсы" },
  { href: "#plan", label: "План и календарь" },
  { href: "#feedback", label: "Сообщения и дорожная карта" },
];

/** Showcase of every UI element in the theme (SPEC §7). Approved on 18.11.2026. */
export function DevUiPage() {
  return (
    <>
      <header className="pt-8 pb-10 sm:pt-12">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
          Витрина интерфейса
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-muted">
          Все элементы Study Hub в нашей теме. Из них соберём каталог, плеер и план. Курсы и цифры
          здесь — пример.
        </p>
        <Link
          to="/dev/home"
          className="mt-6 inline-block text-lilac underline-offset-4 hover:underline"
        >
          Пример главной по макету
        </Link>

        <nav aria-label="Разделы витрины" className="mt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {CONTENTS.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-ink-muted hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <FoundationsSection />
      <ControlsSection />
      <CourseSection />
      <PlanSection />
      <FeedbackSection />
    </>
  );
}
