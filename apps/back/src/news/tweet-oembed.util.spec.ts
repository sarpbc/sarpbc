import { parseTweetUrl } from "@sarpbc/utils";
import { handleFromAuthorUrl, htmlToPlainText, tweetEmbedFromOEmbed } from "./tweet-oembed.util";

describe("tweet-oembed.util", () => {
  const sampleHtml =
    '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Sunsets don&#39;t get much better than this one over <a href="https://twitter.com/GrandTetonNPS">@GrandTetonNPS</a>.</p>&mdash; US Department of the Interior (@Interior) <a href="https://twitter.com/Interior/status/463440424141459456">May 5, 2014</a></blockquote>';

  it("decodes entities and strips tags from oEmbed HTML", () => {
    expect(htmlToPlainText("Sunsets don&#39;t get much better")).toBe(
      "Sunsets don't get much better",
    );
    expect(htmlToPlainText('a <a href="https://x.com/x">@x</a> b')).toBe("a @x b");
  });

  it("reads the handle from the author URL", () => {
    expect(handleFromAuthorUrl("https://twitter.com/Interior")).toBe("Interior");
    expect(handleFromAuthorUrl("https://x.com/RL_Comm/")).toBe("RL_Comm");
  });

  it("builds a first-party embed from oEmbed JSON", () => {
    const parsed = parseTweetUrl("https://twitter.com/Interior/status/463440424141459456");
    expect(parsed).not.toBeNull();
    if (!parsed) {
      return;
    }

    expect(
      tweetEmbedFromOEmbed(parsed, {
        author_name: "US Department of the Interior",
        author_url: "https://twitter.com/Interior",
        html: sampleHtml,
      }),
    ).toEqual({
      id: "463440424141459456",
      url: "https://x.com/Interior/status/463440424141459456",
      authorName: "US Department of the Interior",
      authorHandle: "Interior",
      authorUrl: "https://x.com/Interior",
      text: "Sunsets don't get much better than this one over @GrandTetonNPS.",
      postedAtLabel: "May 5, 2014",
    });
  });

  it("parses current publish.x.com markup", () => {
    const parsed = parseTweetUrl("https://x.com/Interior/status/463440424141459456");
    expect(parsed).not.toBeNull();
    if (!parsed) {
      return;
    }

    const html =
      '<blockquote class="twitter-tweet" data-dnt="true"><p lang="en" dir="ltr">Sunsets don&#39;t get much better than this one over <a href="https://x.com/GrandTetonNPS">@GrandTetonNPS</a>.</p>&mdash; U.S. Department of the Interior (@Interior) <a href="https://x.com/Interior/status/463440424141459456">May 5, 2014</a></blockquote>';

    expect(
      tweetEmbedFromOEmbed(parsed, {
        author_name: "U.S. Department of the Interior",
        author_url: "https://x.com/Interior",
        html,
      })?.postedAtLabel,
    ).toBe("May 5, 2014");
  });
});
