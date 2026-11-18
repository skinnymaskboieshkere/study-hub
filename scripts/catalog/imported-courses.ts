import type { SeedUnit } from "@shared/catalog";
import {
  interleaveProportionally,
  numberFromTitle,
  toSeedVideo,
  unitsFromLecturePlaylist,
  type FetchedVideo,
} from "../../src/server/catalog/playlist-import";
import type { ImportedCourseRecipe } from "./types";

const CC_BY_NC_SA_4 = "CC BY-NC-SA 4.0";

/** Official playlists, found on the universities' own channels (18.11.2026). */
const PL = {
  cs50xLectures: "PLhQjrBD2T380hlTqAU8HfvVepCcjCqTg6",
  cs50xSections: "PLhQjrBD2T3839iqxqUdw7NWOCboh00vsV",
  /** Russian AI voice-over of CS50 2025 lectures 0–6 by MAAS; credits Harvard. */
  cs50xRussian: "PLudBa18bToPMESXZBX0Ul1M6t2MJ7y_pu",
  cs50p: "PLhQjrBD2T3817j24-GogXmWqO5Q5vYy0V",
  mit1801: "PL590CCC2BC5AF3BC1",
  mit1801Recitations: "PL21BCE50ABFF029F1",
  mit1806sc: "PL221E2BBF13BECF6C",
  yalePhys200: "PLFE3074A4CB751B2B",
  mit801sc: "PLUl4u3cNGP61qDex7XslwNJ-xxxEFzMNV",
  mit6042j: "PLB7540DEDD482705B",
  cs106b: "PLFE6E58F856038C69",
};

/** Video titles from ocw.mit.edu (video lectures gallery); the playlist has the same 35 in order. */
const MIT_1801_TOPICS: [number, string][] = [
  [1, "Rate of Change"],
  [2, "Limits"],
  [3, "Derivatives"],
  [4, "Chain Rule"],
  [5, "Implicit Differentiation"],
  [6, "Exponential and Log"],
  [7, "Exam 1 Review"],
  [9, "Linear and Quadratic Approximations"],
  [10, "Curve Sketching"],
  [11, "Max-min"],
  [12, "Related Rates"],
  [13, "Newton's Method"],
  [14, "Mean Value Theorem"],
  [15, "Antiderivatives"],
  [16, "Differential Equations"],
  [18, "Definite Integrals"],
  [19, "First Fundamental Theorem"],
  [20, "Second Fundamental Theorem"],
  [21, "Applications to Logarithms"],
  [22, "Volumes"],
  [23, "Work, Probability"],
  [24, "Numerical Integration"],
  [25, "Exam 3 Review"],
  [27, "Trig Integrals"],
  [28, "Inverse Substitution"],
  [29, "Partial Fractions"],
  [30, "Integration by Parts"],
  [31, "Parametric Equations"],
  [32, "Polar Coordinates"],
  [33, "Exam 4 Review"],
  [35, "Indeterminate Forms"],
  [36, "Improper Integrals"],
  [37, "Infinite Series"],
  [38, "Taylor's Series"],
  [39, "Final Review"],
];

/** "CS50x - Lecture 3 - Algorithms" → "Algorithms". */
function topicAfterNumber(title: string) {
  return title.replace(/^.*?(?:Lecture|Section)\s*\d+\s*-\s*/i, "").trim();
}

function byNumber(videos: FetchedVideo[]) {
  const map = new Map<number, FetchedVideo>();
  for (const video of videos) {
    const number = numberFromTitle(video.title);
    if (number !== undefined && !map.has(number)) map.set(number, video);
  }
  return map;
}

