import { describe, expect, it } from "vitest";
import { auditPage } from "./page-audit";

const URL_ = "https://rightleftagency.com/services/seo/";

function audit(html: string | null, extra: { headers?: Record<string, string> } = {}) {
  const headers = extra.headers
    ? { get: (name: string) => extra.headers?.[name.toLowerCase()] ?? null }
    : null;
  return auditPage({ url: URL_, status: html === null ? 404 : 200, redirectedTo: null, responseMs: 120, html, headers });
}

describe("auditPage metadata", () => {
  it("passes through the request facts", () => {
    const facts = auditPage({ url: URL_, status: 301, redirectedTo: "https://x.test/", responseMs: 55, html: null, headers: null });
    expect(facts).toMatchObject({ url: URL_, status: 301, redirectedTo: "https://x.test/", responseMs: 55 });
  });

  it("reads and cleans the title", () => {
    expect(audit("<TITLE>\n  Fish &amp; Chips &#8211; &#x41;&nbsp;Shop &quot;best&quot; it&#39;s &#039;ok&#039; &apos;\n</TITLE>").title).toBe(
      "Fish & Chips – A Shop \"best\" it's 'ok' '",
    );
    expect(audit("<title>  </title>").title).toBeNull();
    expect(audit("<p>no title</p>").title).toBeNull();
    expect(audit("<title>&amp;lt;b&amp;gt;</title>").title).toBe("&lt;b&gt;");
  });

  it("reads the meta description whatever the attribute order, quotes or case", () => {
    expect(audit('<meta name="description" content="Hello &amp; welcome">').metaDescription).toBe("Hello & welcome");
    expect(audit("<meta content='Single quoted' NAME='Description'>").metaDescription).toBe("Single quoted");
    expect(audit('<META\n  name="description"\n  content="Multi\n line"\n/>').metaDescription).toBe("Multi line");
    expect(audit('<meta name="description" content="">').metaDescription).toBeNull();
    expect(audit('<meta property="og:description" content="x">').metaDescription).toBeNull();
  });

  it("handles a > inside a quoted attribute value", () => {
    expect(audit('<meta name="description" content="a > b"><h1>x</h1>').metaDescription).toBe("a > b");
  });

  it("counts h1 tags but not h10 or header", () => {
    expect(audit("<h1>A</h1><H1 class='x'>B</H1><h10>no</h10><header></header>").h1Count).toBe(2);
    expect(audit("<h1\nclass=a>x</h1>").h1Count).toBe(1);
  });

  it("ignores fake tags in scripts, styles, noscript, templates and comments", () => {
    const html = `
      <!-- <title>Old</title><h1>old</h1> -->
      <script type="application/ld+json">{"x":"<h1>no</h1><title>Nope</title><a href='/ghost/'>"}</script>
      <style>/* <img src=a> */</style>
      <noscript><img src="n.png"></noscript>
      <template><h1>tpl</h1><meta name="robots" content="noindex"></template>
      <title>Real</title><h1>Real</h1>`;
    const facts = audit(html);
    expect(facts.title).toBe("Real");
    expect(facts.h1Count).toBe(1);
    expect(facts.imagesMissingAlt).toBe(0);
    expect(facts.noindex).toBe(false);
    expect(facts.internalLinks).toEqual([]);
  });
});

describe("auditPage noindex", () => {
  it("detects noindex in robots and googlebot meta tags", () => {
    expect(audit('<meta name="robots" content="noindex, follow">').noindex).toBe(true);
    expect(audit("<meta content='NOINDEX' name='ROBOTS'>").noindex).toBe(true);
    expect(audit('<meta name="googlebot" content="nofollow noindex">').noindex).toBe(true);
    expect(audit('<meta name="robots" content="follow, index, max-snippet:-1">').noindex).toBe(false);
    expect(audit('<meta name="bingbot" content="noindex">').noindex).toBe(false);
  });

  it("detects noindex in the X-Robots-Tag header", () => {
    expect(audit("<p>x</p>", { headers: { "x-robots-tag": "noindex, nofollow" } }).noindex).toBe(true);
    expect(audit("<p>x</p>", { headers: { "x-robots-tag": "all" } }).noindex).toBe(false);
  });
});

