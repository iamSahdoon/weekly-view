import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import MarketingLayout from "../../../layouts/MarketingLayout.jsx";
import { DemoSection } from "../DemoSection.jsx";
import { DeskSection } from "../DeskSection.jsx";
import { FinalSection } from "../FinalSection.jsx";
import { HeroSection } from "../HeroSection.jsx";
import { PrivacySection } from "../PrivacySection.jsx";
import { ProblemSection } from "../ProblemSection.jsx";
import { QuestionsSection } from "../QuestionsSection.jsx";
import { DESK_STEPS, WEEK_STEPS } from "../storySteps.js";
import { WeekSection } from "../WeekSection.jsx";

// The landing page as markup (brand §6–§8, §12; frontend_architecture.md §9.16). The page's
// look is checked by eye against landing-reference/index.html; what is checked here is what
// the brief makes a rule: the call to action follows the bootstrap check, the copy keeps the
// honesty rules, and the components carry no colour of their own.

// Sign in and sign up are React Router links (round six), so the page renders in a router.
const page = (signupOpen) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <MarketingLayout signupOpen={signupOpen}>
        <HeroSection signupOpen={signupOpen} />
        <ProblemSection />
        <WeekSection />
        <DeskSection />
        <PrivacySection />
        <DemoSection />
        <QuestionsSection signupOpen={signupOpen} />
        <FinalSection signupOpen={signupOpen} />
      </MarketingLayout>
    </MemoryRouter>,
  );
const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
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

// Owner decision (auth pages, 2026-10-17; brand §6.0 rule 13): once the check says sign-up
// is closed, the hero offers people already on a team a way to sign in. Pending or failed,
// it stays as before: the demo only.
describe("the hero's sign-in line", () => {
  const hero = (props) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <HeroSection {...props} />
      </MemoryRouter>,
    );

  it("closed: 'Already on a team? Sign in', linking to /signin, under the demo", () => {
    const html = hero({ signupOpen: false, signupClosed: true });
    expect(text(html)).toContain("Already on a team? Sign in");
    expect(html).toMatch(
      /<p class="hsign">[^]*<a href="\/signin"[^>]*>Sign in<\/a>/,
    );
    expect(html.indexOf('href="/demo"')).toBeLessThan(html.indexOf("hsign"));
    expect(hrefs(html)).not.toContain("/signup");
  });

  it("pending or failed: no sign-in line, no sign-up link", () => {
    const html = hero({ signupOpen: false });
    expect(html).not.toContain("hsign");
    expect(hrefs(html)).toEqual(["/demo", "#week", "#desk"]);
  });

  it("open: Create your account first, the demo beside it, and nothing else under them", () => {
    const html = hero({ signupOpen: true, signupClosed: false });
    expect(html).not.toContain("hsign");
    expect(html).not.toContain('class="micro"');
    expect(text(html)).not.toContain("Set up your first week in minutes");
    expect(hrefs(html).slice(0, 2)).toEqual(["/signup", "/demo"]);
  });

  it("says the demo needs no account, in fewer words", () => {
    const words = text(hero({ signupOpen: false, signupClosed: true }));
    expect(words).toContain("No account needed. Nothing is saved.");
    expect(words).not.toContain("Everything works, nothing is saved.");
  });
});

// Owner decision (auth pages round six, brand §6.0 rule 14): sign in and sign up open
// client-side in a view transition; the demo stays a different page load.
describe("the ways into the app", () => {
  const html = page(true);
  const links = (href) =>
    [...html.matchAll(new RegExp(`<a [^>]*href="${href}"[^>]*>`, "g"))].map(
      (m) => m[0],
    );

  it("opens sign in and sign up client-side (React Router links)", () => {
    for (const href of ["/signin", "/signup"]) {
      expect(links(href).length, href).toBeGreaterThan(0);
      for (const a of links(href))
        expect(a, href).toContain('data-discover="true"');
    }
  });

  it("keeps every demo link a plain page load", () => {
    expect(links("/demo").length).toBeGreaterThan(0);
    for (const a of links("/demo")) expect(a).not.toContain("data-discover");
  });

  it("routes them through the view-transition link, which loads the screen first", () => {
    const source = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
    expect(source("../AppLink.jsx")).toMatch(
      /href === "\/signin" \|\| href === "\/signup"[^]*<TransitionLink/,
    );
    const link = source("../../../routes/TransitionLink.jsx");
    expect(link).toContain("viewTransition");
    expect(link).toMatch(
      /\.preload\(\)[^]*navigate\(to, \{ viewTransition: true \}\)/,
    );
    expect(link).toMatch(/event\.metaKey/);
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
      "prob",
      "one",
      "week",
      "track",
      "report",
      "wk-stage",
      "wk-caps",
      "wk-guide",
      "dayfill",
      "dr-ind",
      "dayrail",
      "desk",
      "monwrap",
      "mt",
      "fcount",
      "dk-caps",
      "dk-guide",
      "private",
      "demo",
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
      "Short daily notes. A weekly report that builds itself.".split(" ")
        .length + "Write the day. Read the week.".split(" ").length,
    );
    expect(text(html)).toContain(
      "Short daily notes. A weekly report that builds itself.",
    );
  });
});

