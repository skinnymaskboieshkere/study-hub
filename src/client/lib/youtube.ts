/** Thumbnail sizes YouTube serves for every public video (maxresdefault may be missing). */
export type ThumbnailQuality = "maxresdefault" | "sddefault" | "hqdefault" | "mqdefault";

export function youtubeThumbnailUrl(videoId: string, quality: ThumbnailQuality = "hqdefault") {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
}

/** Link to the video on youtube.com; works in Obsidian too (SPEC §6.6). */
export function youtubeWatchUrl(videoId: string, startSeconds?: number) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (startSeconds && startSeconds > 0) url.searchParams.set("t", `${Math.floor(startSeconds)}s`);
  return url.toString();
}
