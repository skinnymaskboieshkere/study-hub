declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<typeof YT> | undefined;

/** Loads the official YouTube IFrame Player API once for the whole app (SPEC §9.1). */
export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YouTube IFrame API did not start"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      loading = undefined;
      reject(new Error("YouTube IFrame API failed to load"));
    };
    document.head.append(script);
  });
  return loading;
}

/** Player states from the IFrame API (YT.PlayerState is a const enum we cannot import). */
export const PLAYER_STATE = { ended: 0, playing: 1, paused: 2, buffering: 3, cued: 5 } as const;

/** Undocumented but long-standing captions API of the embedded player. */
interface CaptionsApi {
  loadModule?: (name: string) => void;
  getOption?: (module: string, option: string) => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
}

/**
 * Turns on Russian subtitles (BRIEF): a real Russian track when the video has one,
 * otherwise YouTube's auto-translation of the first track. Fails silently: then the
 * player keeps its own choice and the page shows how to switch it by hand.
 */
export function tryRussianCaptions(player: YT.Player): boolean {
  const captions = player as unknown as CaptionsApi;
  try {
    captions.loadModule?.("captions");
    const tracks = captions.getOption?.("captions", "tracklist") as
      { languageCode?: string }[] | undefined;
    if (!tracks || tracks.length === 0) return false;
    if (tracks.some((track) => track.languageCode === "ru")) {
      captions.setOption?.("captions", "track", { languageCode: "ru" });
    } else {
      captions.setOption?.("captions", "track", {
        languageCode: tracks[0]?.languageCode ?? "en",
        translationLanguage: { languageCode: "ru", languageName: "Russian" },
      });
    }
    return true;
  } catch {
    return false;
  }
}