describe("the page tells the story in order, in plain language (owner decision, landing revamp)", () => {
  const html = page(false);
  const at = (id) => html.indexOf(`id="${id}"`);
  const section = (id) =>
    html.slice(at(id), html.indexOf("</section>", at(id)));

  it("runs hero → before/after → the week → the dashboard → privacy → demo → FAQ → final", () => {
    const order = [
      "top",
      "prob",
      "week",
      "desk",
      "private",
      "demo",
      "faq",
      "fin-h",
    ].map(at);
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });

  it("says in the hero what it is and who it is for", () => {
    const hero = text(section("top"));
    expect(hero).toContain("A web app for daily updates and weekly reports");
    expect(hero).toContain("For teams and their managers.");
  });

  it("shows the problem as a before and an after", () => {
    const prob = text(section("prob"));
    expect(prob).toContain("In most teams…");
    expect(prob).toContain("With WeeklyView…");
    expect(prob).toContain(
      "Updates are scattered across chat, meetings and docs.",
    );
    expect(prob).toContain("Friday’s report builds itself from the five days.");
  });

  it("drops the copy the owner found unclear", () => {
    const all = text(html);
    for (const gone of [
      "Right now the week gets written five times",
      "The limits are in the product",
      "good manners",
      "Written for the writer",
    ]) {
      expect(all).not.toContain(gone);
    }
  });

  it("keeps every caption short and friendly", () => {
    for (const step of [...WEEK_STEPS, ...DESK_STEPS]) {
      expect(step.text.split(/\s+/).length, step.text).toBeLessThanOrEqual(15);
      expect(step.text).not.toContain("!");
    }
  });

  it("walks the team member's week in the order the owner asked for", () => {
    expect(WEEK_STEPS.map((s) => s.kicker)).toEqual([
      "Monday",
      "A work line",
      "Hours",
      "A blocker",
      "Team comments",
      "Wednesday to Friday",
      "Friday’s report",
      "Submit",
    ]);
  });

  it("switches the dashboard's Show buttons in order: Everyone, Needs correction, Not started, Has blocker", () => {
    expect(DESK_STEPS.slice(0, 6).map((s) => s.kicker)).toEqual([
      "Filed this week",
      "Compliance",
      "Needs correction",
      "Open blockers",
      "The squares",
      "The legend",
    ]);
    expect(DESK_STEPS.slice(6).map((s) => s.f)).toEqual([
      "all",
      "corr",
      "none",
      "blk",
    ]);
    expect(DESK_STEPS[1].text).toContain("expected reports are in");
  });

  it("points every step at something on the mock-up, once", () => {
    for (const [id, steps] of [
      ["week", WEEK_STEPS],
      ["desk", DESK_STEPS],
    ]) {
      const part = section(id);
      steps.forEach((step, n) => {
        expect(
          part.match(new RegExp(`data-t="${n}"`, "g")),
          `${id} ${n}`,
        ).toHaveLength(1);
      });
      expect(part).not.toContain(`data-t="${steps.length}"`);
    }
    // the squares' ring spans the column, down to the last row
    expect(section("desk").match(/data-t-end="4"/g)).toHaveLength(1);
  });

  it("keeps each caption's real words in the DOM, the typed copy hidden from screen readers", () => {
    for (const [id, steps] of [
      ["week", WEEK_STEPS],
      ["desk", DESK_STEPS],
    ]) {
      const part = section(id);
      const caps = part.slice(part.indexOf('class="caps"'));
      for (const step of steps) {
        // in the pinned column, and again in the stacked notes
        expect(caps).toContain(
          `<span class="cap-full">${step.text.replace(/'/g, "&#x27;")}</span>`,
        );
        expect(text(part).split(step.text).length - 1, step.text).toBe(2);
      }
      const typed = [...part.matchAll(/<span class="cap-ty"([^>]*)><\/span>/g)];
      expect(typed).toHaveLength(steps.length);
      for (const t of typed) expect(t[1]).toContain('aria-hidden="true"');
    }
  });

  it("makes the comment on Tuesday a teammate's, on a day opened to the team", () => {
    const week = section("week");
    const tue = week.slice(week.indexOf("Tue<span"), week.indexOf("Wed<span"));
    expect(tue).toContain('class="sw on"');
    expect(tue).toContain("Tharindu S.");
    expect(tue).not.toContain('class="rc"');
  });
});

