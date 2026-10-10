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

describe("Who can do what, in plain language (owner decision)", () => {
  const html = page(false);
  const section = html.slice(
    html.indexOf('id="mx-h"'),
    html.indexOf('class="mtab"'),
  );
  const rows = [...section.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => ({
    sentence: text(m[1].replace(/<span class="vd[^>]*>.*$/s, "")).trim(),
    verdict: text(
      m[1].match(/<span class="vd (?:ok|no)">(.*?)<\/span>/s)?.[1] ?? "",
    ).trim(),
    kind: m[1].match(/class="vd (ok|no)"/)?.[1],
  }));

  it("keeps the heading and has the owner's subtitle and top box", () => {
    expect(section).toContain("Who can do what");
    expect(text(section)).toContain(
      "WeeklyView checks every action, so people can only do what their role allows.",
    );
    expect(text(section)).toContain("WeeklyView checks");
    expect(text(section)).toContain(
      "who you are and what you’re allowed to do",
    );
  });

  it("has the five examples, in order, with their verdicts", () => {
    expect(rows.map((r) => [r.sentence, r.verdict, r.kind])).toEqual([
      ["Tharindu (teammate) reads Imali’s daily updates", "Allowed", "ok"],
      [
        "Tharindu (teammate) tries to open Imali’s weekly report",
        "Not allowed: managers only",
        "no",
      ],
      ["Nadia (manager) comments on Imali’s weekly report", "Allowed", "ok"],
      [
        "Nadia (manager) tries to change Imali’s report",
        "Not allowed: comments only",
        "no",
      ],
      [
        "Nadia (manager) tries to approve her own report",
        "Not allowed: no one approves their own",
        "no",
      ],
    ]);
  });

  it("puts each name in bold", () => {
    expect(section.match(/<b>(Tharindu|Nadia)<\/b>/g)).toHaveLength(5);
  });

  it("no longer talks about servers, requests or refusals", () => {
    expect(text(section)).not.toMatch(
      /server|request|refused|Imali J\.|week 38/i,
    );
  });
});

describe("the mock-ups show the app as it is now (owner decision, C10)", () => {
  const html = page(false);
  const between = (from, to) =>
    html.slice(html.indexOf(from), html.indexOf(to, html.indexOf(from)));
  const squares = (row) =>
    [...row.matchAll(/<i(?: class="([a-z]*)")?><\/i>/g)].map(
      (m) => m[1] || "f",
    );

  it("draws the dashboard's Mon–Fri squares in the app's six states, with a legend", () => {
    const monitor = between('id="monwrap"', 'class="mside"');
    const rows = Object.fromEntries(
      [
        ...monitor.matchAll(
          /<tr data-f="[^"]*"><td class="nm">.*?<\/span>([^<]+)<\/td><td>(.*?)<\/td>/g,
        ),
      ].map((m) => [m[1], squares(m[2])]),
    );
    // Ayesha's missing day and Dinesh's week are the red cross, not empty boxes.
    expect(rows["Ayesha C."]).toEqual(["p", "p", "p", "p", "m"]);
    expect(rows["Dinesh K."]).toEqual(["m", "m", "m", "m", "m"]);
    expect(rows["Nadia F."]).toEqual(["p", "p", "p", "p", "p"]);
    // The legend names all six.
    const legend = monitor.slice(monitor.indexOf('class="mleg"'));
    for (const word of [
      "Posted",
      "Missing",
      "Not posted yet today",
      "On leave",
      "Holiday",
      "Later this week",
    ]) {
      expect(legend).toContain(word);
    }
    expect(squares(legend)).toEqual(["p", "m", "d", "l", "h", "f"]);
  });

  it("shows the hero dashboard's Tuesday: today outlined, Dinesh's Monday missing, and a legend", () => {
    const laptop = between('class="lscreen"', 'class="lbase"');
    expect(laptop).toContain('class="lleg"');
    const dinesh = laptop.match(/Dinesh K\.<\/td><td>(.*?)<\/td>/)[1];
    expect(squares(dinesh)).toEqual(["m", "d", "f", "f", "f"]);
    const imali = laptop.match(/Imali J\.<\/td><td>(.*?)<\/td>/)[1];
    expect(squares(imali)).toEqual(["p", "t", "f", "f", "f"]);
  });

  it("uses the app's four coloured metrics, and the app's sidebar", () => {
    for (const part of [
      between('class="lmet"', "<table"),
      between('class="mmet"', 'class="mgrid"'),
    ]) {
      for (const [label, tone] of [
        ["Filed this week", "tn-acc"],
        ["Compliance", "tn-ok"],
        ["Needs correction", "tn-corr"],
        ["Open blockers", "tn-warn"],
      ]) {
        expect(part).toMatch(new RegExp(`${label}</span><b class="${tone}"`));
      }
    }
    const nav = between('class="lnav"', "</ul>");
    for (const item of [
      "Review desk",
      "Team dashboard",
      "People",
      "Projects",
      "This week",
      "My reports",
      "Team updates",
    ]) {
      expect(nav).toContain(item);
    }
  });

  it("draws the day cards as the app does: type marks, a key blocker, a conversation", () => {
    const week = between('id="track"', 'id="report"');
    expect(week.match(/class="day"/g)).toHaveLength(5);
    // The seven type colours' marks, not grey tags.
    expect(week).toContain('class="mk c1"');
    expect(week).toContain('class="mk c2"');
    expect(week).toContain('class="mk c5"');
    expect(week).toContain('class="mk c7"');
    expect(week).not.toContain('class="tt"');
    // The key blocker, with its Key flag; the thread as a conversation with a reply, no grey box.
    expect(week).toMatch(
      /class="d-blk"><span class="lab">Blockers<\/span><p class="bl">.*<em>Key<\/em>/,
    );
    expect(week).toContain('class="d-cmt"');
    expect(week).toContain('class="rp"');
    expect(week).toContain("Manager</span>");
    // Hours on the right of each line; the header carries the weekday, the date and the hours.
    expect(week).toMatch(
      /<b>Mon<span class="dt">14 Sep<\/span><\/b><span class="d-h">7\.5 h<\/span>/,
    );
  });

  it("draws the week report with 'Set status', a framed approval box and the current Draft chip", () => {
    const report = between('id="report"', "</section>");
    expect(report).toContain("Set status");
    expect(html).not.toContain("Set a status");
    expect(report).toContain('class="chip md c-draft">Draft');
    expect(report).toMatch(/class="ucheck"><i><\/i>Ask for approval/);
    expect(report).toContain('class="mk c7"');
  });

  it("draws the single-day card and the ledger's pieces with the same marks and chips", () => {
    const one = between('id="one"', 'id="five"');
    expect(one).toContain('class="mk c1"');
    expect(one).toContain("<em>Key</em>");
    const sides = between('id="sides"', 'id="limits"');
    expect(sides).toContain('class="mk c2"');
    expect(sides).toContain('class="tchip dn">Done');
    expect(sides).toContain('class="chip md c-none">Not started');
    expect(sides).toContain('class="cm"');
  });

  it("puts the privacy statement in the right-hand column of the permissions block", () => {
    const right = between('class="mx-right"', "</section>");
    expect(right).toContain('class="mtab"');
    expect(right.indexOf('class="notrack"')).toBeGreaterThan(
      right.indexOf('class="mtab"'),
    );
    expect(text(right)).toContain(
      "No activity tracking, no screenshots, no idle timers. Only what people choose to write.",
    );
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
