import { sanitizeNewsHtml, sanitizePlainText } from "./sanitize-user-html";

describe("sanitizePlainText", () => {
  it("strips HTML tags from replies and posts", () => {
    expect(sanitizePlainText('hello <script>alert("x")</script> world')).toBe("hello  world");
  });
});

describe("sanitizeNewsHtml", () => {
  it("keeps safe tags and drops scripts", () => {
    const sanitized = sanitizeNewsHtml(
      '<p>Hello</p><script>alert("x")</script><img src="https://cdn.example/a.png" alt="logo">',
    );
    expect(sanitized).toContain("<p>Hello</p>");
    expect(sanitized).toContain('<img src="https://cdn.example/a.png" alt="logo">');
    expect(sanitized).not.toContain("script");
  });

  it("preserves markdown that is not HTML", () => {
    expect(sanitizeNewsHtml("**bold** and [link](https://sarpbc.org)")).toBe(
      "**bold** and [link](https://sarpbc.org)",
    );
  });
});
