import type { SeedUnit, SeedVideo, VideoKind } from "@shared/catalog";
import {
  interleaveProportionally,
  lectureTitle,
  lectureTopic,
  numberFromTitle,
  toSeedVideo,
  type FetchedVideo,
} from "../../src/server/catalog/playlist-import";
import { TRACK_2_4_META } from "./tracks-2-4-meta";
import type { CourseMeta, ImportedCourseRecipe, LoadPlaylist } from "./types";

/**
 * Tracks 2–4 (SPEC §4, stage 7b). Every playlist is on the university's or the course's own
 * channel and was checked on 19.11.2026: available, embeddable (except CS231n 2025, by the
 * user's choice), in course order. No complete Russian translations were found for these
 * courses, so they play the originals with Russian auto-translated subtitles (BRIEF).
 */
const PL = {
  mit1802: "PL4C4C8A7D06566F38",
  /** 18.02SC "Homework Help": 70 short problem-solving videos (BRIEF: practice in the plan). */
  mit1802Practice: "PLF07555F3CC669D01",
  mit1803: "PLEC88901EBADDD980",
  /** 18.03SC: the 2006 lectures with recitations between them, in course order. */
  mit1803sc: "PL64BDFBDA2AF24F7E",
  yalePhys201: "PLD07B2225BB40E582",
  mit803sc: "PLUl4u3cNGP61R5sPDPKVfcFlu95wSs2Kx",
  mit6002: "PL9F74AFA03AA06A11",
  res6007: "PL41692B571DD0AF9B",
  stat110: "PL2SOU6wwxB0uwwH80KTQ6ht66KWxbzTIo",
  controlBootcamp: "PLMrJAkhIeNNR20Mz-VpzgfQs5zrYi085m",
  cs223a: "PL65CC0384A1798ADF",
  modernRobotics: "PLggLP4f-rq02vX0OQQ5vrCxbJrzamYDfx",
  /** Russ Tedrake's course channel, linked from underactuated.mit.edu. */
  manipulation2023: "PLkx8KyIQkMfWr191lqbN8WfV08j-ui8WX",
  underactuated2024: "PLkx8KyIQkMfU5szP43GlE_S1QGSPQfL9s",
  /** Course channel of 6.S191, linked from introtodeeplearning.com; newest year first. */
  mit6s191: "PLtBw6njQRU-rwp5__7C0oIVt26ZgjG9NI",
  eecs498: "PL5-TkQAfAZFbzxjBHtzdVCWE0Zbhomg7r",
  /** Stanford Online, Spring 2025: not embeddable — opened on YouTube. */
  cs231n2025: "PLoROMvodv4rOmsNzYBMe0gJY2XS8AQg16",
  /** University page links this playlist (Summer 2025). */
  tuebingenCv: "PL05umP7R6ij35L2MHGzis8AEHz7mg381_",
};

/** FPCV modules in the order of fpcv.cs.columbia.edu, one playlist each. */
const FPCV_MODULES: [string, string][] = [
  ["Введение", "PL2zRqk16wsdoz4eycyq7EmeV2KpE6JN76"],
  ["Формирование изображения, сенсоры, бинарные изображения", "PL2zRqk16wsdr9X5rgF-d0pkzPdkHZ4KiT"],
  ["Обработка изображений", "PL2zRqk16wsdorCSZ5GWZQr1EMWXs2TDeu"],
  ["Края, границы, SIFT", "PL2zRqk16wsdqXEMpHrc4Qnb5rA1Cylrhx"],
  ["Склейка панорам, детекция лиц", "PL2zRqk16wsdp8KbDfHKvPYNGF2L-zQASc"],
  ["Радиометрия, фотометрическое стерео, форма по затенению", "PL2zRqk16wsdpyQNZ6WFlGQtDICpzzQ925"],
  ["Глубина по расфокусу, активная подсветка", "PL2zRqk16wsdowTcMVNhV0-7RjSOBS4rHO"],
  ["Калибровка камеры, некалиброванное стерео", "PL2zRqk16wsdoCCLpou-dGo7QQNks1Ppzo"],
  ["Оптический поток, структура из движения, трекинг", "PL2zRqk16wsdoYzrWStffqBAoUY8XdvatV"],
  ["Сегментация изображений", "PL2zRqk16wsdop2EatuowXBX5C-r2FdyNt"],
  ["Сопоставление по внешнему виду", "PL2zRqk16wsdoKHr5sfK1qqsJTDMl_MBs2"],
  ["Нейронные сети", "PL2zRqk16wsdo3VJmrusPU6xXHk37RuKzi"],
];

