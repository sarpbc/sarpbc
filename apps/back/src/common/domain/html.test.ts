import { describe, expect, it } from "vitest";
import { sanitizeNewsHtml, sanitizePlainText } from "./html";

function expectFast(run: () => unknown): void {
  const startedAt = performance.now();
  run();
  expect(performance.now() - startedAt).toBeLessThan(200);
}

describe("sanitizePlainText", () => {
  it("strips HTML tags from replies and posts", () => {
    expect(sanitizePlainText('hello <script>alert("x")</script> world')).toBe("hello  world");
  });

  it("drops style blocks, comments and every tag", () => {
    expect(
      sanitizePlainText(
        '<STYLE type="text/css">p{}</STYLE>a<!-- note --><b class="x">b</b><Script src=x>y</sCrIpT>c',
      ),
    ).toBe("abc");
    expect(sanitizePlainText("<<a>b>c")).toBe("b>c");
  });

  it("keeps text that is not a complete tag", () => {
    expect(sanitizePlainText("1 < 2")).toBe("1 < 2");
    expect(sanitizePlainText("3 <> 4")).toBe("3 <> 4");
    expect(sanitizePlainText("a <b")).toBe("a <b");
    expect(sanitizePlainText("x <!-- open")).toBe("x <!-- open");
    expect(sanitizePlainText("<scriptx>y</scriptx>")).toBe("y");
  });

  it("ends script and style blocks at end tags with whitespace, attributes or a slash", () => {
    expect(sanitizePlainText("a<script>evil()</script >b")).toBe("ab");
    expect(sanitizePlainText("a<script>evil()</script\nfoo=bar>b")).toBe("ab");
    expect(sanitizePlainText("a<style>p{}</style/>b")).toBe("ab");
    expect(sanitizePlainText("a<script>x</scripts>y</script>b")).toBe("ab");
  });

  it("removes tags rebuilt from fragments around a removed block", () => {
    expect(sanitizePlainText("<scr<script>x</script>ipt>alert(1)</script>")).toBe("alert(1)");
    expect(sanitizePlainText("<scr<!-- -->ipt>alert(1)")).toBe("alert(1)");
  });

  it("handles pathological input in linear time", () => {
    expectFast(() => sanitizePlainText("<!--".repeat(12_500)));
    expectFast(() => sanitizePlainText("<script>".repeat(6_250)));
    expectFast(() => sanitizePlainText("<script".repeat(7_000)));
    expectFast(() => sanitizePlainText(`<script>${"</script".repeat(6_000)}`));
    expectFast(() => sanitizePlainText("<".repeat(50_000)));
    expectFast(() => sanitizePlainText(`${"<style>".repeat(3_000)}${"<!--".repeat(3_000)}>`));
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

  it("drops script, style and comment blocks with their content", () => {
    expect(
      sanitizeNewsHtml(
        "<p>a</p><!-- hidden --><style>p{color:red}</style><SCRIPT>x()</SCRIPT ><p>b</p>",
      ),
    ).toBe("<p>a</p><p>b</p>");
    expect(sanitizeNewsHtml("<p>a</p><script>x()</script foo><p>b</p>")).toBe("<p>a</p><p>b</p>");
  });

  it("drops disallowed tags left behind by an unclosed block", () => {
    expect(sanitizeNewsHtml("<p>a<script>x()</p>")).toBe("<p>ax()</p>");
    expect(sanitizeNewsHtml("<scr<script>x</script>ipt>alert(1)</script>")).toBe("alert(1)");
  });

  it("handles pathological dangerous blocks in linear time", () => {
    expectFast(() => sanitizeNewsHtml("<!--".repeat(12_500)));
    expectFast(() => sanitizeNewsHtml("<style>".repeat(7_000)));
  });
});
