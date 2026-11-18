import { describe, expect, it, vi } from "vitest";
import { createYouTubeClient, YouTubeApiError } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createYouTubeClient", () => {
  it("follows playlist pages and marks deleted videos as unavailable", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          nextPageToken: "page2",
          items: [
            {
              snippet: {
                title: "Lecture 1",
                position: 0,
                resourceId: { videoId: "aaaaaaaaaaa" },
                videoOwnerChannelId: "UC1",
              },
              status: { privacyStatus: "public" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              snippet: {
                title: "Deleted video",
                position: 1,
                resourceId: { videoId: "bbbbbbbbbbb" },
              },
              status: { privacyStatus: "privacyStatusUnspecified" },
            },
          ],
        }),
      );

    const client = createYouTubeClient("secret-key", fetchMock);
    const entries = await client.listPlaylistItems("PL123");

    expect(entries).toEqual([
      { videoId: "aaaaaaaaaaa", title: "Lecture 1", position: 0, available: true },
      { videoId: "bbbbbbbbbbb", title: "Deleted video", position: 1, available: false },
    ]);
    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(secondUrl.searchParams.get("pageToken")).toBe("page2");
  });

  it("converts durations and reads the embeddable flag", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "aaaaaaaaaaa",
            snippet: { title: "Lecture 1", channelId: "UC1", channelTitle: "MIT OpenCourseWare" },
            contentDetails: { duration: "PT49M12S", caption: "true" },
            status: { privacyStatus: "public", embeddable: false },
          },
        ],
      }),
    );

    const [video] = await createYouTubeClient("k", fetchMock).getVideos(["aaaaaaaaaaa"]);

    expect(video).toMatchObject({ durationSec: 2952, embeddable: false, hasCaptions: true });
  });

  it("reports API errors without leaking the key", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { message: "Quota exceeded", errors: [{ reason: "quotaExceeded" }] } },
          403,
        ),
      );

    const error = await createYouTubeClient("secret-key", fetchMock)
      .getVideos(["aaaaaaaaaaa"])
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(YouTubeApiError);
    expect(error).toMatchObject({ status: 403, reason: "quotaExceeded" });
    expect(String((error as Error).message)).not.toContain("secret-key");
  });
});
