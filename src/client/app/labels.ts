import type { Collection, Subject, VideoKind } from "@shared/catalog";

export const SUBJECT_LABEL: Record<Subject, string> = {
  programming: "Программирование",
  math: "Математика",
  physics: "Физика",
  engineering: "Инженерия",
  robotics: "Робототехника",
  cv: "Компьютерное зрение",
};

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
