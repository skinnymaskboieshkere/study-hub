import { memo, useEffect, useRef } from "react";
import { loadYouTubeIframeApi } from "@/lib/youtube-iframe";

export interface YouTubePlayerEvents {
  onReady: (player: YT.Player) => void;
  onStateChange: (state: number, player: YT.Player) => void;
  onError: (code: number) => void;
  onApiChange?: (player: YT.Player) => void;
}

interface YouTubePlayerProps extends YouTubePlayerEvents {
  videoId: string;
  startSeconds: number;
  /** Russian subtitles by default (BRIEF); off for videos that are already in Russian. */
  captions: boolean;
  /** Privacy-enhanced mode (youtube-nocookie.com), a setting in SPEC §6.2. */
  noCookie?: boolean;
}

/**
 * The official YouTube IFrame player (SPEC §2: no downloading, branding stays).
 * Re-created only when the video changes; callbacks are read through refs.
 */
export const YouTubePlayer = memo(function YouTubePlayer(props: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const events = useRef<YouTubePlayerEvents>(props);
  const startRef = useRef(props.startSeconds);

  useEffect(() => {
    events.current = props;
  });

  useEffect(() => {
    let player: YT.Player | undefined;
    let cancelled = false;

    loadYouTubeIframeApi()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        const target = document.createElement("div");
        hostRef.current.replaceChildren(target);
        player = new api.Player(target, {
          host: props.noCookie ? "https://www.youtube-nocookie.com" : "https://www.youtube.com",
          videoId: props.videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start: Math.floor(startRef.current),
            autoplay: 1,
            rel: 0,
            playsinline: 1,
            cc_load_policy: props.captions ? 1 : 0,
            cc_lang_pref: "ru",
            hl: "ru",
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => events.current.onReady(event.target),
            onStateChange: (event) => events.current.onStateChange(event.data, event.target),
            onError: (event) => events.current.onError(event.data),
            onApiChange: (event) => events.current.onApiChange?.(event.target),
          },
        });
      })
      .catch(() => {
        if (!cancelled) events.current.onError(-1);
      });

    return () => {
      cancelled = true;
      player?.destroy();
    };
    // startSeconds is read once: seeking later must not rebuild the player.
  }, [props.videoId, props.noCookie, props.captions]);

  return <div ref={hostRef} className="size-full [&>iframe]:size-full" />;
});
