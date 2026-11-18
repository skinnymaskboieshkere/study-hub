/** Speeds offered in the player (Shift+←/→ moves between 0.5× and 2×). */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

/** Keeps a speed in the range the YouTube player accepts, in steps of 0.25. */
export function clampRate(rate: number): number {
  return Math.min(2, Math.max(0.5, Math.round(rate * 4) / 4));
}

/** What a YouTube player error code means for the student (SPEC §6.2, §9.1). */
export function playerErrorText(code: number): { title: string; text: string } {
  switch (code) {
    case 101:
    case 150:
      return {
        title: "Это видео нельзя показать в приложении",
        text: `Автор запретил встраивание (ошибка ${code}). Посмотри его на YouTube и отметь лекцию вручную.`,
      };
    case 100:
      return {
        title: "Видео удалено или скрыто",
        text: "YouTube больше не отдаёт это видео (ошибка 100). Попробуй открыть его на YouTube — возможно, оно переехало.",
      };
    case 153:
      return {
        title: "YouTube не принял страницу",
        text: "Плееру не хватило адреса страницы (ошибка 153). Открой приложение по адресу http://127.0.0.1:5180, а не из файла.",
      };
    case -1:
      return {
        title: "Плеер YouTube не загрузился",
        text: "Не удалось загрузить плеер. Проверь интернет и обнови страницу.",
      };
    default:
      return {
        title: "Плеер не смог показать видео",
        text: `Ошибка ${code}. Обнови страницу или открой видео на YouTube.`,
      };
  }
}
