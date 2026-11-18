import type { TodayDto } from "@shared/api";
import { Link } from "react-router";
import { formatPercent } from "@/lib/format";

/** Mini widget "прогресс к CV" (SPEC §6.4): hours to the CV track and each track's share. */
export function CvProgressCard({ cv }: { cv: TodayDto["cv"] }) {
  const hours = Math.round(cv.hoursLeft);
  return (
    <section aria-labelledby="cv-title" className="rounded-2xl border border-line bg-surface p-5">
      <h2 id="cv-title" className="text-xl font-semibold text-ink">
        Путь к Computer Vision
      </h2>
      <p className="mt-2 text-ink-muted">
        {hours > 0 ? (
          <>
            До треков CV осталось ≈ <span className="font-mono text-ink">{hours} ч</span> по
            рекомендованному пути.
          </>
        ) : (
          "Пререквизиты пройдены — треки Computer Vision открыты."
        )}
      </p>
      <ul className="mt-5 space-y-3">
        {cv.tracks.map((track) => (
          <li key={track.slug}>
            <div className="flex justify-between text-sm">
              <span className="text-ink">{track.title}</span>
              <span className="font-mono text-ink-muted">{formatPercent(track.share)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(track.share > 0 ? 2 : 0, track.share * 100)}%`,
                  background: track.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Link
        to="/roadmap"
        className="mt-4 inline-block text-sm text-lilac underline-offset-4 hover:underline"
      >
        Дорожная карта
      </Link>
    </section>
  );
}
