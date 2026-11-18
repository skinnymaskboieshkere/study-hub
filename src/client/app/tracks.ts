export interface TrackInfo {
  slug: "foundation" | "engineering" | "robotics" | "cv";
  title: string;
  /** Tailwind class with the track color (the same color on every screen). */
  dotClass: string;
}

/** The four tracks of the path (SPEC §4). Seeded into the database in stage 1. */
export const TRACKS: TrackInfo[] = [
  { slug: "foundation", title: "Фундамент", dotClass: "bg-track-foundation" },
  { slug: "engineering", title: "Инженерная база", dotClass: "bg-track-engineering" },
  { slug: "robotics", title: "Робототехника", dotClass: "bg-track-robotics" },
  { slug: "cv", title: "Computer Vision", dotClass: "bg-track-cv" },
];
