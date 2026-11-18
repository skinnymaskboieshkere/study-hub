import { z } from "zod";
import { iso8601ToSeconds } from "./duration";

const API_BASE = "https://www.googleapis.com/youtube/v3";

export class YouTubeApiError extends Error {
  readonly status: number;
  readonly reason?: string;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.reason = reason;
  }
}

export interface PlaylistEntry {
  videoId: string;
  title: string;
  position: number;
  /** False for deleted or private videos. */
  available: boolean;
}

export interface VideoDetails {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  durationSec: number;
  /** False means the author forbids playing it outside YouTube (player errors 101/150). */
  embeddable: boolean;
  privacy: string;
  hasCaptions: boolean;
  audioLanguage?: string;
  /** Used to check that a translation credits the original course. */
  description: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  channelTitle: string;
  itemCount: number;
}

export interface ChannelInfo {
  id: string;
  title: string;
  uploadsPlaylistId?: string;
}

export interface SearchHit {
  kind: "video" | "playlist" | "channel";
  id: string;
  title: string;
  channelTitle: string;
}

const ErrorBodySchema = z.object({
  error: z.object({
    message: z.string(),
    errors: z.array(z.object({ reason: z.string() })).optional(),
  }),
});

const PageSchema = z.object({
  nextPageToken: z.string().optional(),
  items: z.array(z.unknown()).default([]),
});

const PlaylistItemSchema = z.object({
  snippet: z.object({
    title: z.string(),
    position: z.number(),
    resourceId: z.object({ videoId: z.string() }),
    videoOwnerChannelId: z.string().optional(),
  }),
  status: z.object({ privacyStatus: z.string() }).optional(),
});

const VideoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string().default(""),
    channelId: z.string(),
    channelTitle: z.string(),
    defaultAudioLanguage: z.string().optional(),
  }),
  contentDetails: z.object({ duration: z.string(), caption: z.string().optional() }),
  status: z.object({ privacyStatus: z.string(), embeddable: z.boolean().optional() }),
});

const PlaylistSchema = z.object({
  id: z.string(),
  snippet: z.object({ title: z.string(), channelTitle: z.string() }),
  contentDetails: z.object({ itemCount: z.number() }),
});

const ChannelSchema = z.object({
  id: z.string(),
  snippet: z.object({ title: z.string() }),
  contentDetails: z
    .object({ relatedPlaylists: z.object({ uploads: z.string().optional() }) })
    .optional(),
});

const SearchItemSchema = z.object({
  id: z.object({
    kind: z.string(),
    videoId: z.string().optional(),
    playlistId: z.string().optional(),
    channelId: z.string().optional(),
  }),
  snippet: z.object({ title: z.string(), channelTitle: z.string() }),
});

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Minimal YouTube Data API v3 client. Quota per call: list = 1 unit, search = 100 units
 * (SPEC §9.2: the importer never uses search). The API key never appears in errors or logs.
 */
