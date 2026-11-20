import type { Collection, Subject, VideoKind } from "@shared/catalog";

export const SUBJECT_LABEL: Record<Subject, string> = {
  programming: "Программирование",
  math: "Математика",
  physics: "Физика",
  engineering: "Инженерия",
  robotics: "Робототехника",
  cv: "Компьютерное зрение",
};

/** Subject colors (theme tokens in styles/index.css): the calendar paints parts with them. */
export const SUBJECT_COLOR: Record<Subject, { color: string; dotClass: string }> = {
  programming: { color: "var(--color-subject-programming)", dotClass: "bg-subject-programming" },
  math: { color: "var(--color-subject-math)", dotClass: "bg-subject-math" },
  physics: { color: "var(--color-subject-physics)", dotClass: "bg-subject-physics" },
  engineering: { color: "var(--color-subject-engineering)", dotClass: "bg-subject-engineering" },
  robotics: { color: "var(--color-subject-robotics)", dotClass: "bg-subject-robotics" },
  cv: { color: "var(--color-subject-cv)", dotClass: "bg-subject-cv" },
};

/** Options for subject filter chips (catalog, notes), in the given order. */
export function subjectChipOptions(subjects: readonly Subject[]) {
  return subjects.map((subject) => ({
    value: subject,
    label: SUBJECT_LABEL[subject],
    dotClass: SUBJECT_COLOR[subject].dotClass,
  }));
}

export const COLLECTION_LABEL: Record<Collection, string> = {
  wishlist: "Хочу пройти",
  active: "В процессе",
  completed: "Завершено",
  archived: "Архив",
};

export const KIND_LABEL: Record<VideoKind, string> = {
  lecture: "Лекция",
  section: "Семинар",
  recitation: "Разбор задач",
  "problem-solving": "Разбор задач",
  short: "Коротко",
};
