// Loaded only here: the second candidate for headings, to compare with Unbounded.
import "@fontsource-variable/montserrat";
import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ControlsSection } from "./sections/ControlsSection";
import { CourseSection } from "./sections/CourseSection";
import { FeedbackSection } from "./sections/FeedbackSection";
import { FoundationsSection } from "./sections/FoundationsSection";

const DISPLAY_FONTS = [
  { value: "unbounded", label: "Unbounded", css: '"Unbounded Variable", sans-serif' },
  { value: "montserrat", label: "Montserrat", css: '"Montserrat Variable", sans-serif' },
];

const CONTENTS = [
  { href: "#foundations", label: "Цвета и шрифты" },
  { href: "#controls", label: "Кнопки и формы" },
  { href: "#courses", label: "Курсы" },
  { href: "#feedback", label: "Сообщения и дорожная карта" },
];

/** Showcase of every UI element in the theme (SPEC §7). Approve it before building screens. */
export function DevUiPage() {
  const [font, setFont] = useState(DISPLAY_FONTS[0].value);
  const fontCss = DISPLAY_FONTS.find((item) => item.value === font)?.css ?? DISPLAY_FONTS[0].css;

  return (
    <div style={{ "--font-display": fontCss } as CSSProperties}>
      <header className="pt-8 pb-10 sm:pt-12">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
          Витрина интерфейса
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-muted">
          Все элементы Study Hub в нашей теме. Из них соберём каталог, плеер и план. Курсы и цифры
          здесь — пример.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <span id="font-label" className="text-sm text-ink-muted">
              Шрифт заголовков
            </span>
            <ToggleGroup
              type="single"
              aria-labelledby="font-label"
              value={font}
              onValueChange={(value) => value && setFont(value)}
              spacing={1}
              className="rounded-full border border-line bg-surface p-1"
            >
              {DISPLAY_FONTS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="h-8 rounded-full px-4 text-ink-muted data-[state=on]:bg-surface-2 data-[state=on]:text-ink"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <Link to="/dev/home" className="text-lilac underline-offset-4 hover:underline">
            Пример главной по макету
          </Link>
        </div>

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
      <FeedbackSection />
    </div>
  );
}