describe("auditPage canonical and images", () => {
  it("resolves the canonical against the page URL", () => {
    expect(audit('<link rel="canonical" href="https://rightleftagency.com/services/">').canonical).toBe(
      "https://rightleftagency.com/services/",
    );
    expect(audit("<link href='/other/' REL='canonical'>").canonical).toBe("https://rightleftagency.com/other/");
    expect(audit('<link rel="stylesheet" href="/a.css">').canonical).toBeNull();
  });

  it("counts images with no alt attribute at all", () => {
    const html = '<img src="a.jpg"><img src="b.jpg" alt=""><IMG SRC=c.jpg ALT="x"><img src="d.jpg"/><img alt src="e.jpg">';
    expect(audit(html).imagesMissingAlt).toBe(2);
  });
});

describe("auditPage internal links", () => {
  const links = (html: string) => audit(html).internalLinks;

  it("resolves relative, protocol-relative and absolute links", () => {
    expect(
      links(
        `<a href="/about/">a</a><a href="contact/">b</a><a href="../blog/">c</a><a href="//rightleftagency.com/x/">d</a>
         <a href="https://rightleftagency.com/y/">e</a><a href='?page=2'>f</a>`,
      ),
    ).toEqual([
      "https://rightleftagency.com/about/",
      "https://rightleftagency.com/services/seo/contact/",
      "https://rightleftagency.com/services/blog/",
      "https://rightleftagency.com/x/",
      "https://rightleftagency.com/y/",
      "https://rightleftagency.com/services/seo/?page=2",
    ]);
  });

  it("treats www as the same host and drops other hosts", () => {
    expect(
      links('<a href="https://www.rightleftagency.com/w/">a</a><a href="https://example.com/">b</a><a href="http://rightleftagency.com/h/">c</a>'),
    ).toEqual(["https://www.rightleftagency.com/w/", "http://rightleftagency.com/h/"]);
  });

  it("drops fragments, deduplicates and ignores bare fragment links", () => {
    expect(links('<a href="/a/#top">1</a><a href="/a/#bottom">2</a><a href="/a/">3</a><a href="#x">4</a><a href="">5</a>')).toEqual([
      "https://rightleftagency.com/a/",
    ]);
  });

  it("keeps query strings", () => {
    expect(links('<a href="/shop/?color=red#x">a</a>')).toEqual(["https://rightleftagency.com/shop/?color=red"]);
  });

  it("skips non-http schemes", () => {
    expect(
      links('<a href="mailto:a@b.co">a</a><a href="tel:123">b</a><a href="javascript:void(0)">c</a><a href="data:text/plain,hi">d</a>'),
    ).toEqual([]);
  });

  it("skips file links and WordPress system paths", () => {
    const hrefs = [
      "/a.jpg", "/a.JPEG", "/a.png", "/a.gif", "/a.webp", "/a.svg", "/doc.pdf", "/a.zip", "/a.mp3", "/a.mp4", "/a.webm", "/a.avif",
      "/favicon.ico", "/a.css", "/a.js", "/sitemap.xml", "/wp-admin/", "/wp-login.php?x=1", "/wp-json/wp/v2", "/xmlrpc.php", "/feed",
      "/feed/", "/blog/feed/", "/post/?replytocom=5", "/wp-content/uploads/x", "/uploads/wp-content/x",
    ];
    expect(links(hrefs.map((h) => `<a href="${h}">x</a>`).join(""))).toEqual([]);
  });

  it("keeps pages whose names merely resemble skipped ones", () => {
    expect(links('<a href="/feedback/">a</a><a href="/jsguide/">b</a>')).toEqual([
      "https://rightleftagency.com/feedback/",
      "https://rightleftagency.com/jsguide/",
    ]);
  });

  it("reads attributes in any order, with unquoted values and extra attributes", () => {
    expect(links('<A class="btn" data-x=\'1\' HREF=/unquoted/ target="_blank">x</A><a\n href="/multi/"\n>y</a>')).toEqual([
      "https://rightleftagency.com/unquoted/",
      "https://rightleftagency.com/multi/",
    ]);
  });

  it("ignores anchors without href and links inside comments", () => {
    expect(links('<a name="x">a</a><!-- <a href="/c/">c</a> -->')).toEqual([]);
  });
});

describe("auditPage with no html", () => {
  it("returns empty values", () => {
    expect(audit(null)).toEqual({
      url: URL_,
      status: 404,
      isHtml: false,
      redirectedTo: null,
      responseMs: 120,
      title: null,
      metaDescription: null,
      h1Count: 0,
      noindex: false,
      canonical: null,
      imagesMissingAlt: 0,
      internalLinks: [],
    });
  });

  it("still honours the X-Robots-Tag header", () => {
    expect(audit(null, { headers: { "x-robots-tag": "noindex" } }).noindex).toBe(true);
  });
});