const META = new Map(TRACK_2_4_META.map(({ meta }) => [meta.slug, meta]));

function meta(slug: string): CourseMeta {
  const found = META.get(slug);
  if (!found) throw new Error(`tracks-2-4: no description for ${slug}`);
  return found;
}

const lecture = (video: FetchedVideo, index: number) =>
  toSeedVideo(video, "lecture", lectureTitle(video.title, index + 1));

/** One "Лекции" unit, lectures in order with clean "Лекция N — topic" titles. */
function lectureUnit(videos: FetchedVideo[], title = "Лекции"): SeedUnit {
  return { title, videos: videos.map(lecture) };
}

/** Lectures sorted by their number (a playlist that lost its order). */
const byLectureNumber = (videos: FetchedVideo[]) =>
  [...videos].sort((a, b) => (numberFromTitle(a.title) ?? 999) - (numberFromTitle(b.title) ?? 999));

function course(
  slug: string,
  playlistIds: string[],
  build: (load: LoadPlaylist) => Promise<SeedUnit[]>,
): ImportedCourseRecipe {
  return { meta: meta(slug), playlistIds, build };
}

/** A course that is just its lecture playlist. */
const lecturesOnly = (slug: string, playlistId: string) =>
  course(slug, [playlistId], async (load) => [lectureUnit(await load(playlistId))]);

const stripCourse = (title: string) => title.replace(/\s*\|\s*MIT 18\.0[23]SC.*$/i, "").trim();

/** 18.02 with the 18.02SC problem videos spread between the lectures. */
const mit1802 = course("mit-18-02", [PL.mit1802, PL.mit1802Practice], async (load) => {
  const [lectures, problems] = await Promise.all([load(PL.mit1802), load(PL.mit1802Practice)]);
  return [
    {
      title: "Лекции и разбор задач",
      videos: interleaveProportionally(lectures, problems).flatMap(({ item, extras }, index) => [
        lecture(item, index),
        ...extras.map((problem) =>
          toSeedVideo(problem, "problem-solving", `Разбор задачи: ${stripCourse(problem.title)}`),
        ),
      ]),
    },
  ];
});

/**
 * 18.03 lectures with the 18.03SC recitations after the lecture they follow in the SC
 * playlist. The applet walkthroughs are left out: they need the applets next to them.
 */
const mit1803 = course("mit-18-03", [PL.mit1803, PL.mit1803sc], async (load) => {
  const [lectures, sc] = await Promise.all([load(PL.mit1803), load(PL.mit1803sc)]);
  const after = new Map<number, FetchedVideo[]>();
  let current = 1;
  for (const video of sc) {
    const number = /^Lec\s*\d+/i.test(video.title) ? numberFromTitle(video.title) : undefined;
    if (number !== undefined) {
      current = number;
      continue;
    }
    if (/exploration|applet|mathlet/i.test(video.title)) continue;
    after.set(current, [...(after.get(current) ?? []), video]);
  }
  const videos: SeedVideo[] = lectures.flatMap((video, index) => [
    lecture(video, index),
    ...(after.get(numberFromTitle(video.title) ?? index + 1) ?? []).map((recitation) =>
      toSeedVideo(recitation, "recitation", `Разбор задач: ${stripCourse(recitation.title)}`),
    ),
  ]);
  return [{ title: "Лекции и разборы задач", videos }];
});