describe("Private where it matters (owner decision, landing revamp)", () => {
  const html = page(false);
  const part = html.slice(
    html.indexOf('id="private"'),
    html.indexOf("</section>", html.indexOf('id="private"')),
  );

  it("has the three plain benefits and the privacy promise", () => {
    const words = text(part);
    expect(words).toContain("Private where it matters.");
    for (const claim of [
      "Your weekly report goes to managers only.",
      "Managers comment. Your words stay yours.",
      "Nobody approves their own work.",
    ]) {
      expect(words).toContain(claim);
    }
    expect(words).toContain(
      "No activity tracking, no screenshots, no idle timers. Only what people choose to write.",
    );
  });

  it("keeps the rules table behind a closed 'See exactly who sees what'", () => {
    const details = part.slice(part.indexOf('<details class="whosees">'));
    expect(part).toContain('<details class="whosees">');
    expect(text(details)).toContain("See exactly who sees what");
    expect(details).toContain('<table class="who"');
    expect(details).toContain("Only if it&#x27;s opened to the team");
    expect(details).toContain("Yes, except their own");
  });

  it("no longer has the server-check animation", () => {
    expect(html).not.toContain('id="srv"');
    expect(html).not.toContain('class="vd');
  });
});

describe("the demo invitation", () => {
  const html = page(false);
  const part = html.slice(
    html.indexOf('id="demo"'),
    html.indexOf("</section>", html.indexOf('id="demo"')),
  );
  it("offers the three roles, each a plain link to the demo", () => {
    expect(part.match(/<a class="role" href="\/demo">/g)).toHaveLength(3);
    for (const role of ["Team member", "Manager", "Admin"])
      expect(text(part)).toContain(role);
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
          /<tr data-f="[^"]*"><td class="nm">.*?<\/span>([^<]+)(?:<span class="chip c-corr nm-blk">[^<]*<\/span>)?<\/td><td>(.*?)<\/td>/g,
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

  it("keeps each blocker on narrow screens: a chip under the name that says the same as the Blocker column", () => {
    const monitor = between('id="monwrap"', 'class="mside"');
    const rows = [...monitor.matchAll(/<tr data-f="[^"]*">(.*?)<\/tr>/g)].map(
      (m) => m[1],
    );
    expect(rows).toHaveLength(8);
    let withBlocker = 0;
    for (const row of rows) {
      const column = row.match(/<span class="chip c-corr">([^<]+)<\/span>/);
      const chip = row.match(
        /<span class="chip c-corr nm-blk">\s*Blocker · ([^<]+?)\s*<\/span>/,
      );
      // The chip is there exactly when the column has a day, and names the same day.
      expect(chip?.[1]).toEqual(column?.[1]);
      if (chip) withBlocker += 1;
    }
    expect(withBlocker).toBe(3);
  });

  it("shows the squares' legend only where the squares are (owner decision, landing phone fix)", () => {
    const css = readFileSync(
      new URL("../../../styles/landing.css", import.meta.url),
      "utf8",
    );
    // Every block of rules: the media queries, and what is left of the sheet without them.
    const blocks = [];
    let rest = css;
    for (
      let at = rest.indexOf("@media");
      at !== -1;
      at = rest.indexOf("@media")
    ) {
      const open = rest.indexOf("{", at);
      let depth = 1;
      let end = open + 1;
      while (depth > 0) {
        depth += rest[end] === "{" ? 1 : rest[end] === "}" ? -1 : 0;
        end += 1;
      }
      blocks.push(rest.slice(open + 1, end - 1));
      rest = rest.slice(0, at) + rest.slice(end);
    }
    blocks.push(rest);
    const hides = (block) =>
      [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter(([, , declarations]) => /display:\s*none/.test(declarations))
        .map(([, selectors]) => selectors);
    for (const [table, legend] of [
      ["mtbl", "mleg"],
      ["ltbl", "lleg"],
    ]) {
      const updatesColumn = new RegExp(
        `\\.${table}[^,{]*(?::nth-child\\(2\\)|\\.c-u)`,
      );
      for (const block of blocks) {
        const selectors = hides(block);
        if (selectors.some((s) => updatesColumn.test(s))) {
          expect(selectors.some((s) => s.includes(`.${legend}`))).toBe(true);
        }
      }
    }
    // As built: the dashboard keeps Updates at every width, and its Blocker column is the
    // one that gives way, to a chip under the name.
    const narrow = blocks.find((b) => b.includes(".nm-blk{display:flex"));
    expect(narrow).toBeTruthy();
    expect(hides(narrow).join(" ")).toContain(".mtbl td:nth-child(5)");
    expect(hides(narrow).join(" ")).not.toContain("nth-child(2)");
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
      /class="d-blk"[^>]*><span class="lab">Blockers<\/span><p class="bl">.*<em>Key<\/em>/,
    );
    expect(week).toContain('class="d-cmt"');
    expect(week).toContain('class="rp"');
    // Hours on the right of each line; the header carries the weekday, the date and the hours.
    expect(week).toMatch(
      /<b>Mon<span class="dt">14 Sep<\/span><\/b><span class="d-h"[^>]*>7\.5 h<\/span>/,
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

  it("draws the single-day card with the same marks and chips", () => {
    const one = between('id="one"', "</article>");
    expect(one).toContain('class="mk c1"');
    expect(one).toContain("<em>Key</em>");
    expect(between('id="desk"', "</section>")).toContain(
      'class="chip md c-none">Not started',
    );
  });
});

describe("the components carry no colour of their own", () => {
  const files = [
    ...readdirSync(new URL("..", import.meta.url))
      .filter((f) => /\.jsx?$/.test(f))
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

// The footer (owner decision, landing polish; brand §6.0 rule 11).
describe("the footer", () => {
  const html = page(false);
  const foot = html.slice(html.indexOf("<footer"));

  it("links to the four sections and the two ways in", () => {
    expect(hrefs(foot)).toEqual([
      "#week",
      "#desk",
      "#private",
      "#faq",
      "/demo",
      "/signin",
    ]);
    for (const label of [
      "Product",
      "Get started",
      "The week",
      "For managers",
      "Live demo",
      "Sign in",
    ])
      expect(text(foot)).toContain(label);
  });

  it("draws one week of squares, each one said in words", () => {
    expect(foot.match(/class="fw-day"/g)).toHaveLength(5);
    for (const said of [
      "Monday: posted",
      "Wednesday: missing",
      "Friday: holiday",
    ])
      expect(text(foot)).toContain(said);
    expect(text(foot)).toMatch(/Posted\s*Missing\s*Holiday/);
  });

  it("keeps the promise and the sample-team note in the bottom row", () => {
    expect(text(foot)).toContain("No activity tracking. Ever.");
    expect(text(foot)).toContain(
      "Every name on this page belongs to a fictional sample team.",
    );
    expect(text(foot)).toMatch(/© \d{4} WeeklyView/);
  });

  it("hides the big wordmark from assistive technology", () => {
    expect(foot).toMatch(/class="ft-mark" data-wordmark="" aria-hidden="true"/);
  });
});

describe("the section headings enter as a group", () => {
  it("marks each section heading for its entrance", () => {
    const html = page(false);
    for (const id of ["prob-h", "week-h", "desk-h", "pv-h", "demo-h", "q-h"])
      expect(html, id).toMatch(
        new RegExp(
          `<h2[^>]*id="${id}"[^>]*data-head=""|<h2[^>]*data-head=""[^>]*id="${id}"`,
        ),
      );
  });
});
