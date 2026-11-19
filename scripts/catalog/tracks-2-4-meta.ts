import type { CourseMeta } from "./types";

const OCW_LICENSE = "CC BY-NC-SA 4.0";
const SEE_SITE = "См. условия на сайте курса";

/**
 * Tracks 2–4 (SPEC §4): course descriptions. Their playlists and how the videos are laid out
 * live in tracks-2-4.ts (imported in stage 7b, playlists checked on 19.11.2026).
 */
export const TRACK_2_4_META: { meta: CourseMeta }[] = [
  // Track 2 — engineering basics
  {
    meta: {
      slug: "mit-18-02",
      title: "18.02 Multivariable Calculus",
      shortTitle: "18.02",
      university: "MIT",
      instructors: ["Denis Auroux"],
      subject: "math",
      level: 2,
      description:
        "Матанализ нескольких переменных: векторы, частные производные, кратные интегралы, векторный анализ.",
      sourceUrl: "https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/",
      license: OCW_LICENSE,
      materials: [],
      skills: ["multivariable-calculus"],
    },
  },
  {
    meta: {
      slug: "mit-18-03",
      title: "18.03 Differential Equations",
      shortTitle: "18.03",
      university: "MIT",
      instructors: ["Arthur Mattuck"],
      subject: "math",
      level: 2,
      description:
        "Дифференциальные уравнения: первого и второго порядка, преобразование Лапласа, системы, ряды Фурье.",
      sourceUrl: "https://ocw.mit.edu/courses/18-03-differential-equations-spring-2006/",
      license: OCW_LICENSE,
      materials: [],
      skills: ["differential-equations"],
    },
  },
  {
    meta: {
      slug: "yale-phys-201",
      title: "PHYS 201: Fundamentals of Physics II",
      shortTitle: "PHYS 201",
      university: "Yale",
      instructors: ["Ramamurti Shankar"],
      subject: "physics",
      level: 2,
      description:
        "Основы физики II: электростатика, цепи, магнетизм, электромагнитные волны, оптика и введение в квантовую механику.",
      sourceUrl: "https://oyc.yale.edu/physics/phys-201",
      license: "CC BY-NC-SA 3.0",
      materials: [],
      skills: ["electromagnetism", "optics"],
    },
  },
  {
    meta: {
      slug: "mit-8-03sc",
      title: "8.03SC Physics III: Vibrations and Waves",
      shortTitle: "8.03SC",
      university: "MIT",
      instructors: ["Yen-Jie Lee"],
      subject: "physics",
      level: 2,
      description: "Колебания и волны: осцилляторы, резонанс, волны, интерференция и дифракция.",
      sourceUrl: "https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/",
      license: OCW_LICENSE,
      materials: [],
      skills: ["oscillations", "waves"],
    },
  },
  {
    meta: {
      slug: "mit-6-002",
      title: "6.002 Circuits and Electronics",
      shortTitle: "6.002",
      university: "MIT",
      instructors: ["Anant Agarwal"],
      subject: "engineering",
      level: 2,
      description:
        "Цепи и электроника: законы Кирхгофа, транзисторы, усилители, переходные процессы — база для автоматики.",
      sourceUrl: "https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/",
      license: OCW_LICENSE,
      materials: [],
      skills: ["circuits", "electronics"],
    },
  },
  {
    meta: {
      slug: "mit-res-6-007",
      title: "RES.6-007 Signals and Systems",
      shortTitle: "6.007",
      university: "MIT",
      instructors: ["Alan V. Oppenheim"],
      subject: "engineering",
      level: 2,
      description:
        "Сигналы и системы (запись 1987 года): свёртка, преобразования Фурье и Лапласа, фильтры, дискретизация. Нужно для обработки изображений и управления.",
      sourceUrl: "https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/",
      license: OCW_LICENSE,
      materials: [],
      skills: ["signals", "fourier"],
    },
  },
  {
    meta: {
      slug: "harvard-stat-110",
      title: "Stat 110: Probability",
      shortTitle: "Stat 110",
      university: "Harvard",
      instructors: ["Joe Blitzstein"],
      subject: "math",
      level: 2,
      description:
        "Вероятность: случайные величины, распределения, условная вероятность, предельные теоремы. Нужна для ML и CV.",
      sourceUrl: "https://stat110.net/",
      license: SEE_SITE,
      materials: [],
      skills: ["probability"],
    },
  },
  {
    meta: {
      slug: "uw-control-bootcamp",
      title: "Control Bootcamp",
      shortTitle: "Control",
      university: "U. of Washington",
      instructors: ["Steve Brunton"],
      subject: "engineering",
      level: 2,
      description:
        "Теория управления: устойчивость, управляемость, LQR, фильтр Калмана. Сильный курс, хотя University of Washington — не Ivy-вуз.",
      sourceUrl: "https://www.youtube.com/playlist?list=PLMrJAkhIeNNR20Mz-VpzgfQs5zrYi085m",
      license: "Стандартная лицензия YouTube (канал автора)",
      materials: [],
      skills: ["control", "lqr", "kalman-filter"],
    },
  },
  // Track 3 — robotics
  {
    meta: {
      slug: "stanford-cs223a",
      title: "CS223A: Introduction to Robotics",
      shortTitle: "CS223A",
      university: "Stanford",
      instructors: ["Oussama Khatib"],
      subject: "robotics",
      level: 3,
      description:
        "Введение в робототехнику: кинематика, якобиан, динамика и управление манипуляторами.",
      sourceUrl: "https://see.stanford.edu/Course/CS223A",
      license: SEE_SITE,
      materials: [],
      skills: ["kinematics", "dynamics", "control"],
    },
  },
  {
    meta: {
      slug: "northwestern-modern-robotics",
      title: "Modern Robotics",
      shortTitle: "Modern Robotics",
      university: "Northwestern",
      instructors: ["Kevin Lynch"],
      subject: "robotics",
      level: 3,
      description:
        "Короткие видео к бесплатной книге: конфигурационное пространство, кинематика, динамика, планирование движения и управление.",
      sourceUrl: "https://modernrobotics.northwestern.edu/",
      license: SEE_SITE,
      materials: [],
      skills: ["kinematics", "motion-planning"],
    },
  },
  {
    meta: {
      slug: "mit-6-4210",
      title: "6.4210 Robotic Manipulation",
      shortTitle: "6.4210",
      university: "MIT",
      instructors: ["Russ Tedrake"],
      subject: "robotics",
      level: 3,
      description:
        "Восприятие, планирование и управление роботами-манипуляторами; открытые интерактивные конспекты. Лекции осени 2023 года с канала курса.",
      sourceUrl: "https://manipulation.mit.edu/",
      license: SEE_SITE,
      materials: [],
      skills: ["manipulation", "perception"],
    },
  },
  {
    meta: {
      slug: "mit-underactuated",
      title: "Underactuated Robotics",
      shortTitle: "Underactuated",
      university: "MIT",
      instructors: ["Russ Tedrake"],
      subject: "robotics",
      level: 4,
      description:
        "Продвинутое управление ходьбой, полётом и балансом: динамическое программирование, LQR, оптимизация траекторий. Весна 2024, курс на потом.",
      sourceUrl: "https://underactuated.mit.edu/",
      license: SEE_SITE,
      materials: [],
      skills: ["control", "optimization"],
    },
  },
  // Track 4 — Computer Vision
  {
    meta: {
      slug: "columbia-fpcv",
      title: "First Principles of Computer Vision",
      shortTitle: "FPCV",
      university: "Columbia",
      instructors: ["Shree Nayar"],
      subject: "cv",
      level: 2,
      description:
        "Классическое зрение с нуля короткими лекциями: формирование изображения, фильтрация, признаки, 3D-реконструкция, трекинг. Модули — как на сайте курса.",
      sourceUrl: "https://fpcv.cs.columbia.edu/",
      license: SEE_SITE,
      materials: [],
      skills: ["image-formation", "features", "3d-vision"],
    },
  },
  {
    meta: {
      slug: "mit-6-s191",
      title: "6.S191 Introduction to Deep Learning",
      shortTitle: "6.S191",
      university: "MIT",
      instructors: ["Alexander Amini", "Ava Amini"],
      subject: "cv",
      level: 3,
      description:
        "Короткий интенсив по deep learning: нейросети, CNN, трансформеры, генеративные модели, RL. Последний выпуск курса.",
      sourceUrl: "https://introtodeeplearning.com/",
      license: SEE_SITE,
      materials: [],
      skills: ["deep-learning"],
    },
  },
  {
    meta: {
      slug: "michigan-eecs-498",
      title: "EECS 498-007: Deep Learning for Computer Vision",
      shortTitle: "EECS 498",
      university: "Michigan",
      instructors: ["Justin Johnson"],
      subject: "cv",
      level: 3,
      description:
        "Deep learning для зрения (2019): от линейных классификаторов до детекции, сегментации и 3D-зрения.",
      sourceUrl: "https://web.eecs.umich.edu/~justincj/teaching/eecs498/FA2019/",
      license: SEE_SITE,
      materials: [],
      skills: ["cnn", "detection", "segmentation"],
    },
  },
  {
    meta: {
      slug: "stanford-cs231n",
      title: "CS231n: Deep Learning for Computer Vision",
      shortTitle: "CS231n",
      university: "Stanford",
      instructors: ["Fei-Fei Li"],
      subject: "cv",
      level: 3,
      description:
        "Курс 2025 года: CNN, трансформеры, детекция, генеративные модели, 3D-зрение и Robot Learning. Stanford запретил встраивать эти видео: они открываются на YouTube, а просмотренное отмечается кнопкой «Просмотрено».",
      sourceUrl: "https://cs231n.stanford.edu/",
      license: SEE_SITE,
      materials: [],
      skills: ["cnn", "transformers", "3d-vision"],
    },
  },
  {
    meta: {
      slug: "cv-for-robots",
      title: "Зрение для роботов",
      shortTitle: "CV + роботы",
      university: "MIT · Stanford",
      instructors: ["Russ Tedrake"],
      subject: "cv",
      level: 4,
      description:
        "Финал пути: лекции о геометрическом и глубоком восприятии из MIT 6.4210 и лекция Robot Learning из CS231n (она открывается на YouTube).",
      sourceUrl: "https://manipulation.mit.edu/",
      license: SEE_SITE,
      materials: [],
      skills: ["perception", "robot-learning"],
    },
  },
  {
    meta: {
      slug: "tuebingen-cv",
      title: "Computer Vision (University of Tübingen)",
      shortTitle: "CV Tübingen",
      university: "University of Tübingen",
      instructors: ["Andreas Geiger"],
      subject: "cv",
      level: 3,
      description:
        "3D-зрение: геометрия камер, структура из движения, стерео, оптический поток, 3D-реконструкция, а также распознавание и самообучение. Курс 2025 года на официальном канале Tübingen Machine Learning.",
      sourceUrl:
        "https://uni-tuebingen.de/fakultaeten/mathematisch-naturwissenschaftliche-fakultaet/fachbereiche/informatik/lehrstuehle/autonomous-vision/lectures/computer-vision/",
      license: SEE_SITE,
      materials: [],
      skills: ["3d-vision", "structure-from-motion", "stereo", "optical-flow"],
    },
  },
];
