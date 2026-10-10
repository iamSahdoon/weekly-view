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
