import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { TweetSyndicationGateway } from "../infrastructure/tweet-syndication.gateway";
import { TweetEmbedService } from "./tweet-embed.service";
import hereticsReply from "./__fixtures__/tweet-2116198150683734246.json";

describe(TweetEmbedService, () => {
  const fetchMock = vi.fn<typeof fetch>();
  let service: TweetEmbedService;

  beforeEach(() => {
    service = new TweetEmbedService(new TweetSyndicationGateway());
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects URLs that are not X status posts", async () => {
    await expect(service.embed("https://x.com/RL_Comm")).rejects.toBeInstanceOf(InvalidInputError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  const tweet = {
    __typename: "Tweet",
    id_str: "2095971934320071030",
    text: "This marks the end of my playing career. https://t.co/photo",
    display_text_range: [0, 59],
    created_at: "2026-09-04T20:27:05.000Z",
    user: {
      name: "Comm",
      screen_name: "RL_Comm",
      profile_image_url_https: "https://pbs.twimg.com/profile_images/comm.jpg",
    },
    mediaDetails: [
      {
        type: "photo",
        media_url_https: "https://pbs.twimg.com/media/retirement.jpg",
        original_info: { width: 1200, height: 800 },
        ext_alt_text: "Retirement announcement",
        url: "https://t.co/photo",
      },
    ],
  };

  it("returns the tweet's photos, author and date, removes attachment URLs and caches the result", async () => {
    fetchMock.mockImplementation(async () => Response.json(tweet));

    const url = "https://x.com/RL_Comm/status/2095971934320071030";
    const first = await service.embed(url);
    const second = await service.embed(url);

    expect(first.authorHandle).toBe("RL_Comm");
    expect(first.text).toBe("This marks the end of my playing career.");
    expect(first.authorImageUrl).toBe(tweet.user.profile_image_url_https);
    expect(first.postedAt).toBe(tweet.created_at);
    expect(first.media).toEqual([
      {
        type: "photo",
        url: tweet.mediaDetails[0]?.media_url_https,
        width: 1200,
        height: 800,
        alt: "Retirement announcement",
      },
    ]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns text-only posts without inventing media", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...tweet,
        text: "A &amp; B 😀",
        display_text_range: [0, 12],
        mediaDetails: undefined,
      }),
    );
    const embed = await service.embed("https://x.com/RL_Comm/status/2095971934320071030");
    expect(embed.text).toBe("A & B 😀");
    expect(embed.media).toEqual([]);
  });

  it("keeps every photo and video preview with its dimensions", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...tweet,
        mediaDetails: [
          ...tweet.mediaDetails,
          {
            ...tweet.mediaDetails[0],
            type: "video",
            media_url_https: "https://pbs.twimg.com/media/video.jpg",
            ext_alt_text: undefined,
          },
        ],
      }),
    );
    const embed = await service.embed("https://x.com/i/web/status/2095971934320071030");
    expect(embed.url).toBe("https://x.com/RL_Comm/status/2095971934320071030");
    expect(embed.media).toHaveLength(2);
    expect(embed.media[1]).toEqual({
      type: "video",
      url: "https://pbs.twimg.com/media/video.jpg",
      width: 1200,
      height: 800,
      alt: "",
    });
  });

  it("applies the display range to text containing emoji without exposing a partial attachment URL", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...tweet,
        text: "😀😀 Update https://t.co/photo",
        display_text_range: [0, 11],
      }),
    );
    const embed = await service.embed("https://x.com/RL_Comm/status/2095971934320071030");
    expect(embed.text).toBe("😀😀 Update");
  });

  it("loads a reply whose author has X's default avatar and whose parent has a video", async () => {
    fetchMock.mockImplementation(async () => Response.json(hereticsReply));

    const embed = await service.embed("https://x.com/HereticsRL/status/2116198150683734246");

    expect(embed).toMatchObject({
      id: "2116198150683734246",
      authorHandle: "HereticsRL",
      authorImageUrl: null,
      media: [],
    });
    expect(embed.text).toMatch(/^Give a warm welcome to the boys!/);
  });

  it.each([{}, { __typename: "TweetTombstone" }])(
    "handles unavailable posts (%j)",
    async (payload) => {
      fetchMock.mockImplementation(async () => Response.json(payload));
      await expect(
        service.embed("https://x.com/RL_Comm/status/2095971934320071030"),
      ).rejects.toBeInstanceOf(NotFoundError);
    },
  );

  it.each([
    {
      ...tweet,
      mediaDetails: [{ ...tweet.mediaDetails[0], original_info: { width: 0, height: 800 } }],
    },
    { ...tweet, id_str: "123" },
  ])("rejects invalid upstream data", async (payload) => {
    fetchMock.mockImplementation(async () => Response.json(payload));
    await expect(
      service.embed("https://x.com/RL_Comm/status/2095971934320071030"),
    ).rejects.toBeInstanceOf(IntegrationError);
  });

  it("surfaces a service error when X syndication is down", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    await expect(
      service.embed("https://x.com/RL_Comm/status/2095971934320071030"),
    ).rejects.toBeInstanceOf(IntegrationError);
  });
});
