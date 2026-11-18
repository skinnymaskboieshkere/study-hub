export type TrackSlug = "foundation" | "engineering" | "robotics" | "cv";

export interface TrackInfo {
  slug: TrackSlug;
  title: string;
  /** Track color as a CSS value; the same color on every screen (SPEC §7). */
  color: string;
  /** Tailwind background class with the track color. */
  dotClass: string;
}

/** The four tracks of the path (SPEC §4). Seeded into the database in stage 1b. */
export const TRACKS: TrackInfo[] = [
  {
    slug: "foundation",
    title: "Фундамент",
    color: "var(--color-track-foundation)",
    dotClass: "bg-track-foundation",
  },
  {
    slug: "engineering",
    title: "Инженерная база",
    color: "var(--color-track-engineering)",
    dotClass: "bg-track-engineering",
  },
  {
    slug: "robotics",
    title: "Робототехника",
    color: "var(--color-track-robotics)",
    dotClass: "bg-track-robotics",
  },
  { slug: "cv", title: "Computer Vision", color: "var(--color-track-cv)", dotClass: "bg-track-cv" },
];

export function getTrack(slug: TrackSlug): TrackInfo {
  const track = TRACKS.find((item) => item.slug === slug);
  if (!track) throw new Error(`Unknown track: ${slug}`);
  return track;
}