const cs50x: ImportedCourseRecipe = {
  playlistIds: [PL.cs50xLectures, PL.cs50xSections, PL.cs50xRussian],
  meta: {
    slug: "cs50x",
    title: "CS50x: Introduction to Computer Science",
    shortTitle: "CS50x",
    university: "Harvard",
    instructors: ["David J. Malan"],
    subject: "programming",
    level: 1,
    description:
      "Основы программирования от Гарварда: C, массивы, алгоритмы, память и структуры данных, затем Python, SQL и веб. Лекции 0–6 — русская озвучка, остальное — оригинал с русскими субтитрами.",
    sourceUrl: "https://cs50.harvard.edu/x/",
    license: CC_BY_NC_SA_4,
    translation: {
      channelTitle: "MAAS",
      playlistId: PL.cs50xRussian,
      note: "Лекции 0–6: русская озвучка нейросетью (Soni Translate), автор оригинала — Harvard CS50.",
    },
    materials: [{ title: "Задачи (Problem Sets)", url: "https://cs50.harvard.edu/x/psets/" }],
    skills: ["c", "algorithms", "memory", "data-structures", "python", "sql"],
  },
  async build(load) {
    const [lectures, sections, russian] = await Promise.all([
      load(PL.cs50xLectures),
      load(PL.cs50xSections),
      load(PL.cs50xRussian),
    ]);
    const sectionByNumber = byNumber(sections);
    const russianByNumber = byNumber(russian);
    const units: SeedUnit[] = [];

    for (const video of lectures) {
      if (/introduction$/i.test(video.title)) {
        units.push({ title: "Введение", videos: [toSeedVideo(video, "short", "О курсе CS50x")] });
        continue;
      }
      const number = numberFromTitle(video.title);
      if (number === undefined) {
        // Bonus lectures without a number, e.g. "Artificial Intelligence".
        const topic = video.title.replace(/^CS50x\s*-\s*/i, "");
        units.push({ title: topic, videos: [toSeedVideo(video, "lecture", `Лекция — ${topic}`)] });
        continue;
      }
      const topic = topicAfterNumber(video.title);
      const russianVideo = russianByNumber.get(number);
      const lecture = russianVideo
        ? toSeedVideo(russianVideo, "lecture", `Лекция ${number} — ${topic}`, {
            language: "ru",
            originalYoutubeId: video.youtubeId,
          })
        : toSeedVideo(video, "lecture", `Лекция ${number} — ${topic}`);
      const section = sectionByNumber.get(number);
      units.push({
        title: `Неделя ${number} · ${topic}`,
        videos: section
          ? [lecture, toSeedVideo(section, "section", `Семинар ${number} — ${topic}`)]
          : [lecture],
      });
    }
    return units;
  },
};

const cs50p: ImportedCourseRecipe = {
  playlistIds: [PL.cs50p],
  meta: {
    slug: "cs50p",
    title: "CS50P: Introduction to Programming with Python",
    shortTitle: "CS50P",
    university: "Harvard",
    instructors: ["David J. Malan"],
    subject: "programming",
    level: 1,
    description:
      "Python с нуля от Гарварда: функции, условия, циклы, исключения, библиотеки, тесты, файлы, регулярные выражения и ООП. Python — основной язык Computer Vision.",
    sourceUrl: "https://cs50.harvard.edu/python/",
    license: CC_BY_NC_SA_4,
    materials: [{ title: "Задачи (Problem Sets)", url: "https://cs50.harvard.edu/python/psets/" }],
    skills: ["python", "testing", "regex", "oop"],
  },
  async build(load) {
    const videos = await load(PL.cs50p);
    return videos.map((video): SeedUnit => {
      const number = numberFromTitle(video.title);
      if (number === undefined) {
        return { title: "Введение", videos: [toSeedVideo(video, "short", "О курсе CS50P")] };
      }
      const topic = topicAfterNumber(video.title);
      return {
        title: `Неделя ${number} · ${topic}`,
        videos: [toSeedVideo(video, "lecture", `Лекция ${number} — ${topic}`)],
      };
    });
  },
};