/** Lectures, then the extras of a playlist that are not numbered lectures. */
function numberedWithExtras(
  slug: string,
  playlistId: string,
  extra: { title: string; kind: VideoKind; keep: (video: FetchedVideo) => boolean },
) {
  return course(slug, [playlistId], async (load) => {
    const videos = await load(playlistId);
    const numbered = videos.filter((video) => numberFromTitle(video.title) !== undefined);
    const extras = videos.filter((video) => numberFromTitle(video.title) === undefined);
    const units: SeedUnit[] = [lectureUnit(numbered)];
    const kept = extras.filter(extra.keep);
    if (kept.length > 0)
      units.push({
        title: extra.title,
        videos: kept.map((video) => toSeedVideo(video, extra.kind, lectureTopic(video.title))),
      });
    return units;
  });
}

/** 8.03SC: 23 lectures and the exam review; the "for educators" clips are left out. */
const mit803sc = course("mit-8-03sc", [PL.mit803sc], async (load) => {
  const videos = await load(PL.mit803sc);
  const lectures = videos.filter((video) => numberFromTitle(video.title) !== undefined);
  const review = videos.filter((video) => /exam review/i.test(video.title));
  return [
    lectureUnit(lectures),
    {
      title: "Повторение",
      videos: review.map((video) => toSeedVideo(video, "problem-solving", "Повторение к экзамену")),
    },
  ];
});

/** Control Bootcamp has no numbers: the playlist order is the course order. */
const controlBootcamp = course("uw-control-bootcamp", [PL.controlBootcamp], async (load) => [
  {
    title: "Лекции",
    videos: (await load(PL.controlBootcamp)).map((video, index) => {
      const topic = video.title
        .replace(/\s*\[Control Bootcamp\]\s*/i, "")
        .replace(/^Control Bootcamp:\s*/i, "")
        .trim();
      return toSeedVideo(video, "lecture", `Лекция ${index + 1} — ${topic}`);
    }),
  },
]);

/** Modern Robotics: short videos grouped by the chapters of the book. */
const modernRobotics = course("northwestern-modern-robotics", [PL.modernRobotics], async (load) => {
  const chapters = new Map<string, SeedUnit>();
  const intro: SeedUnit = { title: "Введение", videos: [] };
  for (const video of await load(PL.modernRobotics)) {
    const match = /Chapters?\s+(\d+)[.\d]*(?:\s+and\s+[\d.]+)?:\s*(.*)$/i.exec(video.title);
    if (!match?.[1]) {
      intro.videos.push(
        toSeedVideo(video, "short", video.title.replace(/^Modern Robotics[,:]?\s*/i, "")),
      );
      continue;
    }
    const key = match[1];
    const unit = chapters.get(key) ?? { title: `Глава ${key}`, videos: [] };
    const section = /Chapters?\s+([\d.]+(?:\s+and\s+[\d.]+)?)/i.exec(video.title)?.[1] ?? key;
    unit.videos.push(toSeedVideo(video, "lecture", `${section}. ${match[2] ?? ""}`.trim()));
    chapters.set(key, unit);
  }
  return [intro, ...chapters.values()].filter((unit) => unit.videos.length > 0);
});

/** MIT 6.4210: the 2023 playlist lost its order, so lectures are sorted by number. */
const manipulation = course("mit-6-4210", [PL.manipulation2023], async (load) => [
  lectureUnit(byLectureNumber(await load(PL.manipulation2023))),
]);

const underactuated = course("mit-underactuated", [PL.underactuated2024], async (load) => [
  lectureUnit(byLectureNumber(await load(PL.underactuated2024))),
]);

