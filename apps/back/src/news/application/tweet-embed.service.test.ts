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
    created_at: "2026-09-04T20:27:05.000Z",
    display_text_range: [0, 59],
    id_str: "2095971934320071030",
    mediaDetails: [
      {
        ext_alt_text: "Retirement announcement",
        media_url_https: "https://pbs.twimg.com/media/retirement.jpg",
        original_info: { height: 800, width: 1200 },
        type: "photo",
        url: "https://t.co/photo",
      },
    ],
    text: "This marks the end of my playing career. https://t.co/photo",
    user: {
      name: "Comm",
      profile_image_url_https: "https://pbs.twimg.com/profile_images/comm.jpg",
      screen_name: "RL_Comm",
    },
  };

  const url = "https://x.com/RL_Comm/status/2095971934320071030";

  it("returns the tweet's author, text and date", async () => {
    fetchMock.mockImplementation(async () => Response.json(tweet));

    const embedded = await service.embed(url);

    expect(embedded.authorHandle).toBe("RL_Comm");
    expect(embedded.text).toBe("This marks the end of my playing career.");
    expect(embedded.authorImageUrl).toBe(tweet.user.profile_image_url_https);
    expect(embedded.postedAt).toBe(tweet.created_at);
  });

  it("returns the tweet's photos", async () => {
    fetchMock.mockImplementation(async () => Response.json(tweet));

    const embedded = await service.embed(url);

    expect(embedded.media).toStrictEqual([
      {
        alt: "Retirement announcement",
        height: 800,
        type: "photo",
        url: tweet.mediaDetails[0]?.media_url_https,
        width: 1200,
      },
    ]);
  });

  it("caches the result", async () => {
    fetchMock.mockImplementation(async () => Response.json(tweet));

    const first = await service.embed(url);
    const second = await service.embed(url);

    expect(second).toStrictEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns text-only posts without inventing media", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...tweet,
        display_text_range: [0, 12],
        mediaDetails: undefined,
        text: "A &amp; B 😀",
      }),
    );
    const embed = await service.embed("https://x.com/RL_Comm/status/2095971934320071030");
    expect(embed.text).toBe("A & B 😀");
    expect(embed.media).toStrictEqual([]);
  });

  it("keeps every photo and video preview with its dimensions", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...tweet,
        mediaDetails: [
          ...tweet.mediaDetails,
          {
            ...tweet.mediaDetails[0],
            ext_alt_text: undefined,
            media_url_https: "https://pbs.twimg.com/media/video.jpg",
            type: "video",
          },
        ],
      }),
    );
    const embed = await service.embed("https://x.com/i/web/status/2095971934320071030");
    expect(embed.url).toBe("https://x.com/RL_Comm/status/2095971934320071030");
    expect(embed.media).toHaveLength(2);
    expect(embed.media[1]).toStrictEqual({
      alt: "",
      height: 800,
      type: "video",
      url: "https://pbs.twimg.com/media/video.jpg",
      width: 1200,
    });
  });

  it("applies the display range to text containing emoji without exposing a partial attachment URL", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        ...tweet,
        display_text_range: [0, 11],
        text: "😀😀 Update https://t.co/photo",
      }),
    );
    const embed = await service.embed("https://x.com/RL_Comm/status/2095971934320071030");
    expect(embed.text).toBe("😀😀 Update");
  });

  it("loads a reply whose author has X's default avatar and whose parent has a video", async () => {
    fetchMock.mockImplementation(async () => Response.json(hereticsReply));

    const embed = await service.embed("https://x.com/HereticsRL/status/2116198150683734246");

    expect(embed).toMatchObject({
      authorHandle: "HereticsRL",
      authorImageUrl: null,
      id: "2116198150683734246",
      media: [],
    });
    expect(embed.text).toMatch(/^Give a warm welcome to the boys!/u);
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
      mediaDetails: [{ ...tweet.mediaDetails[0], original_info: { height: 800, width: 0 } }],
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