const mit1801: ImportedCourseRecipe = {
  playlistIds: [PL.mit1801, PL.mit1801Recitations],
  meta: {
    slug: "mit-18-01",
    title: "18.01 Single Variable Calculus",
    shortTitle: "18.01",
    university: "MIT",
    instructors: ["David Jerison"],
    subject: "math",
    level: 1,
    description:
      "Матанализ одной переменной: производные и их приложения, интегралы, методы интегрирования, ряды. Между лекциями — короткие разборы задач из 18.01SC (расставлены по порядку тем примерно).",
    sourceUrl: "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/",
    license: CC_BY_NC_SA_4,
    materials: [
      {
        title: "Задания",
        url: "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/pages/assignments/",
      },
      {
        title: "Экзамены с решениями",
        url: "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/pages/exams/",
      },
    ],
    skills: ["derivatives", "integrals", "series"],
  },
  async build(load) {
    const [lectures, recitations] = await Promise.all([
      load(PL.mit1801),
      load(PL.mit1801Recitations),
    ]);
    if (lectures.length !== MIT_1801_TOPICS.length) {
      throw new Error(`18.01: expected ${MIT_1801_TOPICS.length} lectures, got ${lectures.length}`);
    }
    const [intro, ...problems] = recitations;
    const stripSuffix = (title: string) => title.replace(/\s*\|\s*MIT 18\.01SC.*$/i, "");

    return interleaveProportionally(lectures, problems).map(({ item, extras }, index) => {
      const [number, topic] = MIT_1801_TOPICS[index] ?? [index + 1, item.title];
      const videos = [toSeedVideo(item, "lecture", `Лекция ${number} — ${topic}`)];
      if (index === 0 && intro)
        videos.push(toSeedVideo(intro, "short", "Как устроены разборы задач"));
      for (const problem of extras) {
        videos.push(
          toSeedVideo(problem, "recitation", `Разбор задач: ${stripSuffix(problem.title)}`),
        );
      }
      return { title: topic, videos };
    });
  },
};

const mit1806: ImportedCourseRecipe = {
  playlistIds: [PL.mit1806sc],
  meta: {
    slug: "mit-18-06",
    title: "18.06SC Linear Algebra",
    shortTitle: "18.06",
    university: "MIT",
    instructors: ["Gilbert Strang"],
    subject: "math",
    level: 1,
    description:
      "Линейная алгебра Гилберта Стрэнга — ключевой курс для CV и робототехники: системы уравнений, подпространства, ортогональность, определители, собственные значения, SVD. После лекций — короткие разборы задач.",
    sourceUrl: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
    license: CC_BY_NC_SA_4,
    materials: [],
    skills: ["linear-algebra", "matrices", "eigenvalues", "svd"],
  },
  async build(load) {
    const videos = (await load(PL.mit1806sc)).filter(
      // An interview and a recitation of another course (18.085) sit in the same playlist.
      (video) => !/interview|18\.085/i.test(video.title),
    );
    const units: SeedUnit[] = [];
    for (const video of videos) {
      const number = /^\s*(\d+)\.\s/.exec(video.title)?.[1];
      if (number) {
        const topic = video.title.replace(/^\s*\d+\.\s*/, "").replace(/\.$/, "");
        units.push({
          title: topic,
          videos: [toSeedVideo(video, "lecture", `Лекция ${number} — ${topic}`)],
        });
        continue;
      }
      const isIntro = /course introduction|overview of key ideas/i.test(video.title);
      const seed = isIntro
        ? toSeedVideo(video, "short", video.title.replace(/\s*\|.*$/, ""))
        : toSeedVideo(video, "problem-solving", `Разбор задач: ${video.title}`);
      const last = units.at(-1);
      if (last) last.videos.push(seed);
      else units.push({ title: "Введение", videos: [seed] });
    }
    return units;
  },
};

const yalePhys200: ImportedCourseRecipe = {
  playlistIds: [PL.yalePhys200],
  meta: {
    slug: "yale-phys-200",
    title: "PHYS 200: Fundamentals of Physics I",
    shortTitle: "PHYS 200",
    university: "Yale",
    instructors: ["Ramamurti Shankar"],
    subject: "physics",
    level: 1,
    description:
      "Основы физики I: механика Ньютона, энергия и импульс, вращение, относительность, колебания и волны, жидкости — и в конце термодинамика. С этого курса начинается физика.",
    sourceUrl: "https://oyc.yale.edu/physics/phys-200",
    license: "CC BY-NC-SA 3.0",
    materials: [
      {
        title: "Задачи и конспекты (Open Yale Courses)",
        url: "https://oyc.yale.edu/physics/phys-200",
      },
    ],
    skills: ["mechanics", "relativity", "oscillations", "thermodynamics"],
  },
  async build(load) {
    const videos = await load(PL.yalePhys200);
    return videos.map((video, index) => {
      const number = numberFromTitle(video.title) ?? index + 1;
      const topic = video.title.replace(/^\s*\d+\.\s*/, "");
      return {
        title: topic,
        videos: [toSeedVideo(video, "lecture", `Лекция ${number} — ${topic}`)],
      };
    });
  },
};