export function createYouTubeClient(apiKey: string, fetchImpl: typeof fetch = fetch) {
  async function get(resource: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`${API_BASE}/${resource}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    url.searchParams.set("key", apiKey);

    const response = await fetchImpl(url);
    const body: unknown = await response.json();
    if (!response.ok) {
      const parsed = ErrorBodySchema.safeParse(body);
      const reason = parsed.success ? parsed.data.error.errors?.[0]?.reason : undefined;
      const message = parsed.success ? parsed.data.error.message : `HTTP ${response.status}`;
      throw new YouTubeApiError(`YouTube API ${resource}: ${message}`, response.status, reason);
    }
    return body;
  }

  async function getAllPages(resource: string, params: Record<string, string>) {
    const items: unknown[] = [];
    let pageToken: string | undefined;
    do {
      const page = PageSchema.parse(
        await get(resource, { ...params, maxResults: "50", ...(pageToken ? { pageToken } : {}) }),
      );
      items.push(...page.items);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return items;
  }

  return {
    async listPlaylistItems(playlistId: string): Promise<PlaylistEntry[]> {
      const items = await getAllPages("playlistItems", { part: "snippet,status", playlistId });
      return items.map((raw) => {
        const item = PlaylistItemSchema.parse(raw);
        const privacy = item.status?.privacyStatus ?? "public";
        return {
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          position: item.snippet.position,
          // Deleted and private videos have no owner channel.
          available: privacy !== "private" && item.snippet.videoOwnerChannelId !== undefined,
        };
      });
    },

    async getVideos(ids: string[]): Promise<VideoDetails[]> {
      const result: VideoDetails[] = [];
      for (const group of chunk([...new Set(ids)], 50)) {
        const page = PageSchema.parse(
          await get("videos", { part: "snippet,contentDetails,status", id: group.join(",") }),
        );
        for (const raw of page.items) {
          const video = VideoSchema.parse(raw);
          result.push({
            id: video.id,
            title: video.snippet.title,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            durationSec: iso8601ToSeconds(video.contentDetails.duration) ?? 0,
            embeddable: video.status.embeddable ?? true,
            privacy: video.status.privacyStatus,
            hasCaptions: video.contentDetails.caption === "true",
            audioLanguage: video.snippet.defaultAudioLanguage,
            description: video.snippet.description,
          });
        }
      }
      return result;
    },

    async getPlaylists(ids: string[]): Promise<PlaylistInfo[]> {
      const page = PageSchema.parse(
        await get("playlists", { part: "snippet,contentDetails", id: ids.join(",") }),
      );
      return page.items.map((raw) => toPlaylistInfo(PlaylistSchema.parse(raw)));
    },

    async listChannelPlaylists(channelId: string): Promise<PlaylistInfo[]> {
      const items = await getAllPages("playlists", { part: "snippet,contentDetails", channelId });
      return items.map((raw) => toPlaylistInfo(PlaylistSchema.parse(raw)));
    },

    /** Accepts a channel id ("UC…") or a handle ("@mitocw"). */
    async getChannel(idOrHandle: string): Promise<ChannelInfo | undefined> {
      const byHandle = idOrHandle.startsWith("@");
      const page = PageSchema.parse(
        await get("channels", {
          part: "snippet,contentDetails",
          ...(byHandle ? { forHandle: idOrHandle } : { id: idOrHandle }),
        }),
      );
      const first = page.items[0];
      if (!first) return undefined;
      const channel = ChannelSchema.parse(first);
      return {
        id: channel.id,
        title: channel.snippet.title,
        uploadsPlaylistId: channel.contentDetails?.relatedPlaylists.uploads,
      };
    },

    /** Costs 100 quota units: for research only, never in the importer. */
    async search(
      query: string,
      options: { type?: SearchHit["kind"]; language?: string; maxResults?: number } = {},
    ): Promise<SearchHit[]> {
      const page = PageSchema.parse(
        await get("search", {
          part: "snippet",
          q: query,
          type: options.type ?? "playlist",
          maxResults: String(options.maxResults ?? 10),
          ...(options.language ? { relevanceLanguage: options.language } : {}),
        }),
      );
      return page.items.map((raw) => {
        const item = SearchItemSchema.parse(raw);
        const kind = item.id.kind.replace("youtube#", "") as SearchHit["kind"];
        return {
          kind,
          id: item.id.videoId ?? item.id.playlistId ?? item.id.channelId ?? "",
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
        };
      });
    },
  };
}

function toPlaylistInfo(playlist: z.infer<typeof PlaylistSchema>): PlaylistInfo {
  return {
    id: playlist.id,
    title: playlist.snippet.title,
    channelTitle: playlist.snippet.channelTitle,
    itemCount: playlist.contentDetails.itemCount,
  };
}

export type YouTubeClient = ReturnType<typeof createYouTubeClient>;
