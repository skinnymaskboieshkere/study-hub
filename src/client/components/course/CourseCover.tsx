import { cn } from "cn";
import { useState, type ReactNode } from "react";
import { getTrack, type TrackSlug } from "@/app/tracks";
import { youtubeThumbnailUrl, type ThumbnailQuality } from "@/lib/youtube";

interface CourseCoverProps {
  /** Lecture video used as the cover. Without it a track-colored cover is drawn. */
  videoId?: string | null;
  /** Short label printed on a drawn cover, e.g. "18.06". */
  label: string;
  track: TrackSlug;
  quality?: ThumbnailQuality;
  className?: string;
  /** Overlays drawn on top of the picture. */
  children?: ReactNode;
}

/** Cover of a course: the YouTube thumbnail of a lecture (BRIEF) or a drawn fallback. */
export function CourseCover({
  videoId,
  label,
  track,
  quality = "hqdefault",
  className,
  children,
}: CourseCoverProps) {
  const [currentQuality, setCurrentQuality] = useState(quality);
  const [failed, setFailed] = useState(false);

  function handleError() {
    // maxresdefault does not exist for every video: retry with hqdefault, which always exists.
    if (currentQuality !== "hqdefault") setCurrentQuality("hqdefault");
    else setFailed(true);
  }

  return (
    <div className={cn("relative isolate overflow-hidden bg-surface-2", className)}>
      {videoId && !failed ? (
        <img
          src={youtubeThumbnailUrl(videoId, currentQuality)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={handleError}
          // A missing maxresdefault comes back as a 120×90 gray placeholder (with HTTP 404),
          // which the browser shows without an error: treat it as missing too.
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth <= 120) handleError();
          }}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 grid place-items-center"
          style={{
            background: `radial-gradient(70% 90% at 80% 10%, color-mix(in oklab, ${getTrack(track).color} 38%, transparent), transparent 70%), linear-gradient(135deg, #1a1428, #0e0a16)`,
          }}
        >
          <span className="font-display text-3xl font-bold text-ink/20">{label}</span>
        </div>
      )}
      {children}
    </div>
  );
}
