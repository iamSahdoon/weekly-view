import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// brand_design_strategy.md §6.0: the landing page's green theme, typeface and rules never
// reach the app or the demo. landing.css is scoped, its tokens are prefixed, and the words
// that would give it away are found only in the landing files.

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(SRC, "styles/landing.css"), "utf8");

// Every rule's selectors and every at-rule, with comments removed.
function rules(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  let depth = 0;
  let start = 0;
  const stack = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "{") {
      const prelude = text.slice(start, i).trim();
      stack.push(prelude);
      if (!prelude.startsWith("@media") && !prelude.startsWith("@keyframes")) {
        // a rule inside @keyframes (from, to) is not a selector of the page
        if (!stack.some((p) => p.startsWith("@keyframes") && p !== prelude)) {
          found.push(prelude);
        }
      } else if (prelude.startsWith("@keyframes")) {
        found.push(prelude);
      }
      depth += 1;
      start = i + 1;
    } else if (text[i] === "}") {
      stack.pop();
      depth -= 1;
      start = i + 1;
    } else if (text[i] === ";" && depth >= 0) {
      if (depth === 0) start = i + 1;
    }
  }
  return found;
}

function split(selectorList) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of selectorList) {
    if ("([".includes(ch)) depth += 1;
    if (")]".includes(ch)) depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("landing.css is scoped to .landing", () => {
  const all = rules(css);

  it("has rules at all", () => {
    expect(all.length).toBeGreaterThan(300);
  });

  it("starts every selector at the .landing root (or html.landing-active), nothing global", () => {
    const loose = all
      .filter((p) => !p.startsWith("@"))
      .flatMap(split)
      .filter((s) => !/^(\.landing|html\.landing-active)(?![\w-])/.test(s));
    expect(loose).toEqual([]);
  });

  it("names its keyframes l-*, so none can collide with the app's", () => {
    const names = all
      .filter((p) => p.startsWith("@keyframes"))
      .map((p) => p.replace("@keyframes ", ""));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/^l-/);
  });

  it("defines and reads only --l-* custom properties", () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const names = [...code.matchAll(/--([A-Za-z][\w-]*)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(100);
    expect(names.filter((n) => !n.startsWith("l-"))).toEqual([]);
  });

  it("touches <html> only while the page is mounted", () => {
    const html = all.filter((p) => /^html/.test(p) || /,html/.test(p));
    for (const p of html) expect(p).toMatch(/^html\.landing-active/);
  });
});

describe("nothing of the landing page reaches the app", () => {
  it("the app's stylesheets hold no landing token, font or colour", () => {
    for (const file of ["tokens.css", "base.css", "index.css", "print.css"]) {
      const source = readFileSync(path.join(SRC, "styles", file), "utf8");
      expect(source, file).not.toMatch(
        /--l-|Bricolage|#123F35|#F2B880|\.landing/i,
      );
    }
  });

  it("only the landing files name Bricolage Grotesque or its two colours", () => {
    const hits = walk(SRC)
      .filter((f) => /\.(jsx?|css|html)$/.test(f) && !f.includes("__tests__"))
      .filter((f) => /Bricolage|#123F35|#F2B880/i.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f).replaceAll("\\", "/"))
      .sort();
    expect(hits).toEqual(["pages/LandingPage.jsx", "styles/landing.css"]);
  });

  it("index.html loads the product's three families and not Bricolage", () => {
    const html = readFileSync(path.join(SRC, "../index.html"), "utf8");
    expect(html).toContain("Chivo");
    expect(html).toContain("Instrument+Sans");
    expect(html).not.toMatch(/Bricolage/i);
  });

  it("landing.css is imported by LandingPage and by nothing else", () => {
    const importers = walk(SRC)
      .filter((f) => /\.(jsx?|css)$/.test(f))
      .filter((f) =>
        /import\s+["'][^"']*landing\.css["']|@import[^;]*landing\.css/.test(
          readFileSync(f, "utf8"),
        ),
      )
      .map((f) => path.relative(SRC, f).replaceAll("\\", "/"))
      .filter((f) => !f.includes("__tests__") && f !== "styles/landing.css");
    expect(importers).toEqual(["pages/LandingPage.jsx"]);
  });
});

// A pill is sized by its text: padding and nowrap, never a fixed width or height. (What cannot be
// asserted from the CSS — that the text clears the curved ends in a wide font — was checked in a
// browser with DejaVu Sans, Verdana, DejaVu Sans Mono and Liberation Serif forced onto the page.)
describe("the pills fit their text", () => {
  const body = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (
      new RegExp(`(?:^|\\n)${escaped}\\{([^}]*)\\}`).exec(css)?.[1] ?? null
    );
  };

  it("sizes the pills, chips and tags from their content", () => {
    for (const cls of ["samp", "samp-u", "pill", "chip", "vd", "tt", "fbtn"]) {
      const rule = body(`.landing .${cls}`);
      expect(rule, cls).not.toBeNull();
      expect(rule, cls).not.toMatch(/(?:^|;)(?:height|width:(?!max-content))/);
      expect(rule, cls).toMatch(/padding:/);
    }
  });

  it("keeps the SAMPLE DATA pill's own padding where a column rule would reach it", () => {
    // `.lhead span` styles the ledger's column titles and also matches the pill inside the middle one.
    expect(body(".landing .lhead span")).toMatch(/padding:0 0 18px/);
    const guard = body(".landing .lhead .samp");
    expect(guard).toMatch(/padding:3px 10px/);
    expect(guard).toMatch(/white-space:nowrap/);
    expect(guard).toMatch(/font-size:12px/);
  });

  it('sizes the verdict pills of "Who can do what" from their text, capped at their column', () => {
    const vd = body(".landing .vd");
    expect(vd).toMatch(/width:max-content/);
    expect(vd).toMatch(/max-width:100%/);
    expect(vd).toMatch(/padding:3px 10px/);
    expect(vd).toMatch(/border-radius:999px/);
    // No nowrap: a pill wider than its column wraps inside itself instead of overflowing it.
    expect(vd).not.toMatch(/white-space:nowrap/);
  });

  it("keeps the dashed border and the pill radius", () => {
    const samp = body(".landing .samp");
    expect(samp).toMatch(/border:1px dashed/);
    expect(samp).toMatch(/border-radius:999px/);
    expect(samp).toMatch(/white-space:nowrap/);
  });
});
