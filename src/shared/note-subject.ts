import { SUBJECTS, type Subject } from "./catalog";
import { frontmatterTags, normalizeTag } from "./notes";
import { parseYoutubeLink } from "./note-templates";

/** Words that name a subject in `subject:` or a tag, besides the key itself (`math`). */
const SUBJECT_WORDS: Record<Subject, string[]> = {
  programming: ["программирование", "programming", "cs"],
  math: ["математика", "mathematics", "maths"],
  physics: ["физика"],
  engineering: ["инженерия", "электроника", "electronics"],
  robotics: ["робототехника"],
  cv: ["компьютерное зрение", "компьютерное-зрение", "computer vision", "computer-vision"],
};

const BY_WORD = new Map<string, Subject>(
  SUBJECTS.flatMap((subject) =>
    [subject, ...SUBJECT_WORDS[subject]].map((word) => [word, subject]),
  ),
);

/** "Математика", "#math", "Computer Vision" → the subject; anything else → null. */
export function subjectFromWord(value: unknown): Subject | null {
  if (typeof value !== "string") return null;
  return BY_WORD.get(normalizeTag(value.trim().replace(/^#/, "")).replace(/\s+/g, " ")) ?? null;
}

/** What the catalog knows: the subject of each course and the course of each video. */
export interface SubjectLookup {
  courseSubject: ReadonlyMap<string, Subject>;
  videoCourse: ReadonlyMap<string, string>;
}

function videoId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  return parseYoutubeLink(text)?.videoId ?? null;
}

/**
 * Subject of a note, so the notes can be told apart and filtered:
 * `subject:` in the frontmatter → `course:` → the course of `video:` → the first subject tag.
 */
export function noteSubject(
  frontmatter: Record<string, unknown> | null,
  tags: readonly string[],
  lookup: SubjectLookup,
): Subject | null {
  const fm = frontmatter ?? {};
  const explicit = subjectFromWord(fm.subject);
  if (explicit) return explicit;
  if (typeof fm.course === "string") {
    const subject = lookup.courseSubject.get(fm.course.trim());
    if (subject) return subject;
  }
  const video = videoId(fm.video);
  const course = video ? lookup.videoCourse.get(video) : undefined;
  const fromVideo = course ? lookup.courseSubject.get(course) : undefined;
  if (fromVideo) return fromVideo;
  for (const tag of [...frontmatterTags(fm.tags), ...tags]) {
    const subject = subjectFromWord(tag);
    if (subject) return subject;
  }
  return null;
}
