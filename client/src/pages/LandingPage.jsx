import { useLayoutEffect, useRef } from "react";
import { DeskSection } from "../components/marketing/DeskSection.jsx";
import { FinalSection } from "../components/marketing/FinalSection.jsx";
import { HeroSection } from "../components/marketing/HeroSection.jsx";
import { DemoSection } from "../components/marketing/DemoSection.jsx";
import { PrivacySection } from "../components/marketing/PrivacySection.jsx";
import { ProblemSection } from "../components/marketing/ProblemSection.jsx";
import { QuestionsSection } from "../components/marketing/QuestionsSection.jsx";
import { WeekSection } from "../components/marketing/WeekSection.jsx";
import { useBootstrapStatus } from "../hooks/useAuthQueries.js";
import { useLandingMotion } from "../hooks/useLandingMotion.js";
import MarketingLayout from "../layouts/MarketingLayout.jsx";
import "../styles/landing.css";

// `/` for a signed-out visitor (brand §6–§7, requirements §13; the look is
// landing-reference/index.html, brand §6.0). It is green, Bricolage Grotesque and
// pills, and none of that may reach the app: landing.css is scoped to `.landing` and
// loads with this chunk only, and the typeface is requested here and removed on leave.

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&display=swap";
const TITLE =
  "WeeklyView: short daily notes, a weekly report that builds itself";
const DESCRIPTION =
  "A web app for teams and their managers. Write a few lines each day, read the whole team's week on one page, and let Friday's report build itself.";

// What the page changes outside its own root, undone when it unmounts: the class that
// turns the area behind the page green, Bricolage Grotesque (the app never fetches it),
// the title and the description.
function useLandingChrome() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-active");

    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = FONT_HREF;
    document.head.appendChild(font);

    const previousTitle = document.title;
    document.title = TITLE;

    let meta = document.head.querySelector('meta[name="description"]');
    const hadMeta = Boolean(meta);
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", DESCRIPTION);

    return () => {
      html.classList.remove("landing-active");
      font.remove();
      document.title = previousTitle;
      if (hadMeta) {
        if (previousDescription === null) meta.removeAttribute("content");
        else meta.setAttribute("content", previousDescription);
      } else {
        meta.remove();
      }
    };
  }, []);
}

export default function LandingPage() {
  // The primary action follows what the instance can do (requirements §13). While the
  // check is pending, and if it fails, the demo is primary and no signup link renders:
  // a visitor never waits on a sleeping API for a button, nor sees one that leads to a
  // closed door (frontend_architecture.md §9.16, FA14).
  const bootstrap = useBootstrapStatus();
  const signupOpen = bootstrap.data?.available === true;
  const rootRef = useRef(null);
  useLandingChrome();
  useLandingMotion(rootRef);

  return (
    <MarketingLayout rootRef={rootRef} signupOpen={signupOpen}>
      <HeroSection signupOpen={signupOpen} />
      <ProblemSection />
      <WeekSection />
      <DeskSection />
      <PrivacySection />
      <DemoSection />
      <QuestionsSection signupOpen={signupOpen} />
      <FinalSection signupOpen={signupOpen} />
    </MarketingLayout>
  );
}