/** FPCV: one unit per module, short lectures in the order of the course site. */
const fpcv = course(
  "columbia-fpcv",
  FPCV_MODULES.map(([, id]) => id),
  async (load) => {
    const modules = await Promise.all(FPCV_MODULES.map(([, id]) => load(id)));
    return FPCV_MODULES.map(([title], index) => ({
      title,
      videos: (modules[index] ?? []).map((video) => toSeedVideo(video, "lecture", video.title)),
    }));
  },
);

/** 6.S191: the playlist holds every year, newest first; the first block is the newest course. */
const mit6s191 = course("mit-6-s191", [PL.mit6s191], async (load) => {
  const videos = await load(PL.mit6s191);
  const end = videos.findIndex((video) => /\(20\d\d\)/.test(video.title));
  const newest = end > 0 ? videos.slice(0, end) : videos;
  return [
    {
      title: "Лекции",
      videos: newest.map((video, index) => {
        const topic = video.title
          .replace(/^MIT\s+/i, "")
          .replace(/\s*\|\s*6\.S191$/i, "")
          .replace(/^6\.S191:\s*/i, "");
        return toSeedVideo(video, "lecture", `Лекция ${index + 1} — ${topic}`);
      }),
    },
  ];
});

/** CS231n 2025 lectures; the user chose this year although Stanford blocks embedding. */
const cs231n = lecturesOnly("stanford-cs231n", PL.cs231n2025);

/** Geiger: "Lecture 3.2 (Structure-from-Motion: Two-frame …)" → unit 3, video "3.2 Two-frame …". */
const tuebingenCv = course("tuebingen-cv", [PL.tuebingenCv], async (load) => {
  const units = new Map<string, SeedUnit>();
  for (const video of await load(PL.tuebingenCv)) {
    const match = /Lecture\s+(\d+)\.(\d+)\s*\(([^:]+):\s*(.*)\)\s*$/i.exec(video.title);
    const lectureNo = match?.[1] ?? "0";
    const unit = units.get(lectureNo) ?? {
      title: match ? `Лекция ${lectureNo} — ${match[3]?.trim()}` : "Дополнительно",
      videos: [],
    };
    const title = match ? `${lectureNo}.${match[2]} ${match[4]?.trim()}` : video.title;
    unit.videos.push(toSeedVideo(video, "lecture", title));
    units.set(lectureNo, unit);
  }
  return [...units.values()];
});

/** The way into CV for robots: perception lectures of 6.4210 and Robot Learning of CS231n. */
const cvForRobots = course("cv-for-robots", [PL.manipulation2023, PL.cs231n2025], async (load) => {
  const [manipulationVideos, cs231nVideos] = await Promise.all([
    load(PL.manipulation2023),
    load(PL.cs231n2025),
  ]);
  const perception = byLectureNumber(manipulationVideos).filter((video) =>
    [6, 7, 16, 17, 18].includes(numberFromTitle(video.title) ?? 0),
  );
  const robotLearning = cs231nVideos.filter((video) => /robot learning/i.test(video.title));
  return [
    { title: "Восприятие в манипуляции (MIT 6.4210)", videos: perception.map(lecture) },
    { title: "Robot Learning (Stanford CS231n)", videos: robotLearning.map(lecture) },
  ];
});

export const TRACK_2_4_COURSES: ImportedCourseRecipe[] = [
  mit1802,
  mit1803,
  lecturesOnly("yale-phys-201", PL.yalePhys201),
  mit803sc,
  lecturesOnly("mit-6-002", PL.mit6002),
  lecturesOnly("mit-res-6-007", PL.res6007),
  numberedWithExtras("harvard-stat-110", PL.stat110, {
    title: "Дополнительно",
    kind: "short",
    keep: () => true,
  }),
  controlBootcamp,
  lecturesOnly("stanford-cs223a", PL.cs223a),
  modernRobotics,
  manipulation,
  underactuated,
  fpcv,
  mit6s191,
  lecturesOnly("michigan-eecs-498", PL.eecs498),
  cs231n,
  cvForRobots,
  tuebingenCv,
];
