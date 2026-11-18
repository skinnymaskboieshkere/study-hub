/**
 * Research helper for building the course catalog (SPEC §9.2).
 *
 *   npm run yt -- channel @mitocw
 *   npm run yt -- playlists <channelId|@handle> [filter]
 *   npm run yt -- playlist <playlistId>
 *   npm run yt -- search "<query>" [--type playlist|video|channel] [--lang ru]   (100 quota units)
 *
 * The API key is read from .env and never printed.
 */
import { config } from "../src/server/config";
import { createYouTubeClient, YouTubeApiError } from "../src/server/youtube/client";

function timecode(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = String(totalSeconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function option(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!config.youtubeApiKey) {
    console.error("YOUTUBE_API_KEY is empty in .env");
    process.exit(1);
  }
  const yt = createYouTubeClient(config.youtubeApiKey);

  switch (command) {
    case "channel": {
      const channel = await yt.getChannel(args[0] ?? "");
      console.log(channel ? JSON.stringify(channel, null, 2) : "channel not found");
      break;
    }
    case "playlists": {
      const ref = args[0] ?? "";
      const channelId = ref.startsWith("@") ? (await yt.getChannel(ref))?.id : ref;
      if (!channelId) throw new Error(`Channel not found: ${ref}`);
      const filter = args[1]?.toLowerCase();
      const playlists = await yt.listChannelPlaylists(channelId);
      for (const p of playlists) {
        if (filter && !p.title.toLowerCase().includes(filter)) continue;
        console.log(`${p.id}\t${String(p.itemCount).padStart(4)}\t${p.title}`);
      }
      console.log(`(${playlists.length} playlists on the channel)`);
      break;
    }
    case "playlist": {
      const playlistId = args[0] ?? "";
      const [info] = await yt.getPlaylists([playlistId]);
      if (info) console.log(`${info.title} — ${info.channelTitle} (${info.itemCount} items)`);
      const entries = await yt.listPlaylistItems(playlistId);
      const details = new Map(
        (await yt.getVideos(entries.filter((e) => e.available).map((e) => e.videoId))).map((v) => [
          v.id,
          v,
        ]),
      );
      let total = 0;
      for (const entry of entries) {
        const video = details.get(entry.videoId);
        if (!video) {
          console.log(
            `${String(entry.position).padStart(3)}  ${entry.videoId}  UNAVAILABLE  ${entry.title}`,
          );
          continue;
        }
        total += video.durationSec;
        const flags = [
          video.embeddable ? "" : "NO-EMBED",
          video.hasCaptions ? "cc" : "",
          video.audioLanguage ?? "",
        ]
          .filter(Boolean)
          .join(",");
        console.log(
          `${String(entry.position).padStart(3)}  ${video.id}  ${timecode(video.durationSec).padStart(8)}  ${flags.padEnd(14)}  ${video.title}`,
        );
      }
      console.log(`total: ${timecode(total)} in ${details.size} available videos`);
      break;
    }
    case "info": {
      // Checks several playlist ids at once for 1 quota unit.
      for (const p of await yt.getPlaylists(args)) {
        console.log(`${p.id}\t${String(p.itemCount).padStart(4)}\t${p.channelTitle}\t${p.title}`);
      }
      break;
    }
    case "video": {
      const [video] = await yt.getVideos([args[0] ?? ""]);
      if (!video) {
        console.log("video not found");
        break;
      }
      console.log(`${video.title}\n${video.channelTitle} · ${timecode(video.durationSec)}`);
      console.log(
        `embeddable: ${video.embeddable}, captions: ${video.hasCaptions}, audio: ${video.audioLanguage ?? "?"}`,
      );
      console.log(`---\n${video.description.slice(0, 700)}`);
      break;
    }
    case "search": {
      const type = (option(args, "--type") ?? "playlist") as "playlist" | "video" | "channel";
      const hits = await yt.search(args[0] ?? "", {
        type,
        language: option(args, "--lang"),
        maxResults: 15,
      });
      for (const hit of hits) console.log(`${hit.id}\t${hit.channelTitle}\t${hit.title}`);
      break;
    }
    default:
      console.log(
        "Commands: channel, playlists, playlist, search (see the header of scripts/youtube.ts)",
      );
  }
}

main().catch((error: unknown) => {
  if (error instanceof YouTubeApiError)
    console.error(`${error.message} [${error.reason ?? error.status}]`);
  else console.error(error);
  process.exit(1);
});