const mit801sc: ImportedCourseRecipe = {
  playlistIds: [PL.mit801sc],
  meta: {
    slug: "mit-8-01sc",
    title: "8.01SC Classical Mechanics",
    shortTitle: "8.01SC",
    university: "MIT",
    instructors: [
      "Deepto Chakrabarty",
      "Peter Dourmashkin",
      "Michelle Tomasik",
      "Anna Frebel",
      "Vladan Vuletic",
    ],
    subject: "physics",
    level: 1,
    description:
      "Классическая механика MIT в коротких видео по 2–10 минут, с разборами задач. Для повторения и практики к механике.",
    sourceUrl: "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/",
    license: CC_BY_NC_SA_4,
    materials: [],
    skills: ["mechanics"],
  },
  async build(load) {
    const weeks = new Map<string, SeedUnit>();
    const intro: SeedUnit = { title: "Введение", videos: [] };
    const problems: SeedUnit = { title: "Разборы задач", videos: [] };
    const extra: SeedUnit = { title: "Дополнительно", videos: [] };

    for (const video of await load(PL.mit801sc)) {
      // "1.3 Displacement Vector in 1D" → week 1; "DD.2.5 …" (deeper dive) → week 2.
      const week = /^(?:DD\.)?(\d+)\.\d+\s/.exec(video.title)?.[1];
      if (week !== undefined) {
        const title = week === "0" ? "Векторы" : `Неделя ${week}`;
        const unit = weeks.get(title) ?? { title, videos: [] };
        const kind = /worked example/i.test(video.title) ? "problem-solving" : "lecture";
        unit.videos.push(toSeedVideo(video, kind, video.title));
        weeks.set(title, unit);
      } else if (/^PS?\.\d+\.\d+/.test(video.title)) {
        // "PS.2.1 Worked Example - Sliding Block": problem-solving sets.
        problems.videos.push(toSeedVideo(video, "problem-solving", video.title));
      } else if (/introduction/i.test(video.title) && intro.videos.length === 0) {
        intro.videos.push(toSeedVideo(video, "short", video.title));
      } else {
        extra.videos.push(toSeedVideo(video, "lecture", video.title));
      }
    }
    return [intro, ...weeks.values(), problems, extra].filter((unit) => unit.videos.length > 0);
  },
};

function simpleLectureCourse(
  playlistId: string,
  meta: ImportedCourseRecipe["meta"],
): ImportedCourseRecipe {
  return {
    playlistIds: [playlistId],
    meta,
    async build(load) {
      const units = unitsFromLecturePlaylist(await load(playlistId));
      // These playlists title every video "Lec N | Course name": keep just "Лекция N".
      return units.map((unit) => ({
        ...unit,
        videos: unit.videos.map((video) => ({
          ...video,
          title: video.title.replace(/ — .*$/, ""),
        })),
      }));
    },
  };
}

const mit6042j = simpleLectureCourse(PL.mit6042j, {
  slug: "mit-6-042j",
  title: "6.042J Mathematics for Computer Science",
  shortTitle: "6.042J",
  university: "MIT",
  instructors: ["Tom Leighton", "Marten van Dijk"],
  subject: "math",
  level: 1,
  description:
    "Математика для информатики: доказательства, теория чисел, графы, комбинаторика и вероятность.",
  sourceUrl: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/",
  license: CC_BY_NC_SA_4,
  materials: [],
  skills: ["proofs", "graphs", "combinatorics", "probability"],
});

const cs106b = simpleLectureCourse(PL.cs106b, {
  slug: "stanford-cs106b",
  title: "CS106B: Programming Abstractions",
  shortTitle: "CS106B",
  university: "Stanford",
  instructors: ["Julie Zelenski"],
  subject: "programming",
  level: 1,
  description:
    "Абстракции программирования на C++: рекурсия, классы, указатели, связные списки, деревья и графы. Запись 2008 года, своих субтитров у видео нет.",
  sourceUrl: "https://see.stanford.edu/Course/CS106B",
  license: "Условия Stanford Engineering Everywhere (лицензия на сайте не указана)",
  materials: [],
  skills: ["c++", "recursion", "data-structures"],
});

export const IMPORTED_COURSES: ImportedCourseRecipe[] = [
  cs50x,
  cs50p,
  mit1801,
  mit1806,
  yalePhys200,
  mit801sc,
  mit6042j,
  cs106b,
];
