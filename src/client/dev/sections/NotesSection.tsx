import { toast } from "sonner";
import { GraphView } from "@/components/notes/GraphView";
import { MarkdownPreview } from "@/components/notes/MarkdownPreview";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

const SAMPLE = `---
course: mit-18-01
tags: [матанализ]
---
# Производная

Производная — предел отношения приращений, см. [[Пределы#Определение|предел]]
и ещё не созданную заметку [[Интегралы]]. #матанализ/производные

$$
f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}
$$

\`\`\`python
def derivative(f, x, h=1e-6):
    return (f(x + h) - f(x)) / h  # численно
\`\`\`

- [x] Посмотреть лекцию 1
- [ ] Решить Problem Set 1

> Заметки — обычные файлы .md: они открываются и в Obsidian.
`;

const GRAPH = {
  nodes: [
    {
      id: "a",
      title: "Производная",
      tags: ["матанализ"],
      track: "foundation",
      missing: false,
      degree: 3,
    },
    { id: "b", title: "Пределы", tags: ["матанализ"], track: null, missing: false, degree: 1 },
    {
      id: "c",
      title: "Робот на колёсах",
      tags: ["робот"],
      track: "robotics",
      missing: false,
      degree: 1,
    },
    { id: "d", title: "Интегралы", tags: [], track: null, missing: true, degree: 1 },
  ],
  links: [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "a", target: "d" },
  ],
};

const PATHS = ["Матанализ/Пределы.md", "Матанализ/Производная.md"];

export function NotesSection() {
  return (
    <ShowcaseSection
      id="notes"
      title="Заметки"
      description="Просмотр заметки: ссылки [[…]] (пунктир — заметки ещё нет), теги, формулы KaTeX, подсветка кода и граф связей."
    >
      <ShowcaseGroup title="Просмотр заметки">
        <div className="max-w-3xl rounded-2xl border border-line bg-surface p-6">
          <MarkdownPreview
            text={SAMPLE}
            path="Матанализ/Производная.md"
            paths={PATHS}
            onOpenNote={(path) => toast(`Открыть ${path}`)}
            onCreateNote={(name) => toast(`Создать «${name}»`)}
            onTag={(tag) => toast(`Заметки с тегом #${tag}`)}
            onHeading={(heading) => toast(`К заголовку «${heading}»`)}
          />
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Граф заметок: цвет по треку, бледные — ещё не созданы">
        <GraphView
          graph={GRAPH}
          coloring="track"
          current="a"
          labelsFrom={0}
          className="h-64 max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface"
          onOpen={(node) => toast(`Открыть «${node.title}»`)}
        />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
