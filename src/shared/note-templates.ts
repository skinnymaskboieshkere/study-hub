/**
 * Video ↔ notes (SPEC §6.6): YouTube timecode links, the lecture note and the daily note.
 * Shared by the server (index, creating notes) and the client (hotkey, clicks).
 */

export interface VideoLink {
  videoId: string;
  /** Seconds from `t=`/`start=`, 0 when the link has no time. */
  tSec: number;
}

const VIDEO_ID = /^[\w-]{11}$/;

/** "754s", "754", "12m34s", "1h2m3s" → seconds. */
function parseTime(value: string | null): number {
  if (!value) return 0;
  if (/^\d+s?$/.test(value)) return Number.parseInt(value, 10);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !match[0]) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

/** A YouTube watch, short or embed link → video and time; anything else → null. */
export function parseYoutubeLink(href: string): VideoLink | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let videoId: string | null = null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else videoId = /^\/(?:embed|shorts|live)\/([\w-]{11})/.exec(url.pathname)?.[1] ?? null;
  } else if (host === "youtu.be") {
    videoId = url.pathname.slice(1, 12);
  }
  if (!videoId || !VIDEO_ID.test(videoId)) return null;
  return { videoId, tSec: parseTime(url.searchParams.get("t") ?? url.searchParams.get("start")) };
}

/** Seconds → "12:34" or "1:02:03". */
export function clock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/**
 * The timecode a hotkey inserts: an ordinary YouTube link, so it also works in Obsidian.
 * `[▶ 12:34](https://www.youtube.com/watch?v=<id>&t=754s)`
 */
export function timecodeMarkdown(videoId: string, seconds: number): string {
  const at = Math.max(0, Math.floor(seconds));
  return `[▶ ${clock(at)}](https://www.youtube.com/watch?v=${videoId}&t=${at}s)`;
}

/** Characters that break file names or Obsidian links become spaces. */
export function safeFileName(name: string, maxLength = 120): string {
  const clean = name
    .normalize("NFC")
    .replace(/[\\/:*?"<>|#^[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, maxLength)
    .trim();
  return clean || "Без названия";
}

/** `Courses/<Курс>/<NN> - <Лекция>.md` (SPEC §6.6). */
export function lectureNotePath(
  courseShortTitle: string,
  number: number,
  lessonTitle: string,
): string {
  return `Courses/${safeFileName(courseShortTitle, 60)}/${String(number).padStart(2, "0")} - ${safeFileName(lessonTitle)}.md`;
}

/** Obsidian-style placeholders: {{title}}, {{date}}, {{time}} and our own ones. */
export function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (all, key: string) => values[key] ?? all);
}

/** YAML string value that stays valid with quotes, colons or `#`. */
const yamlString = (value: string) => JSON.stringify(value);

/** Values every lecture template can use. */
export interface LectureValues {
  title: string;
  course: string;
  courseTitle: string;
  video: string;
  url: string;
  date: string;
  subject: string;
}

/** The built-in lecture template: frontmatter and the sections from SPEC §6.6. */
export function defaultLectureNote(values: LectureValues): string {
  return [
    "---",
    "type: lecture",
    `course: ${values.course}`,
    `video: ${values.video}`,
    `url: ${values.url}`,
    "status: in-progress",
    `created: ${values.date}`,
    `tags: [lecture, ${values.subject}]`,
    "---",
    `# ${values.title}`,
    "",
    `Курс: ${values.courseTitle} · [Видео](${values.url})`,
    "",
    "## Главные идеи",
    "",
    "- ",
    "",
    "## Таймкоды",
    "",
    "## Формулы",
    "",
    "## Непонятно",
    "",
    "## Связи",
    "",
    "## Где пригодится (робототехника / CV)",
    "",
  ].join("\n");
}

/** A user template from `Templates/Лекция.md` gets the same values and keeps its own text. */
export function lectureNoteFromTemplate(template: string, values: LectureValues): string {
  return applyTemplate(template, {
    ...values,
    titleYaml: yamlString(values.title),
    time: "",
  });
}

export interface DailyValues {
  date: string;
  /** "Среда, 18 ноября 2026" */
  title: string;
  /** Today's plan parts, one line each. */
  plan: string[];
}

/** The built-in daily note `Daily/YYYY-MM-DD.md` (SPEC §6.5): the day's plan as a checklist. */
export function defaultDailyNote(values: DailyValues): string {
  return [
    "---",
    "type: daily",
    `date: ${values.date}`,
    "tags: [daily]",
    "---",
    `# ${values.title}`,
    "",
    "## План на день",
    "",
    ...(values.plan.length ? values.plan.map((line) => `- [ ] ${line}`) : ["- [ ] "]),
    "",
    "## Заметки",
    "",
    "## Что понял сегодня",
    "",
  ].join("\n");
}

/** "Insert template": Obsidian's {{date}}, {{time}} and {{title}} for the moment of inserting. */
export function fillTemplate(template: string, title: string, now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return applyTemplate(template, {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    title,
  });
}

/**
 * Where the timecode hotkey puts its link when the cursor is not a deliberate place: never inside
 * the YAML properties. It goes to the end of the "Таймкоды" section as a list item, otherwise to
 * the end of the note. A cursor the student placed in the text is used as is.
 */
export function timecodeInsertion(
  doc: string,
  cursor: number,
  cursorPlaced: boolean,
  link: string,
): { from: number; insert: string } {
  const bom = doc.charCodeAt(0) === 0xfeff ? 1 : 0;
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(doc.slice(bom));
  const bodyStart = frontmatter ? bom + frontmatter[0].length : 0;
  if (cursorPlaced && cursor >= bodyStart) return { from: cursor, insert: link };

  const section = /^#{1,6}[ \t]+Таймкоды[ \t]*$/m.exec(doc.slice(bodyStart));
  if (section) {
    const afterHeading = bodyStart + section.index + section[0].length;
    const next = /^#{1,6}[ \t]+\S/m.exec(doc.slice(afterHeading));
    let end = next ? afterHeading + next.index : doc.length;
    // After the last line of the section; the blank lines before the next heading stay.
    while (end > afterHeading && /\s/.test(doc[end - 1] ?? "")) end -= 1;
    return { from: end, insert: `\n- ${link}` };
  }
  const end = doc.length;
  const needsBreak = end > 0 && !doc.endsWith("\n");
  return { from: end, insert: `${needsBreak ? "\n" : ""}- ${link}\n` };
}
