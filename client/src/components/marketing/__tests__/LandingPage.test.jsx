import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarketingLayout from "../../../layouts/MarketingLayout.jsx";
import { DeskSection } from "../DeskSection.jsx";
import { FinalSection } from "../FinalSection.jsx";
import { HeroSection } from "../HeroSection.jsx";
import { LimitsSection } from "../LimitsSection.jsx";
import { ProblemSection } from "../ProblemSection.jsx";
import { QuestionsSection } from "../QuestionsSection.jsx";
import { SidesSection } from "../SidesSection.jsx";
import { WeekSection } from "../WeekSection.jsx";

// The landing page as markup (brand §6–§8, §12; frontend_architecture.md §9.16). The page's
// look is checked by eye against landing-reference/index.html; what is checked here is what
// the brief makes a rule: the call to action follows the bootstrap check, the copy keeps the
// honesty rules, and the components carry no colour of their own.

const page = (signupOpen) =>
  renderToStaticMarkup(
    <MarketingLayout signupOpen={signupOpen}>
      <HeroSection signupOpen={signupOpen} />
      <WeekSection />
      <ProblemSection />
      <DeskSection />
      <SidesSection />
      <LimitsSection />
      <QuestionsSection signupOpen={signupOpen} />
      <FinalSection signupOpen={signupOpen} />
    </MarketingLayout>,
  );
const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

describe("the call to action follows what the instance can do", () => {
  it("promotes the demo, and renders no signup link, until sign-up is known to be open", () => {
    const html = page(false);
    expect(html).toContain("See the live demo");
    expect(html).not.toContain("Create your account");
    expect(hrefs(html)).not.toContain("/signup");
    expect(hrefs(html)).toContain("/demo");
  });

  it("makes Create your account primary when sign-up is open, and keeps the demo beside it", () => {
    const html = page(true);
    expect(html).toContain("Create your account");
    expect(hrefs(html)).toContain("/signup");
    expect(hrefs(html)).toContain("/demo");
    // The nav, the hero and the final band each lead with the signup link.
    expect(html.match(/href="\/signup"/g)).toHaveLength(3);
    // The sign-up answer in the FAQ no longer says it is closed.
    expect(text(html)).not.toContain("signup here is closed");
  });

  it("closed, says so in the FAQ", () => {
    expect(text(page(false))).toContain("signup here is closed");
  });

  it("opens the demo as a plain link, a different page load", () => {
    for (const html of [page(false), page(true)]) {
      expect(html).toMatch(/<a [^>]*href="\/demo"/);
    }
  });
});

describe("the copy keeps the honesty rules", () => {
  const body = text(page(false));
  const bodyOpen = text(page(true));

  it("has no pricing, workspace, booking or customer claims", () => {
    for (const copy of [body, bodyOpen]) {
      expect(copy).not.toMatch(
        /pricing|price|credit card|workspace|book a demo/i,
      );
      expect(copy).not.toMatch(/trusted by|testimonial|customers love/i);
      expect(copy).not.toContain("!");
    }
  });

  it("says it is new, with no customers, and labels the sample data", () => {
    expect(body).toContain("WeeklyView is new");
    expect(body).toContain("no customers to quote yet");
    expect(page(false)).toContain("SAMPLE DATA");
  });

  it("spells the statuses exactly", () => {
    for (const status of [
      "Draft",
      "Submitted",
      "Needs correction",
      "Approved",
      "Not started",
    ]) {
      expect(body).toContain(status);
    }
  });
});

describe("the sections", () => {
  it("every id the page's motion looks for is present, once", () => {
    const html = page(false);
    const ids = [
      "comp",
      "stage",
      "typed",
      "bf",
      "post",
      "fly",
      "trail",
      "ln",
      "halo",
      "m-blk",
      "mc-blk",
      "r-imali",
      "r-hrs",
      "m-hrs",
      "replay",
      "week",
      "track",
      "report",
      "wk-stage",
      "dayfill",
      "dr-ind",
      "dayrail",
      "prob",
      "pile",
      "one",
      "five",
      "desk",
      "monwrap",
      "mt",
      "fcount",
      "sides",
      "srv",
      "srv-node",
      "srv-dot",
      "faq",
      "main",
    ];
    for (const id of ids) {
      expect(html.match(new RegExp(`id="${id}"`, "g")), id).toHaveLength(1);
    }
  });

  it("splits the two headings into word masks and keeps the words in reading order", () => {
    const html = page(false);
    expect(html.match(/class="wi"/g).length).toBe(
      "One update. Both sides of the desk.".split(" ").length +
        "Write one day. Then read it from the other side.".split(" ").length,
    );
    expect(text(html)).toContain("One update. Both sides of the desk.");
  });
});

describe("the components carry no colour of their own", () => {
  const files = [
    ...readdirSync(new URL("..", import.meta.url))
      .filter((f) => f.endsWith(".jsx"))
      .map((f) => new URL(`../${f}`, import.meta.url)),
    new URL("../../../layouts/MarketingLayout.jsx", import.meta.url),
    new URL("../../../pages/LandingPage.jsx", import.meta.url),
  ];
  it("has no hex value in any marketing component, only the page's own var(--l-*)", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8").replace(/href="#[a-z]*"/g, "");
      expect(source, file.pathname).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source, file.pathname).not.toMatch(/var\(--(?!l-)/);
    }
  });
});
